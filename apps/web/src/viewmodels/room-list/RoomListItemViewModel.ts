/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    RoomNotifState,
    type RoomListItemViewSnapshot,
    type RoomListItemViewActions,
    type UserStatus,
} from "@element-hq/web-shared-components";
import {
    ClientEvent,
    EventType,
    KnownMembership,
    MatrixEventEvent,
    RoomEvent,
    RoomMemberEvent,
} from "matrix-js-sdk/src/matrix";
import { CallType } from "matrix-js-sdk/src/webrtc/call";
import { logger } from "matrix-js-sdk/src/logger";

import type { Room, MatrixClient, MatrixEvent, RoomMember, ClientEventHandlerMap } from "matrix-js-sdk/src/matrix";
import type { RoomNotificationState } from "../../stores/notifications/RoomNotificationState";
import { RoomNotificationStateStore } from "../../stores/notifications/RoomNotificationStateStore";
import { NotificationStateEvents } from "../../stores/notifications/NotificationState";
import { MessagePreviewStore } from "../../stores/message-preview";
import { DefaultTagID } from "../../stores/room-list-v3/skip-list/tag";
import DMRoomMap from "../../utils/DMRoomMap";
import SettingsStore from "../../settings/SettingsStore";
import { NotificationLevel } from "../../stores/notifications/NotificationLevel";
import { hasAccessToNotificationMenu, hasAccessToOptionsMenu } from "./utils";
import { EchoChamber } from "../../stores/local-echo/EchoChamber";
import { RoomNotifState as ElementRoomNotifState } from "../../RoomNotifs";
import { shouldShowComponent } from "../../customisations/helpers/UIComponents";
import { UIComponent } from "../../settings/UIFeature";
import { CallStore, CallStoreEvent } from "../../stores/CallStore";
import { clearRoomNotification, getMarkedUnreadState, setMarkedUnreadState } from "../../utils/notifications";
import { tagRoom } from "../../utils/room/tagRoom";
import { keepIfSame } from "../../utils/keepIfSame";
import dispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import type { ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { type Call, CallEvent } from "../../models/Call";
import { fetchUserStatus } from "../../utils/userStatus";
import { countUnreadMessages } from "../../telement/room-list/countUnreadMessages";
import { type MessagePreviewParts, splitMessagePreview } from "../../telement/room-list/splitMessagePreview";
import { formatChatListTimestamp, getChatListTimestampExpiry } from "../../telement/room-list/formatChatListTimestamp";
import { getLastTimestamp } from "../../stores/room-list-v3/skip-list/sorters/utils/getLastTimestamp";
import { usersTypingApartFromMeAndIgnored, whoIsTypingString } from "../../WhoIsTyping";

interface RoomItemProps {
    room: Room;
    client: MatrixClient;
}

/**
 * View model for an individual room list item.
 * Manages per-room subscriptions and updates only when this specific room's data changes.
 * Implements RoomListItemViewActions to provide interaction callbacks.
 */
export class RoomListItemViewModel
    extends BaseViewModel<RoomListItemViewSnapshot, RoomItemProps>
    implements RoomListItemViewActions
{
    private notifState: RoomNotificationState;
    /**
     * Track the current call for this room to manager listeners
     */
    private currentCall: Call | null = null;

    /**
     * The user ID of the other user if this room is a DM, used to show their user status.
     */
    private readonly dmUserId?: string;

    public constructor(props: RoomItemProps) {
        // Get notification state first so we can generate a complete initial snapshot
        const notifState = RoomNotificationStateStore.instance.getRoomState(props.room);
        const initialItem = RoomListItemViewModel.generateItemSync(props.room, props.client, notifState);
        super(props, { ...initialItem, typing: RoomListItemViewModel.getTyping(props.room) });

        this.notifState = notifState;

        // Subscribe to notification state changes for this room
        this.disposables.trackListener(this.notifState, NotificationStateEvents.Update, this.onNotificationChanged);

        // Subscribe to message preview changes for this specific room
        this.disposables.trackListener(
            MessagePreviewStore.instance,
            MessagePreviewStore.getPreviewChangedEventName(props.room),
            this.onMessagePreviewChanged,
        );

        // Subscribe to call state changes
        this.disposables.trackListener(CallStore.instance, CallStoreEvent.Call, this.onCallStateChanged);
        // If there is an active call for this room, listen to participant changes
        this.listenToCallParticipants();

        // Subscribe to room-specific events
        this.disposables.trackListener(props.room, RoomEvent.Name, this.onRoomChanged);
        this.disposables.trackListener(props.room, RoomEvent.Tags, this.onRoomChanged);

        // The unread messages of a muted room are counted from its timeline and its mentions follow the user's push
        // rules, which both change without a notification state update
        this.disposables.trackListener(props.room, RoomEvent.Timeline, this.onMutedRoomChanged);
        this.disposables.trackListener(props.room, RoomEvent.Redaction, this.onMutedRoomChanged);
        this.disposables.trackListener(props.room, RoomEvent.Receipt, this.onMutedRoomChanged);
        this.disposables.trackListener(props.room, RoomEvent.AccountData, this.onMutedRoomChanged);
        // An event can move the room's last activity without changing its preview or notifications
        this.disposables.trackListener(props.room, RoomEvent.Timeline, this.onTimeline as (...args: unknown[]) => void);
        props.client.on(MatrixEventEvent.Decrypted, this.onEventDecrypted);
        props.client.on(ClientEvent.AccountData, this.onClientAccountData);
        props.client.on(RoomMemberEvent.Typing, this.onTyping);
        this.disposables.track(() => {
            props.client.off(MatrixEventEvent.Decrypted, this.onEventDecrypted);
            props.client.off(ClientEvent.AccountData, this.onClientAccountData);
            props.client.off(RoomMemberEvent.Typing, this.onTyping);
        });

        // Load message preview asynchronously (sync data is already complete)
        void this.loadAndSetMessagePreview();

        // If this room is a DM, show the MSC4426 user status of the other user
        this.dmUserId = DMRoomMap.shared().getUserIdForRoomId(props.room.roomId) ?? undefined;
        if (this.dmUserId) {
            props.client.on(ClientEvent.UserProfileUpdate, this.onUserProfileUpdate);
            this.disposables.track(() => {
                props.client.off(ClientEvent.UserProfileUpdate, this.onUserProfileUpdate);
            });

            this.updateUserStatus();
        }
    }

    public dispose(): void {
        super.dispose();
        this.currentCall?.off(CallEvent.Participants, this.onCallParticipantsChanged);
        this.currentCall?.off(CallEvent.CallTypeChanged, this.onCallTypeChanged);
    }

    private onNotificationChanged = (): void => {
        this.updateItem();
    };

    private onMessagePreviewChanged = (): void => {
        void this.loadAndSetMessagePreview();
    };

    /**
     * Handler for call participant changes. Only updates the item if the call moves between having participants and not having participants, to avoid unnecessary updates.
     * @param participants The current call participants
     */
    private onCallParticipantsChanged = (participants: Map<RoomMember, Set<string>>): void => {
        const hasCall = Boolean(this.snapshot.current.notification.callType);
        // There is already an active call, we don't need to update the item
        if (hasCall && participants.size > 0) return;

        this.updateItem();
    };

    /**
     * Handler for call type changes. Only updates the item if the call type is actually present in the snapshot.
     */
    private onCallTypeChanged = (): void => {
        if (this.snapshot.current.notification.callType !== undefined) this.updateItem();
    };

    /**
     * Listen to participant changes for the current call in this room (if any) to trigger updates when participants join/leave the call.
     */
    private listenToCallParticipants(): void {
        const call = CallStore.instance.getCall(this.props.room.roomId);

        // Remove listeners from previous call (if any) and add to new call to track changes
        if (call !== this.currentCall) {
            this.currentCall?.off(CallEvent.Participants, this.onCallParticipantsChanged);
            this.currentCall?.off(CallEvent.CallTypeChanged, this.onCallTypeChanged);
            call?.on(CallEvent.Participants, this.onCallParticipantsChanged);
            call?.on(CallEvent.CallTypeChanged, this.onCallTypeChanged);
        }
        this.currentCall = call;
    }

    private onCallStateChanged = (): void => {
        // Only update if call state for this room actually changed
        const call = CallStore.instance.getCall(this.props.room.roomId);

        this.listenToCallParticipants();

        const currentCallType = this.snapshot.current.notification.callType;
        const newCallType =
            call && call.participants.size > 0 ? (call.callType === CallType.Voice ? "voice" : "video") : undefined;

        if (currentCallType !== newCallType) {
            this.updateItem();
        }
    };

    private onRoomChanged = (): void => {
        this.updateItem();
    };

    private onMutedRoomChanged = (): void => {
        if (this.snapshot.current.notification.muted) this.updateItem();
    };

    private onEventDecrypted = (event: MatrixEvent): void => {
        if (event.getRoomId() === this.props.room.roomId) this.onMutedRoomChanged();
    };

    private onClientAccountData = (event: MatrixEvent): void => {
        if (event.getType() === EventType.PushRules) this.onMutedRoomChanged();
    };

    /**
     * Like the room list store, which sorts by the same time, only a new event in the room's main timeline moves it:
     * not older events loaded by scrolling back, nor thread replies.
     */
    private onTimeline: ClientEventHandlerMap[RoomEvent.Timeline] = (event, room, toStartOfTimeline, removed, data) => {
        if (data.liveEvent && data.timeline.getTimelineSet() === this.props.room.getUnfilteredTimelineSet()) {
            this.refreshTimestamp();
        }
    };

    private onTyping = (event: MatrixEvent, member: RoomMember): void => {
        if (member.roomId === this.props.room.roomId) {
            this.snapshot.merge({ typing: RoomListItemViewModel.getTyping(this.props.room) });
        }
    };

    /**
     * When the time shown for this room changes before the next midnight, if it does. See
     * {@link getChatListTimestampExpiry}.
     */
    public get timestampExpiry(): number | undefined {
        const timestamp = getLastTimestamp(this.props.room, this.props.client.getSafeUserId());
        return timestamp ? getChatListTimestampExpiry(timestamp, Date.now()) : undefined;
    }

    /**
     * Format the time shown for this room again, which changes as days pass without the room changing.
     */
    public refreshTimestamp = (): void => {
        this.snapshot.merge(RoomListItemViewModel.getTimestamp(this.props.room, this.props.client));
    };

    /**
     * Update the item snapshot with current sync data.
     * Preserves the message preview and who is typing, which are managed separately.
     */
    private updateItem(): void {
        const newItem = RoomListItemViewModel.generateItemSync(this.props.room, this.props.client, this.notifState);
        this.snapshot.merge({
            ...newItem,
            notification: keepIfSame(this.snapshot.current.notification, newItem.notification),
            // Preserve message preview - it's managed separately by loadAndSetMessagePreview
            messagePreview: this.snapshot.current.messagePreview,
            messagePreviewSender: this.snapshot.current.messagePreviewSender,
            // Only a typing event changes it, and finding it goes through every member of the room
            typing: this.snapshot.current.typing,
        });
    }

    private getMessagePreviewTag(): string {
        const isDm = Boolean(DMRoomMap.shared().getUserIdForRoomId(this.props.room.roomId));
        return isDm ? DefaultTagID.DM : DefaultTagID.Untagged;
    }

    /**
     * Load the message preview for this room, with its sender apart. Returns undefined if it couldn't be loaded.
     */
    private async loadMessagePreview(): Promise<MessagePreviewParts | undefined> {
        const messagePreviewTag = this.getMessagePreviewTag();
        const preview = await MessagePreviewStore.instance.getPreviewForRoom(this.props.room, messagePreviewTag);
        return preview ? splitMessagePreview(preview, messagePreviewTag) : undefined;
    }

    /**
     * Load and set the message preview if it differs from current, with the time of the room's last activity, which
     * a new message changes.
     */
    private async loadAndSetMessagePreview(): Promise<void> {
        const preview = await this.loadMessagePreview();
        if (this.disposables.isDisposed) return;
        this.snapshot.merge({
            messagePreview: preview?.text,
            messagePreviewSender: preview?.sender,
            ...RoomListItemViewModel.getTimestamp(this.props.room, this.props.client),
        });
    }

    /**
     * Who is typing in the room, apart from the user and ignored users, or undefined if nobody is.
     */
    private static getTyping(room: Room): string | undefined {
        return whoIsTypingString(usersTypingApartFromMeAndIgnored(room), 2) || undefined;
    }

    /**
     * The time of the room's last activity, as the recency sort sees it, formatted for the room list.
     */
    private static getTimestamp(
        room: Room,
        client: MatrixClient,
    ): Pick<RoomListItemViewSnapshot, "timestamp" | "timestampFull" | "timestampIso"> {
        const lastTimestamp = getLastTimestamp(room, client.getSafeUserId());
        if (!lastTimestamp) return { timestamp: undefined, timestampFull: undefined, timestampIso: undefined };

        const { label, title, dateTime } = formatChatListTimestamp(
            lastTimestamp,
            Date.now(),
            SettingsStore.getValue("showTwelveHourTimestamps"),
        );
        return { timestamp: label, timestampFull: title, timestampIso: dateTime };
    }

    /**
     * Handler for profile updates received via sync, to keep the DM user's status up to date.
     */
    private onUserProfileUpdate: ClientEventHandlerMap[ClientEvent.UserProfileUpdate] = async (userId) => {
        if (userId !== this.dmUserId || !SettingsStore.getValue("feature_user_status")) return;
        this.snapshot.merge({
            userStatus: await fetchUserStatus(this.props.client, this.dmUserId),
        });
    };

    /**
     * Fetch and set the user status of the DM user, if the feature is enabled.
     */
    private updateUserStatus(): void {
        (async () => {
            let userStatus: UserStatus | undefined;
            if (this.dmUserId && SettingsStore.getValue("feature_user_status")) {
                userStatus = await fetchUserStatus(this.props.client, this.dmUserId);
            }
            if (this.disposables.isDisposed) return;
            this.snapshot.merge({ userStatus });
        })().catch((ex) => {
            logger.warn(`Failed to update userStatus for ${this.dmUserId}`, ex);
        });
    }

    /**
     * Generate a complete RoomListItem with all synchronous data.
     * Message preview is loaded separately to avoid blocking initial render.
     */
    private static generateItemSync(
        room: Room,
        client: MatrixClient,
        notifState: RoomNotificationState,
    ): RoomListItemViewSnapshot {
        // Get room tags for menu state
        const roomTags = room.tags;
        const isDm = Boolean(DMRoomMap.shared().getUserIdForRoomId(room.roomId));

        // Message preview will be loaded asynchronously and updated separately
        const messagePreview = undefined;

        const isFavourite = Boolean(roomTags[DefaultTagID.Favourite]);
        const isLowPriority = Boolean(roomTags[DefaultTagID.LowPriority]);
        const isArchived = Boolean(roomTags[DefaultTagID.Archived]);

        // More options menu state
        const showMoreOptionsMenu = hasAccessToOptionsMenu(room);
        const showNotificationMenu = hasAccessToNotificationMenu(room, client.isGuest(), isArchived);

        const canInvite = room.canInvite(client.getUserId()!) && !isDm && shouldShowComponent(UIComponent.InviteUsers);
        const canCopyRoomLink = !isDm;

        // Get the current room notification state from EchoChamber
        const echoChamber = EchoChamber.forRoom(room);
        const elementRoomNotifState = echoChamber.notificationVolume;

        // Convert element-web RoomNotifState to shared-components RoomNotifState
        let roomNotifState: RoomNotifState;
        switch (elementRoomNotifState) {
            case ElementRoomNotifState.AllMessages:
                roomNotifState = RoomNotifState.AllMessages;
                break;
            case ElementRoomNotifState.AllMessagesLoud:
                roomNotifState = RoomNotifState.AllMessagesLoud;
                break;
            case ElementRoomNotifState.MentionsOnly:
                roomNotifState = RoomNotifState.MentionsOnly;
                break;
            case ElementRoomNotifState.Mute:
                roomNotifState = RoomNotifState.Mute;
                break;
            default:
                roomNotifState = RoomNotifState.AllMessages;
        }

        const isNotificationMute = elementRoomNotifState === ElementRoomNotifState.Mute;

        // Like Telegram, a muted room shows its unread messages in a grey counter, with the @ when one mentions the
        // user. Its push rule gives it no notification count and no mentions, so they are found in the timeline.
        const countsMutedUnread =
            isNotificationMute &&
            notifState.level === NotificationLevel.None &&
            room.getMyMembership() === KnownMembership.Join;
        const mutedUnread = countsMutedUnread ? countUnreadMessages(room) : { count: 0, mentionsMe: false };
        const mutedUnreadCount = mutedUnread.count;
        const isMutedUnread = countsMutedUnread && (mutedUnreadCount > 0 || Boolean(getMarkedUnreadState(room)));
        const isMutedMention = isMutedUnread && mutedUnread.mentionsMe;

        // Notification levels
        const canMarkAsRead = notifState.level > NotificationLevel.None || isMutedUnread;
        const canMarkAsUnread = !canMarkAsRead && !isArchived;

        // Video room and call state tracking
        const call = CallStore.instance.getCall(room.roomId);
        const participantCount = call?.participants.size ?? 0;
        const hasParticipantsInCall = participantCount > 0;
        const callType =
            call?.callType === CallType.Voice ? "voice" : call?.callType === CallType.Video ? "video" : undefined;

        // A room with a pending invitation can't be marked as favourite or low priority
        const canChangeSection = room.getMyMembership() !== KnownMembership.Invite;

        return {
            id: room.roomId,
            room,
            name: room.name,
            messagePreview,
            ...RoomListItemViewModel.getTimestamp(room, client),
            notification: {
                hasAnyNotificationOrActivity:
                    notifState.hasAnyNotificationOrActivity || hasParticipantsInCall || isMutedUnread,
                isUnsentMessage: notifState.isUnsentMessage,
                invited: notifState.invited,
                isMention: notifState.isMention || isMutedMention,
                isActivityNotification: notifState.isActivityNotification,
                isNotification: notifState.isNotification || (isMutedUnread && !isMutedMention),
                hasUnreadCount: notifState.hasUnreadCount || mutedUnreadCount > 0,
                count: isMutedUnread ? mutedUnreadCount : notifState.count,
                muted: isNotificationMute,
                callType: hasParticipantsInCall ? callType : undefined,
            },
            showMoreOptionsMenu,
            showNotificationMenu,
            isFavourite,
            isLowPriority,
            canInvite,
            canCopyRoomLink,
            canMarkAsRead,
            canMarkAsUnread,
            roomNotifState,
            canChangeSection,
        };
    }

    public onOpenRoom = (): void => {
        dispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: this.props.room.roomId,
        });
    };

    public onMarkAsRead = async (): Promise<void> => {
        await clearRoomNotification(this.props.room, this.props.client);
    };

    public onMarkAsUnread = async (): Promise<void> => {
        await setMarkedUnreadState(this.props.room, this.props.client, true);
    };

    public onToggleFavorite = (): void => {
        tagRoom(this.props.room, DefaultTagID.Favourite);
    };

    public onToggleLowPriority = (): void => {
        tagRoom(this.props.room, DefaultTagID.LowPriority);
    };

    public onInvite = (): void => {
        dispatcher.dispatch({
            action: "view_invite",
            roomId: this.props.room.roomId,
        });
    };

    public onCopyRoomLink = (): void => {
        dispatcher.dispatch({
            action: "copy_room",
            room_id: this.props.room.roomId,
        });
    };

    public onLeaveRoom = (): void => {
        const isArchived = Boolean(this.props.room.tags[DefaultTagID.Archived]);
        dispatcher.dispatch({
            action: isArchived ? "forget_room" : "leave_room",
            room_id: this.props.room.roomId,
        });
    };

    public onSetRoomNotifState = (notifState: RoomNotifState): void => {
        // Convert shared-components RoomNotifState to element-web RoomNotifState
        let elementNotifState: ElementRoomNotifState;
        switch (notifState) {
            case "all_messages":
                elementNotifState = ElementRoomNotifState.AllMessages;
                break;
            case "all_messages_loud":
                elementNotifState = ElementRoomNotifState.AllMessagesLoud;
                break;
            case "mentions_only":
                elementNotifState = ElementRoomNotifState.MentionsOnly;
                break;
            case "mute":
                elementNotifState = ElementRoomNotifState.Mute;
                break;
            default:
                elementNotifState = ElementRoomNotifState.AllMessages;
        }

        // Set the notification state using EchoChamber
        const echoChamber = EchoChamber.forRoom(this.props.room);
        echoChamber.notificationVolume = elementNotifState;
    };
}
