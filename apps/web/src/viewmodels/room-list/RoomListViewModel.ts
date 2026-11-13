/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type RoomListViewSnapshot,
    type FilterId,
    type RoomListViewActions,
    type RoomListViewState,
} from "@element-hq/web-shared-components";
import { Room, type MatrixClient, PendingEventOrdering, RoomType } from "matrix-js-sdk/src/matrix";

import { Action } from "../../dispatcher/actions";
import dispatcher from "../../dispatcher/dispatcher";
import { type ViewRoomDeltaPayload } from "../../dispatcher/payloads/ViewRoomDeltaPayload";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import type SpaceStore from "../../stores/spaces/SpaceStore";
import RoomListStoreV3, { RoomListStoreV3Event, type RoomsResult } from "../../stores/room-list-v3/RoomListStoreV3";
import { FilterEnum } from "../../stores/room-list-v3/skip-list/filters";
import {
    RoomNotificationStateStore,
    UPDATE_STATUS_INDICATOR,
} from "../../stores/notifications/RoomNotificationStateStore";
import { RoomListItemViewModel } from "./RoomListItemViewModel";
import { PreviewRoomListItemViewModel, type PreviewRoomListItemProps } from "./PreviewRoomListItemViewModel";
import { hasCreateRoomRights } from "./utils";
import { keepIfSame } from "../../utils/keepIfSame";
import { type RoomViewStore } from "../../stores/RoomViewStore.tsx";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { EffectiveMembership, getEffectiveMembership } from "../../utils/membership";
import { isPinnedRoom } from "../../telement/room-list/isPinnedRoom";
import { getNextMidnight } from "../../telement/room-list/formatChatListTimestamp";
import SettingsStore from "../../settings/SettingsStore";
import { USER_TIMEZONE_KEY } from "../../TimezoneHandler";

interface RoomListViewModelProps {
    client: MatrixClient;
    roomViewStore: RoomViewStore;
    spaceStore: SpaceStore;
}

const filterKeyToIdMap: Map<FilterEnum, FilterId> = new Map([
    [FilterEnum.UnreadFilter, "unread"],
    [FilterEnum.PeopleFilter, "people"],
    [FilterEnum.RoomsFilter, "rooms"],
    [FilterEnum.MentionsFilter, "mentions"],
    [FilterEnum.InvitesFilter, "invites"],
    [FilterEnum.LowPriorityFilter, "low_priority"],
]);

export class RoomListViewModel
    extends BaseViewModel<RoomListViewSnapshot, RoomListViewModelProps>
    implements RoomListViewActions
{
    // State tracking
    private activeFilter: FilterEnum | undefined = undefined;
    private roomsResult: RoomsResult;
    /**
     * The rooms displayed in the room list: roomsResult, with the preview room added by {@link withPreviewRoom}.
     */
    private rooms: Room[] = [];
    private lastActiveRoomIndex: number | undefined = undefined;

    // Child view model management
    private readonly roomItemViewModels = new Map<string, RoomListItemViewModel>();
    // This map is intentionally additive (never cleared except on space changes) to avoid a race condition:
    // a list update can refresh roomsResult and roomsMap before the view re-renders, so the view may still
    // request a view model for a room that was removed from the latest list. Keeping old entries prevents a crash.
    private roomsMap = new Map<string, Room>();

    /**
     * The last genuinely-visible room index reported by the virtualized list (excluding the
     * rendered overscan buffer). Initialised to -1 so that nothing is considered "below the
     * fold" until the view reports the fold.
     */
    private foldIndex = -1;

    /**
     * Imperative scroll handle registered by the view (see {@link setScrollToIndex}). The view
     * owns the virtualized list's scroll handle, so it provides this; we call it to scroll a
     * given item index into view in response to user actions.
     */
    private scrollToIndex?: (index: number) => void;

    /**
     * A room waiting to be scrolled into view. Selecting a room in another space switches the
     * active space asynchronously, so the room is not in {@link roomsResult} yet when the request
     * arrives; it is retried each time the list settles, for as long as it stays the active room.
     */
    private roomIdToScroll?: string;

    /**
     * The item for the open room when it isn't in {@link roomsResult} because the user isn't a member of it.
     * See {@link updatePreviewItem}.
     */
    private previewItem?: PreviewRoomListItemViewModel;

    /**
     * The room of {@link previewItem}, added below the pinned rooms by {@link withPreviewRoom}.
     * When the client doesn't know the room, this is an empty `Room` used only to place the item in the list.
     */
    private previewRoom?: Room;

    /**
     * The one timer that formats the times of the rooms in view again when one of them changes: at midnight, or
     * earlier for a time from yesterday that turns into a weekday. See {@link scheduleTimestampRefresh}.
     */
    private timestampTimer?: number;

    /** When {@link timestampTimer} fires. */
    private timestampRefreshAt = Infinity;

    public constructor(props: RoomListViewModelProps) {
        const activeSpace = props.spaceStore.activeSpaceRoom;

        // Get initial rooms
        const roomsResult = RoomListStoreV3.instance.getSortedRoomsInActiveSpace(undefined);
        const canCreateRoom = hasCreateRoomRights(props.client, activeSpace);
        const filterIds = [...filterKeyToIdMap.values()];

        super(props, {
            // Initial view state - start with empty, will populate in async init
            isLoadingRooms: RoomListStoreV3.instance.isLoadingRooms,
            isRoomListEmpty: roomsResult.rooms.length === 0,
            filterIds,
            activeFilterId: undefined,
            roomListState: {
                activeRoomIndex: undefined,
                spaceId: roomsResult.spaceId,
                filterKeys: undefined,
            },
            roomIds: roomsResult.rooms.map((room) => room.roomId),
            canCreateRoom,
        });

        this.roomsResult = roomsResult;
        this.rooms = roomsResult.rooms;

        // Build initial roomsMap from roomsResult
        this.updateRoomsMap(roomsResult);

        // Subscribe to room list updates
        this.disposables.trackListener(RoomListStoreV3.instance, RoomListStoreV3Event.ListsUpdate, this.onListsUpdate);

        // Subscribe to room list loaded
        this.disposables.trackListener(RoomListStoreV3.instance, RoomListStoreV3Event.ListsLoaded, this.onListsLoaded);

        // Recompute the "unread activity below" toast when room notification state
        // changes (e.g. a room below the fold becomes unread, or is marked read).
        this.disposables.trackListener(
            RoomNotificationStateStore.instance,
            UPDATE_STATUS_INDICATOR,
            this.updateUnreadActivityBelow,
        );

        // Subscribe to active room changes to update selected room
        const dispatcherRef = dispatcher.register(this.onDispatch);
        this.disposables.track(() => {
            dispatcher.unregister(dispatcherRef);
        });

        // The summary of the open room arrives after the room has been opened
        this.disposables.trackListener(props.roomViewStore, UPDATE_EVENT, this.onRoomViewStoreUpdate);

        // Track cleanup of all child view models
        this.disposables.track(() => {
            for (const viewModel of this.roomItemViewModels.values()) {
                viewModel.dispose();
            }
            this.roomItemViewModels.clear();
            this.previewItem?.dispose();
        });

        // A room may already be open when the list is created
        this.onRoomViewStoreUpdate();

        this.scheduleTimestampRefresh();
        this.disposables.track(() => window.clearTimeout(this.timestampTimer));
        // The times follow the user's 12-hour and time zone settings
        const settingWatchers = [
            SettingsStore.watchSetting("showTwelveHourTimestamps", null, this.refreshTimestamps),
            SettingsStore.watchSetting(USER_TIMEZONE_KEY, null, this.refreshTimestamps),
        ];
        this.disposables.track(() => settingWatchers.forEach((watcher) => SettingsStore.unwatchSetting(watcher)));
    }

    /**
     * Format the times of the rooms in view again, and wait for the next time one of them changes.
     */
    private readonly refreshTimestamps = (): void => {
        for (const viewModel of this.roomItemViewModels.values()) viewModel.refreshTimestamp();
        this.scheduleTimestampRefresh();
    };

    /**
     * Set {@link timestampTimer} for `at`, by default the next midnight or the earlier change of a room in view.
     */
    private scheduleTimestampRefresh(at?: number): void {
        if (at === undefined) {
            at = getNextMidnight(Date.now());
            for (const viewModel of this.roomItemViewModels.values()) {
                const expiry = viewModel.timestampExpiry;
                if (expiry !== undefined && expiry < at) at = expiry;
            }
        }
        window.clearTimeout(this.timestampTimer);
        this.timestampRefreshAt = at;
        this.timestampTimer = window.setTimeout(this.refreshTimestamps, at - Date.now());
    }

    private readonly onRoomViewStoreUpdate = (): void => {
        if (this.updatePreviewItem()) void this.updateRoomListData();
    };

    /**
     * Build the item for the open room when it isn't in the list and the user isn't a member of it,
     * e.g. a room they can knock on. The item goes away when another room is opened or when the room
     * enters the list, after the user has joined or knocked. It also sets {@link previewRoom}.
     * @returns whether the item has changed.
     */
    private updatePreviewItem(): boolean {
        const preview = this.getPreviewItemProps();
        if (preview?.roomId === this.previewItem?.roomId) return false;

        this.previewItem?.dispose();
        this.previewItem = preview && new PreviewRoomListItemViewModel(preview);
        const { client } = this.props;
        this.previewRoom =
            preview &&
            (client.getRoom(preview.roomId) ??
                new Room(preview.roomId, client, client.getSafeUserId(), {
                    pendingEventOrdering: PendingEventOrdering.Detached,
                }));
        return true;
    }

    /**
     * Add the room of the preview item at the top of the list, below the pinned rooms, so it is listed like any
     * other room.
     */
    private withPreviewRoom(roomsResult: RoomsResult): RoomsResult {
        const previewRoom = this.previewRoom;
        if (!previewRoom) return roomsResult;

        const rooms = [...roomsResult.rooms];
        rooms.splice(rooms.filter(isPinnedRoom).length, 0, previewRoom);
        return { ...roomsResult, rooms };
    }

    /**
     * Work out what to show for the open room if it isn't in the list and the user isn't a member of it.
     * The client has the room if the user has left it; otherwise all we have is its summary, which RoomView
     * only gets for rooms the client doesn't know.
     */
    private getPreviewItemProps(): PreviewRoomListItemProps | undefined {
        const roomId = this.props.roomViewStore.getRoomId();
        if (!roomId || this.roomsResult.rooms.some((room) => room.roomId === roomId)) {
            return undefined;
        }

        let props: PreviewRoomListItemProps | undefined;
        const room = this.props.client.getRoom(roomId);
        if (room) {
            // A room the user is a member of is only missing because of the filters or the space
            if (getEffectiveMembership(room.getMyMembership()) !== EffectiveMembership.Leave) return undefined;
            props = {
                roomId,
                name: room.name,
                avatarUrl: room.getMxcAvatarUrl() ?? undefined,
                roomType: room.getType(),
            };
        } else {
            const summary = this.props.roomViewStore.getRoomSummary();
            if (!summary) return undefined;
            props = {
                roomId,
                name: summary.name ?? summary.canonical_alias ?? roomId,
                avatarUrl: summary.avatar_url,
                roomType: summary.room_type,
            };
        }

        // Spaces are shown in the space panel, not in the room list
        return props.roomType === RoomType.Space ? undefined : props;
    }

    public onToggleFilter = (filterId: FilterId): void => {
        // Find the FilterKey by matching the filter ID
        let filterKey: FilterEnum | undefined = undefined;
        for (const [key, id] of filterKeyToIdMap.entries()) {
            if (id === filterId) {
                filterKey = key;
                break;
            }
        }

        if (filterKey === undefined) return;

        // Toggle the filter - if it's already active, deactivate it
        const newFilter = this.activeFilter === filterKey ? undefined : filterKey;
        this.activeFilter = newFilter;

        // Update rooms result with new filter
        const filterKeys = this.activeFilter !== undefined ? [this.activeFilter] : undefined;
        this.roomsResult = RoomListStoreV3.instance.getSortedRoomsInActiveSpace(filterKeys);

        // Update roomsMap immediately before clearing VMs
        this.updateRoomsMap(this.roomsResult);

        void this.updateRoomListData();
    };

    /**
     * Add rooms from the RoomsResult to the roomsMap for quick lookup.
     * This does not clear the roomsMap.
     * This maintains a quick lookup for room objects.
     */
    private updateRoomsMap(roomsResult: RoomsResult): void {
        for (const room of roomsResult.rooms) {
            this.roomsMap.set(room.roomId, room);
        }
    }

    /**
     * Clear all child view models.
     * Called when the room list structure changes (space change, filter change, etc.)
     */
    private clearViewModels(): void {
        for (const viewModel of this.roomItemViewModels.values()) {
            viewModel.dispose();
        }
        this.roomItemViewModels.clear();
    }

    /**
     * Get the ordered list of room IDs.
     */
    public get roomIds(): string[] {
        return this.withPreviewRoom(this.roomsResult).rooms.map((room) => room.roomId);
    }

    /**
     * Get a RoomListItemViewModel for a specific room, or the {@link PreviewRoomListItemViewModel} of the open room
     * when it isn't in the list.
     * Creates a RoomListItemViewModel if needed, which manages per-room subscriptions.
     * The view should call this only for visible rooms from the roomIds list.
     * @throws Error if room is not found in roomsMap (indicates a programming error)
     */
    public getRoomItemViewModel(roomId: string): RoomListItemViewModel | PreviewRoomListItemViewModel | undefined {
        if (this.previewItem?.roomId === roomId) return this.previewItem;

        // Check if we have a view model for this room
        let viewModel = this.roomItemViewModels.get(roomId);

        if (!viewModel) {
            let room = this.roomsMap.get(roomId);
            if (!room) {
                // Maybe the roomsMap is out of date due to a recent roomsResult change that hasn't been applied yet (race condition)
                this.updateRoomsMap(this.roomsResult);
                room = this.roomsMap.get(roomId);
            }

            if (!room) {
                // Race condition: the room list has changed but the view hasn't re-rendered yet.
                // Return undefined so the view can skip rendering this item.
                return undefined;
            }

            // Create new view model
            viewModel = new RoomListItemViewModel({
                room,
                client: this.props.client,
            });

            this.roomItemViewModels.set(roomId, viewModel);

            const timestampExpiry = viewModel.timestampExpiry;
            if (timestampExpiry !== undefined && timestampExpiry < this.timestampRefreshAt) {
                this.scheduleTimestampRefresh(timestampExpiry);
            }
        }

        // Return the view model - the view will call useViewModel() on it
        return viewModel;
    }

    /**
     * Update which rooms are currently visible.
     * Called by the view when scroll position changes.
     * Disposes of view models for rooms no longer visible.
     *
     * startIndex is inclusive, endIndex is exclusive.
     */
    public updateVisibleRooms(startIndex: number, endIndex: number): void {
        const allRoomIds = this.roomIds;
        const newVisibleIds = allRoomIds.slice(startIndex, endIndex);

        const newVisibleSet = new Set(newVisibleIds);

        // Dispose view models for rooms no longer visible
        for (const [roomId, viewModel] of this.roomItemViewModels.entries()) {
            if (!newVisibleSet.has(roomId)) {
                viewModel.dispose();
                this.roomItemViewModels.delete(roomId);
            }
        }

        // The rendered range changed, so re-evaluate whether unread activity is below the fold.
        this.updateUnreadActivityBelow();
    }

    /**
     * Update the last genuinely-visible item index (excluding the rendered overscan
     * buffer), reported by the view from the scroller geometry. This is what the
     * "unread activity" toast uses to decide what is below the fold, so that the toast
     * appears as soon as an unread room scrolls just out of view rather than only once
     * it leaves the overscan buffer.
     */
    public updateVisibleFold = (visibleEndIndex: number): void => {
        if (this.foldIndex === visibleEndIndex) return;
        this.foldIndex = visibleEndIndex;
        this.updateUnreadActivityBelow();
    };

    /**
     * Find the first room with an unread-message notification (a count badge — the green or
     * red decoration, not just the unread-activity dot) positioned below the visible area.
     *
     * "Below the fold" is determined from the last visible index reported by the
     * virtualized list (see {@link updateVisibleFold}).
     *
     * @returns The next notifying room below the fold, or undefined if there is none
     *          (or the view has not yet reported a visible range).
     */
    private firstUnreadRoomBelowFold(): { room: Room; index: number } | undefined {
        if (this.foldIndex < 0) return undefined;

        // Only surface rooms showing a notification badge (a count/symbol — the green or red
        // decoration), not rooms with just the unread-activity dot.
        const hasNotification = (room: Room): boolean =>
            RoomNotificationStateStore.instance.getRoomState(room).hasUnreadCount;

        for (let i = this.foldIndex + 1; i < this.rooms.length; i++) {
            if (hasNotification(this.rooms[i])) return { room: this.rooms[i], index: i };
        }
        return undefined;
    }

    /**
     * Recompute whether there is unread activity below the visible area, showing or hiding the
     * "unread_activity" toast accordingly.
     */
    private updateUnreadActivityBelow = (): void => {
        const hasUnreadActivityBelow = this.firstUnreadRoomBelowFold() !== undefined;
        this.snapshot.merge({ toast: hasUnreadActivityBelow ? "unread_activity" : undefined });
    };

    /**
     * Register (or clear) the view's imperative scroll handler. Called by the view on mount
     * since it owns the virtualized list's scroll handle.
     */
    public setScrollToIndex = (scrollToIndex: ((index: number) => void) | undefined): void => {
        this.scrollToIndex = scrollToIndex;
        // A room asked for before the view was ready could not be scrolled to at the time.
        if (scrollToIndex) this.retryScrollRoomIntoView();
    };

    /**
     * Scroll the next unread room below the visible area of the list into view (without opening
     * it). Invoked when the user clicks the "unread activity" toast.
     */
    public scrollToUnreadActivity = (): void => {
        const target = this.firstUnreadRoomBelowFold();
        if (target) this.scrollToIndex?.(target.index);
    };

    /**
     * Scroll a room into view.
     *
     * @returns whether the room was found and scrolled to.
     */
    private scrollRoomIntoView(roomId: string): boolean {
        // Room not found
        if (!this.roomsResult.rooms.some((room) => room.roomId === roomId)) return false;

        // Scroll to the room
        const index = this.rooms.findIndex((room) => room.roomId === roomId);
        if (index === -1 || !this.scrollToIndex) return false;
        this.scrollToIndex(index);
        return true;
    }

    /** Ask for a room to be scrolled into view. A newer request replaces any earlier one. */
    private requestScrollRoomIntoView(roomId: string): void {
        this.roomIdToScroll = roomId;
        this.scrollToRequestedRoom();
    }

    /**
     * Try {@link roomIdToScroll} again now that the list has settled or the view has become ready,
     * so a room that only appears once its space has finished switching is still scrolled to.
     */
    private retryScrollRoomIntoView(): void {
        if (this.roomIdToScroll === this.props.roomViewStore.getRoomId()) {
            this.scrollToRequestedRoom();
        } else {
            this.roomIdToScroll = undefined;
        }
    }

    /** Carry out {@link roomIdToScroll}, clearing it once the room has been scrolled to. */
    private scrollToRequestedRoom(): void {
        const roomId = this.roomIdToScroll;
        if (roomId !== undefined && this.scrollRoomIntoView(roomId)) this.roomIdToScroll = undefined;
    }

    private onDispatch = async (payload: any): Promise<void> => {
        if (payload.action === Action.ActiveRoomChanged) {
            // When the active room changes, update the room list data to reflect the new selected room
            // Pass isRoomChange=true so sticky logic doesn't prevent the index from updating
            await this.updateRoomListData(true);
            // Show the room wherever it was opened from: the global search, a permalink, a
            // notification. A tile that is already fully visible is left alone by the list.
            if (payload.newRoomId) this.requestScrollRoomIntoView(payload.newRoomId);
        } else if (payload.action === Action.ViewRoomDelta) {
            // Handle keyboard navigation shortcuts (Alt+ArrowUp/Down)
            // This was previously handled by useRoomListNavigation hook
            this.handleViewRoomDelta(payload as ViewRoomDeltaPayload);
        } else if (payload.action === Action.ViewRoom && payload.show_room_tile && payload.room_id) {
            this.requestScrollRoomIntoView(payload.room_id);
        }
    };

    /**
     * Handle keyboard navigation shortcuts (Alt+ArrowUp/Down) to move between rooms.
     * Supports both regular navigation and unread-only navigation.
     * Migrated from useRoomListNavigation hook.
     */
    private handleViewRoomDelta(payload: ViewRoomDeltaPayload): void {
        const currentRoomId = this.props.roomViewStore.getRoomId();

        const { delta, unread } = payload;
        const rooms = this.rooms;

        const filteredRooms = unread
            ? // Filter the rooms to only include unread ones and the active room
              rooms.filter((room) => {
                  const state = RoomNotificationStateStore.instance.getRoomState(room);
                  return room.roomId === currentRoomId || state.isUnread;
              })
            : rooms;

        // Get the next/previous new room according to the delta
        // Use slice to loop on the list
        // If delta is -1 at the start of the list, it will go to the end
        // If delta is 1 at the end of the list, it will go to the start
        let start: number;
        if (currentRoomId) {
            const currentIndex = filteredRooms.findIndex((room) => room.roomId === currentRoomId);
            if (currentIndex === -1) return;
            start = (currentIndex + delta) % filteredRooms.length;
        } else {
            // No room is open, which is the case right after the app loads. There is nothing to
            // move relative to, so start from whichever end of the list the delta points at.
            start = delta > 0 ? 0 : -1;
        }

        const [newRoom] = filteredRooms.slice(start);
        if (!newRoom) return;

        dispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: newRoom.roomId,
            show_room_tile: true, // to make sure the room gets scrolled into view
        });
    }

    /**
     * Handle room list updates from RoomListStoreV3.
     *
     * This event fires when:
     * - Room order changes (new messages, manual reordering)
     * - Active space changes
     * - Filters are applied
     * - Rooms are added/removed
     *
     * Space changes are detected by comparing old vs new spaceId.
     * This matches the old hook pattern where space changes were handled
     * indirectly through room list updates.
     */
    private onListsUpdate = (): void => {
        const filterKeys = this.activeFilter !== undefined ? [this.activeFilter] : undefined;
        const oldSpaceId = this.roomsResult.spaceId;

        // Refresh room data from store
        this.roomsResult = RoomListStoreV3.instance.getSortedRoomsInActiveSpace(filterKeys);
        const newSpaceId = this.roomsResult.spaceId;

        // Detect space change
        if (oldSpaceId !== newSpaceId) {
            // Clear view models when the space changes
            // We only want to do this on space changes, not on regular list updates, to preserve view models when possible
            // The view models are disposed when scrolling out of view (handled by updateVisibleRooms)
            this.clearViewModels();
            // Clear roomsMap to prevent stale room data - it will be repopulated with the new roomsResult
            this.roomsMap.clear();

            this.updateRoomsMap(this.roomsResult);

            // Space changed - get the last selected room for the new space to prevent flicker
            const lastSelectedRoom = this.props.spaceStore.getLastSelectedRoomIdForSpace(newSpaceId);

            void this.updateRoomListData(true, lastSelectedRoom);
            return;
        }

        this.updateRoomsMap(this.roomsResult);

        // Normal room list update (not a space change)
        void this.updateRoomListData();
    };

    private onListsLoaded = (): void => {
        // Room lists have finished loading
        this.snapshot.merge({
            isLoadingRooms: false,
        });
    };

    /**
     * Calculate the active room index based on the currently viewed room.
     * Returns undefined if no room is selected or if the selected room is not in the current list.
     *
     * @param roomId - The room ID to find the index for (can be null/undefined)
     */
    private getActiveRoomIndex(roomId: string | null | undefined): number | undefined {
        if (!roomId) {
            return undefined;
        }

        const index = this.rooms.findIndex((room) => room.roomId === roomId);
        return index >= 0 ? index : undefined;
    }

    /**
     * Find the index of a room in the list of rooms.
     * Returns undefined if the room is not found.
     */
    private findRoomIndex(rooms: Room[], roomId: string): number | undefined {
        const index = rooms.findIndex((room) => room.roomId === roomId);
        return index >= 0 ? index : undefined;
    }

    /**
     * Apply sticky room logic to keep the active room at the same position in the list.
     * When the room list updates, this prevents the selected room from jumping around in the UI.
     *
     * @param isRoomChange - Whether this update is due to a room change (not a list update)
     * @param roomId - The room ID to apply sticky logic for (can be null/undefined)
     * @returns The modified rooms array with sticky positioning applied
     */
    private applyStickyRoom(isRoomChange: boolean, roomId: string | null | undefined): Room[] {
        const rooms = this.roomsResult.rooms;

        // When opening another room, the index should obviously change
        if (!roomId || isRoomChange) return rooms;

        // If there was no previously tracked index, nothing to stick to
        const oldIndex = this.lastActiveRoomIndex;
        if (oldIndex === undefined) return rooms;

        const newIndex = this.findRoomIndex(rooms, roomId);

        // If the room is no longer in the list, nothing to do
        if (newIndex === undefined) return rooms;

        // If the index hasn't changed, nothing to do
        if (newIndex === oldIndex) return rooms;

        // If the old index falls out of the bounds of the list
        // (usually because rooms were removed), we can no longer place
        // the active room in the same old position
        if (oldIndex > rooms.length - 1) return rooms;

        // Pinned rooms stay above the other rooms, so the active room only keeps its old index
        // while that index is among the rooms of its own kind, pinned or not
        const pinnedRoomCount = rooms.filter(isPinnedRoom).length;
        if (isPinnedRoom(rooms[newIndex]) !== oldIndex < pinnedRoomCount) return rooms;

        // Making the active room sticky is as simple as removing it from
        // its new index and placing it in the old index
        const newRooms = [...rooms];
        const [stickyRoom] = newRooms.splice(newIndex, 1);
        newRooms.splice(oldIndex, 0, stickyRoom);

        return newRooms;
    }

    private async updateRoomListData(
        isRoomChange: boolean = false,
        roomIdOverride: string | null = null,
    ): Promise<void> {
        // Store is still loading rooms - don't update the list yet, we'll get another update when loading finishes
        if (RoomListStoreV3.instance.isLoadingRooms) return;

        // Determine the room ID to use for calculations
        // Use override if provided (e.g., during space changes), otherwise fall back to RoomViewStore
        const roomId = roomIdOverride ?? this.props.roomViewStore.getRoomId();

        // Apply sticky room logic to keep selected room at same position
        const stickyRooms = this.applyStickyRoom(isRoomChange, roomId);

        // Update roomsResult with the sticky-adjusted rooms
        this.roomsResult = {
            ...this.roomsResult,
            rooms: stickyRooms,
        };

        // Rebuild roomsMap with the reordered rooms
        this.updateRoomsMap(this.roomsResult);

        this.updatePreviewItem();

        // Track the current active room index for future sticky calculations
        this.lastActiveRoomIndex = roomId ? this.findRoomIndex(this.roomsResult.rooms, roomId) : undefined;

        // Build the complete state atomically to ensure consistency
        this.rooms = this.withPreviewRoom(this.roomsResult).rooms;

        // Calculate the active room index from the displayed rooms
        const activeRoomIndex = this.getActiveRoomIndex(roomId);

        // Update filter keys - only update if they have actually changed to prevent unnecessary re-renders of the room list
        const previousFilterKeys = this.snapshot.current.roomListState.filterKeys;
        const newFilterKeys = this.roomsResult.filterKeys?.map((k) => String(k));
        const roomIds = this.rooms.map((room) => room.roomId);

        const roomListState: RoomListViewState = {
            activeRoomIndex,
            spaceId: this.roomsResult.spaceId,
            filterKeys: keepIfSame(previousFilterKeys, newFilterKeys),
        };

        const activeFilterId = this.activeFilter !== undefined ? filterKeyToIdMap.get(this.activeFilter) : undefined;
        const isRoomListEmpty = this.rooms.length === 0;
        const isLoadingRooms = RoomListStoreV3.instance.isLoadingRooms;

        // Single atomic snapshot update
        this.snapshot.merge({
            isLoadingRooms,
            isRoomListEmpty,
            activeFilterId,
            roomListState: keepIfSame(this.snapshot.current.roomListState, roomListState),
            roomIds: keepIfSame(this.snapshot.current.roomIds, roomIds),
        });

        // Room list changed: re-evaluate the unread-activity toast.
        this.updateUnreadActivityBelow();

        // Ensure the room list updates its filters based on the new rooms data
        RoomListStoreV3.instance.updateRoomSkipList();

        // The list has settled, so a scroll waiting on a space switch can now happen.
        this.retryScrollRoomIntoView();
    }

    public createChatRoom = (): void => {
        dispatcher.fire(Action.CreateChat);
    };

    public createRoom = (): void => {
        const activeSpace = this.props.spaceStore.activeSpaceRoom;
        if (activeSpace) {
            dispatcher.dispatch({
                action: Action.CreateRoom,
                parent_space: activeSpace,
            });
        } else {
            dispatcher.dispatch({
                action: Action.CreateRoom,
            });
        }
    };
}
