/*
Copyright 2024 New Vector Ltd.
Copyright 2015-2023 The Matrix.org Foundation C.I.C.
Copyright 2021, 2022 Šimon Brandner <simon.bra.ag@gmail.com>
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, createRef, useContext } from "react";
import classNames from "classnames";
import {
    EventStatus,
    type MatrixEvent,
    MatrixEventEvent,
    RoomMemberEvent,
    EventType,
    RelationType,
    type Relations,
    Thread,
    M_POLL_START,
} from "matrix-js-sdk/src/matrix";
import {
    CloseIcon,
    CollapseIcon,
    ExpandIcon,
    VisibilityOffIcon,
    EditIcon,
    InlineCodeIcon,
    PinIcon,
    QuoteIcon,
    ReplyIcon,
    RestartIcon,
    ThreadsIcon,
    UnpinIcon,
    DeleteIcon,
    ForwardIcon,
    PopOutIcon,
    VisibilityOnIcon,
    CopyIcon,
    TreeIcon,
    ImageIcon,
    PollsEndIcon,
    ErrorIcon,
    ShareIosIcon,
    DownloadIosIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { copyPlainTextToClipboard } from "@element-hq/element-web-shared-utils";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import dis from "../../../dispatcher/dispatcher";
import { _t } from "../../../languageHandler";
import Modal from "../../../Modal";
import Resend from "../../../Resend";
import SettingsStore from "../../../settings/SettingsStore";
import { isUrlPermitted } from "../../../HtmlUtils";
import { canCancel, canEditContent, editEvent, isContentActionable } from "../../../utils/EventUtils";
import IconizedContextMenu, { IconizedContextMenuOption, IconizedContextMenuOptionList } from "./IconizedContextMenu";
import { Action } from "../../../dispatcher/actions";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { type ButtonEvent } from "../elements/AccessibleButton";
import { getSelectedText } from "../../../utils/strings";
import ContextMenu, { ChevronFace, type MenuProps } from "../../structures/ContextMenu";
import ReactionPicker from "../emojipicker/ReactionPicker";
import ViewSource from "../../structures/ViewSource";
import { createRedactEventDialog } from "../dialogs/ConfirmRedactDialog";
import { ShareDialog } from "../dialogs/ShareDialog";
import RoomContext, { TimelineRenderingType } from "../../../contexts/RoomContext";
import EndPollDialog from "../dialogs/EndPollDialog";
import { isPollEnded } from "../messages/MPollBody";
import { type ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { type GetRelationsForEvent, type IEventTileOps } from "../rooms/EventTile";
import { type OpenForwardDialogPayload } from "../../../dispatcher/payloads/OpenForwardDialogPayload";
import { type OpenReportEventDialogPayload } from "../../../dispatcher/payloads/OpenReportEventDialogPayload";
import { createMapSiteLinkFromEvent } from "../../../utils/location";
import { getForwardableEvent } from "../../../events/forward/getForwardableEvent";
import { getShareableLocationEvent } from "../../../events/location/getShareableLocationEvent";
import { type ShowThreadPayload } from "../../../dispatcher/payloads/ShowThreadPayload";
import { CardContext } from "../right_panel/context";
import PinningUtils from "../../../utils/PinningUtils";
import {
    canCopyImageToClipboard,
    copyImageToClipboard,
} from "../../../telement/message-context-menu/copyImageToClipboard";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import { getMediaVisibility, setMediaVisibility } from "../../../utils/media/mediaVisibility";
import { shouldDisplayReply } from "../../../utils/Reply";
import { checkMediaSavingAllowed, saveMediaAs } from "../../../telement/media/saveMediaAs";
import { MessageQuickReactions } from "../../../telement/message-context-menu/MessageQuickReactions";
import { getMessageText } from "../../../telement/message-context-menu/getMessageText";

interface IReplyInThreadButton {
    mxEvent: MatrixEvent;
    closeMenu: () => void;
}

const ReplyInThreadButton: React.FC<IReplyInThreadButton> = ({ mxEvent, closeMenu }) => {
    const context = useContext(CardContext);
    const relationType = mxEvent?.getRelation()?.rel_type;

    // Can't create a thread from an event with an existing relation
    if (Boolean(relationType) && relationType !== RelationType.Thread) return null;

    const onClick = (): void => {
        if (mxEvent.getThread() && !mxEvent.isThreadRoot) {
            dis.dispatch<ShowThreadPayload>({
                action: Action.ShowThread,
                rootEvent: mxEvent.getThread()!.rootEvent!,
                initialEvent: mxEvent,
                scroll_into_view: true,
                highlighted: true,
                push: context.isCard,
            });
        } else {
            dis.dispatch<ShowThreadPayload>({
                action: Action.ShowThread,
                rootEvent: mxEvent,
                push: context.isCard,
            });
        }
        closeMenu();
    };

    return <IconizedContextMenuOption icon={<ThreadsIcon />} label={_t("action|reply_in_thread")} onClick={onClick} />;
};

interface IProps extends MenuProps {
    /* the MatrixEvent associated with the context menu */
    mxEvent: MatrixEvent;
    // An optional EventTileOps implementation that can be used to unhide preview widgets
    eventTileOps?: IEventTileOps;
    // Callback called when the menu is dismissed
    permalinkCreator?: RoomPermalinkCreator;
    /* an optional function to be called when the user clicks collapse thread, if not provided hide button */
    collapseReplyChain?(): void;
    /* whether the message's quotes are expanded, shown with onToggleQuoteExpanded */
    isQuoteExpanded?: boolean;
    /* expands or collapses the message's quotes; without it the menu doesn't offer to */
    onToggleQuoteExpanded?(): void;
    /* callback called when the menu is dismissed */
    onFinished(): void;
    // If the menu is inside a dialog, we sometimes need to close that dialog after click (forwarding)
    onCloseDialog?(): void;
    // True if the menu is being used as a right click menu
    rightClick?: boolean;
    // The Relations model from the JS SDK for reactions to `mxEvent`
    reactions?: Relations | null;
    // A permalink to this event or an href of an anchor element the user has clicked
    link?: string;
    // Loads the picture the user has clicked, which the menu then offers to copy
    loadImage?(): Promise<Blob>;

    getRelationsForEvent?: GetRelationsForEvent;
}

interface IState {
    canRedact: boolean;
    canPin: boolean;
    reactionPickerDisplayed: boolean;
    // Whether a module lets the user save the message's file
    canSaveMedia: boolean;
}

export default class MessageContextMenu extends React.Component<IProps, IState> {
    public static contextType = RoomContext;
    declare public context: React.ContextType<typeof RoomContext>;

    private quickReactionsRef = createRef<HTMLDivElement>();
    private readonly mediaSavingCheck: Promise<boolean> | undefined;

    public constructor(props: IProps) {
        super(props);

        this.mediaSavingCheck = MediaEventHelper.isEligible(props.mxEvent)
            ? checkMediaSavingAllowed(props.mxEvent)
            : undefined;
        this.state = {
            canRedact: false,
            canPin: false,
            reactionPickerDisplayed: false,
            canSaveMedia: !this.mediaSavingCheck,
        };
    }

    public componentDidMount(): void {
        MatrixClientPeg.safeGet().on(RoomMemberEvent.PowerLevel, this.checkPermissions);

        // re-check the permissions on send progress (`maySendRedactionForEvent` only returns true for events that have
        // been fully sent and echoed back, and we want to ensure the "Remove" option is added once that happens.)
        this.props.mxEvent.on(MatrixEventEvent.Status, this.checkPermissions);

        this.checkPermissions();
        void this.mediaSavingCheck?.then((canSaveMedia) => this.setState({ canSaveMedia }));
    }

    public componentWillUnmount(): void {
        const cli = MatrixClientPeg.get();
        if (cli) {
            cli.removeListener(RoomMemberEvent.PowerLevel, this.checkPermissions);
        }
        this.props.mxEvent.removeListener(MatrixEventEvent.Status, this.checkPermissions);
    }

    private checkPermissions = (): void => {
        const cli = MatrixClientPeg.safeGet();
        const room = cli.getRoom(this.props.mxEvent.getRoomId());

        // We explicitly decline to show the redact option on ACL events as it has a potential
        // to obliterate the room - https://github.com/matrix-org/synapse/issues/4042
        // Similarly for encryption events, since redacting them "breaks everything"
        const canRedact =
            !!room?.currentState.maySendRedactionForEvent(this.props.mxEvent, cli.getSafeUserId()) &&
            this.props.mxEvent.getType() !== EventType.RoomServerAcl &&
            this.props.mxEvent.getType() !== EventType.RoomEncryption;

        const canPin = PinningUtils.canPin(cli, this.props.mxEvent) || PinningUtils.canUnpin(cli, this.props.mxEvent);

        this.setState({ canRedact, canPin });
    };

    private canEndPoll(mxEvent: MatrixEvent): boolean {
        return (
            M_POLL_START.matches(mxEvent.getType()) &&
            this.state.canRedact &&
            !isPollEnded(mxEvent, MatrixClientPeg.safeGet())
        );
    }

    /**
     * Returns true if the current selection is entirely within a single "mx_MTextBody" element.
     */
    private isSelectionWithinSingleTextBody(): boolean {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);

        function getParentByClass(node: Node | null, className: string): HTMLElement | null {
            while (node) {
                if (node instanceof HTMLElement && node.classList.contains(className)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        }

        const startTextBody = getParentByClass(range.startContainer, "mx_MTextBody");
        const endTextBody = getParentByClass(range.endContainer, "mx_MTextBody");

        return !!startTextBody && startTextBody === endTextBody;
    }

    private onResendReactionsClick = (): void => {
        for (const reaction of this.getUnsentReactions()) {
            void Resend.resend(MatrixClientPeg.safeGet(), reaction);
        }
        this.closeMenu();
    };

    private onJumpToRelatedEventClick = (relatedEventId: string): void => {
        dis.dispatch({
            action: "view_room",
            room_id: this.props.mxEvent.getRoomId(),
            event_id: relatedEventId,
            highlighted: true,
        });
    };

    private onReportEventClick = (): void => {
        dis.dispatch<OpenReportEventDialogPayload>({
            action: Action.OpenReportEventDialog,
            event: this.props.mxEvent,
        });
        this.closeMenu();
    };

    private onViewSourceClick = (): void => {
        Modal.createDialog(
            ViewSource,
            {
                mxEvent: this.props.mxEvent,
            },
            "mx_Dialog_viewsource",
        );
        this.closeMenu();
    };

    private onRedactClick = (): void => {
        const { mxEvent, onCloseDialog } = this.props;
        createRedactEventDialog({
            mxEvent,
            onCloseDialog,
        });
        this.closeMenu();
    };

    private onForwardClick = (forwardableEvent: MatrixEvent) => (): void => {
        dis.dispatch<OpenForwardDialogPayload>({
            action: Action.OpenForwardDialog,
            event: forwardableEvent,
            permalinkCreator: this.props.permalinkCreator ?? null,
        });
        this.closeMenu();
    };

    private onPinClick = (isPinned: boolean): void => {
        // Pin or unpin in background
        void PinningUtils.pinOrUnpinEvent(MatrixClientPeg.safeGet(), this.props.mxEvent);

        this.closeMenu();
    };

    private closeMenu = (): void => {
        this.props.onFinished();
    };

    private onUnhidePreviewClick = (): void => {
        this.props.eventTileOps?.unhideWidget();
        this.closeMenu();
    };

    private onShareClick = (e: ButtonEvent): void => {
        e.preventDefault();
        Modal.createDialog(ShareDialog, {
            target: this.props.mxEvent,
            permalinkCreator: this.props.permalinkCreator,
        });
        this.closeMenu();
    };

    private onCopyLinkClick = (e: ButtonEvent): void => {
        e.preventDefault(); // So that we don't open the permalink
        if (!this.props.link) return;
        void copyPlainTextToClipboard(this.props.link);
        this.closeMenu();
    };

    private onCopyImageClick = (): void => {
        if (this.props.loadImage) void copyImageToClipboard(this.props.loadImage());
        this.closeMenu();
    };

    private onSaveAsClick = (): void => {
        void saveMediaAs(this.props.mxEvent);
        this.closeMenu();
    };

    /** Runs the action on the first of the message's removal, edit and itself that passes the check. */
    private runOnPendingEvent(action: (event: MatrixEvent) => void, check: (event: MatrixEvent) => boolean): void {
        const { mxEvent } = this.props;
        const event = [mxEvent.localRedactionEvent(), mxEvent.replacingEvent(), mxEvent].find((ev) => ev && check(ev));
        if (event) action(event);
        this.closeMenu();
    }

    private onResendClick = (): void => {
        this.runOnPendingEvent(
            (event) => void Resend.resend(MatrixClientPeg.safeGet(), event),
            () => true,
        );
    };

    private onCancelSendClick = (): void => {
        this.runOnPendingEvent(
            (event) => Resend.removeFromQueue(MatrixClientPeg.safeGet(), event),
            (event) => canCancel(event.status),
        );
    };

    private onHideMediaClick = (): void => {
        void setMediaVisibility(this.props.mxEvent, false);
        this.closeMenu();
    };

    private onToggleQuoteExpandedClick = (): void => {
        this.props.onToggleQuoteExpanded?.();
        this.closeMenu();
    };

    private onCollapseReplyChainClick = (): void => {
        this.props.collapseReplyChain?.();
        this.closeMenu();
    };

    private onCopyClick = (): void => {
        void copyPlainTextToClipboard(getSelectedText());
        this.closeMenu();
    };

    private onCopyTextClick = (text: string): void => {
        void copyPlainTextToClipboard(text);
        this.closeMenu();
    };

    private onQuoteClick = (): void => {
        const selectedText = getSelectedText();
        if (selectedText) {
            // Format as markdown quote
            const quotedText = selectedText
                .trim()
                .split(/\r?\n/)
                .map((line) => `> ${line}`)
                .join("\n");
            dis.dispatch({
                action: Action.ComposerInsert,
                text: "\n" + quotedText + "\n\n ",
                timelineRenderingType: this.context.timelineRenderingType,
            });
        }
        this.closeMenu();
    };

    private onEditClick = (): void => {
        editEvent(
            MatrixClientPeg.safeGet(),
            this.props.mxEvent,
            this.context.timelineRenderingType,
            this.props.getRelationsForEvent,
        );
        this.closeMenu();
    };

    private onReplyClick = (): void => {
        dis.dispatch({
            action: "reply_to_event",
            event: this.props.mxEvent,
            context: this.context.timelineRenderingType,
        });
        this.closeMenu();
    };

    private onReactClick = (): void => {
        this.setState({ reactionPickerDisplayed: true });
    };

    private onCloseReactionPicker = (): void => {
        this.setState({ reactionPickerDisplayed: false });
        this.closeMenu();
    };

    private onEndPollClick = (): void => {
        const matrixClient = MatrixClientPeg.safeGet();
        Modal.createDialog(
            EndPollDialog,
            {
                matrixClient,
                event: this.props.mxEvent,
            },
            "mx_Dialog_endPoll",
        );
        this.closeMenu();
    };

    private getReactions(filter: (e: MatrixEvent) => boolean): MatrixEvent[] {
        const cli = MatrixClientPeg.safeGet();
        const room = cli.getRoom(this.props.mxEvent.getRoomId());
        const eventId = this.props.mxEvent.getId();
        return (
            room?.getPendingEvents().filter((e) => {
                const relation = e.getRelation();
                return relation?.rel_type === RelationType.Annotation && relation.event_id === eventId && filter(e);
            }) ?? []
        );
    }

    private getUnsentReactions(): MatrixEvent[] {
        return this.getReactions((e) => e.status === EventStatus.NOT_SENT);
    }

    private viewInRoom = (): void => {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: this.props.mxEvent.getId(),
            highlighted: true,
            room_id: this.props.mxEvent.getRoomId(),
        });
        this.closeMenu();
    };

    public render(): React.ReactNode {
        const cli = MatrixClientPeg.safeGet();
        const me = cli.getUserId();
        const { mxEvent, rightClick, link, eventTileOps, reactions, collapseReplyChain, ...other } = this.props;
        delete other.isQuoteExpanded;
        delete other.onToggleQuoteExpanded;
        delete other.getRelationsForEvent;
        delete other.permalinkCreator;
        delete other.loadImage;

        const eventStatus = mxEvent.status;
        const unsentReactionsCount = this.getUnsentReactions().length;
        const contentActionable = isContentActionable(mxEvent);
        const permalink = this.props.permalinkCreator?.forEvent(this.props.mxEvent.getId()!);
        // status is SENT before remote-echo, null after
        const isSent = !eventStatus || eventStatus === EventStatus.SENT;
        const { timelineRenderingType, canReact, canSendMessages } = this.context;
        const isThread =
            timelineRenderingType === TimelineRenderingType.Thread ||
            timelineRenderingType === TimelineRenderingType.ThreadsList;
        const isThreadRootEvent = isThread && mxEvent?.getThread()?.rootEvent === mxEvent;

        let resendReactionsButton: JSX.Element | undefined;
        if (!mxEvent.isRedacted() && unsentReactionsCount !== 0) {
            resendReactionsButton = (
                <IconizedContextMenuOption
                    icon={<RestartIcon />}
                    label={_t("timeline|context_menu|resent_unsent_reactions", { unsentCount: unsentReactionsCount })}
                    onClick={this.onResendReactionsClick}
                />
            );
        }

        // A message, its edit or its removal that is still sending or failed to send, which Telegram's menu offers to
        // send again or cancel instead of the hover toolbar Element had
        const editStatus = mxEvent.replacingEvent()?.status;
        const redactStatus = mxEvent.localRedactionEvent()?.status;
        let resendButton: JSX.Element | undefined;
        if ([eventStatus, editStatus, redactStatus].includes(EventStatus.NOT_SENT)) {
            resendButton = (
                <IconizedContextMenuOption
                    icon={<RestartIcon />}
                    label={_t("action|retry")}
                    onClick={this.onResendClick}
                />
            );
        }
        let cancelSendButton: JSX.Element | undefined;
        if (canCancel(eventStatus) || canCancel(editStatus) || canCancel(redactStatus)) {
            cancelSendButton = (
                <IconizedContextMenuOption
                    icon={<CloseIcon />}
                    label={_t("action|cancel")}
                    onClick={this.onCancelSendClick}
                />
            );
        }

        let hideMediaButton: JSX.Element | undefined;
        if (contentActionable && MediaEventHelper.canHide(mxEvent) && getMediaVisibility(mxEvent, cli)) {
            hideMediaButton = (
                <IconizedContextMenuOption
                    icon={<VisibilityOffIcon />}
                    label={_t("telement|timeline|context_menu|hide_media")}
                    onClick={this.onHideMediaClick}
                />
            );
        }

        let toggleQuoteExpandedButton: JSX.Element | undefined;
        // The tile only knows whether its quotes are expanded once they are long enough to collapse
        if (
            this.props.onToggleQuoteExpanded &&
            this.props.isQuoteExpanded !== undefined &&
            shouldDisplayReply(mxEvent)
        ) {
            const expanded = this.props.isQuoteExpanded;
            toggleQuoteExpandedButton = (
                <IconizedContextMenuOption
                    icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
                    label={
                        expanded
                            ? _t("telement|timeline|context_menu|collapse_quotes")
                            : _t("telement|timeline|context_menu|expand_quotes")
                    }
                    onClick={this.onToggleQuoteExpandedClick}
                />
            );
        }

        let redactButton: JSX.Element | undefined;
        if (isSent && this.state.canRedact) {
            redactButton = (
                <IconizedContextMenuOption
                    icon={<DeleteIcon />}
                    label={_t("action|remove")}
                    onClick={this.onRedactClick}
                />
            );
        }

        let openInMapSiteButton: JSX.Element | undefined;
        const shareableLocationEvent = getShareableLocationEvent(mxEvent, cli);
        if (shareableLocationEvent) {
            const mapSiteLink = createMapSiteLinkFromEvent(shareableLocationEvent);
            openInMapSiteButton = (
                <IconizedContextMenuOption
                    icon={<PopOutIcon />}
                    onClick={null}
                    label={_t("timeline|context_menu|open_in_osm")}
                    element="a"
                    {...{
                        href: mapSiteLink,
                        target: "_blank",
                        rel: "noreferrer noopener",
                    }}
                />
            );
        }

        let forwardButton: JSX.Element | undefined;
        const forwardableEvent = getForwardableEvent(mxEvent, cli);
        if (contentActionable && forwardableEvent) {
            forwardButton = (
                <IconizedContextMenuOption
                    icon={<ForwardIcon />}
                    label={_t("action|forward")}
                    onClick={this.onForwardClick(forwardableEvent)}
                />
            );
        }

        // Telement: only in developer mode, like "View related event", as Telegram's menu has nothing like it
        let viewSourceButton: JSX.Element | undefined;
        if (SettingsStore.getValue("developerMode")) {
            viewSourceButton = (
                <IconizedContextMenuOption
                    icon={<InlineCodeIcon />}
                    label={_t("timeline|context_menu|view_source")}
                    onClick={this.onViewSourceClick}
                />
            );
        }

        let unhidePreviewButton: JSX.Element | undefined;
        if (eventTileOps?.isWidgetHidden()) {
            unhidePreviewButton = (
                <IconizedContextMenuOption
                    icon={<VisibilityOnIcon />}
                    label={_t("timeline|context_menu|show_url_preview")}
                    onClick={this.onUnhidePreviewClick}
                />
            );
        }

        let permalinkButton: JSX.Element | undefined;
        if (permalink) {
            permalinkButton = (
                <IconizedContextMenuOption
                    icon={<ShareIosIcon />}
                    onClick={this.onShareClick}
                    label={_t("action|share")}
                    element="a"
                    {
                        // XXX: Typescript signature for AccessibleButton doesn't work properly for non-inputs like `a`
                        ...{
                            href: permalink,
                            target: "_blank",
                            rel: "noreferrer noopener",
                        }
                    }
                />
            );
        }

        let endPollButton: JSX.Element | undefined;
        if (this.canEndPoll(mxEvent)) {
            endPollButton = (
                <IconizedContextMenuOption
                    icon={<PollsEndIcon />}
                    label={_t("poll|end_title")}
                    onClick={this.onEndPollClick}
                />
            );
        }

        // Bridges can provide a 'external_url' to link back to the source.
        let externalURLButton: JSX.Element | undefined;
        if (
            typeof mxEvent.getContent().external_url === "string" &&
            isUrlPermitted(mxEvent.getContent().external_url)
        ) {
            externalURLButton = (
                <IconizedContextMenuOption
                    icon={<PopOutIcon />}
                    onClick={this.closeMenu}
                    label={_t("timeline|context_menu|external_url")}
                    element="a"
                    {
                        // XXX: Typescript signature for AccessibleButton doesn't work properly for non-inputs like `a`
                        ...{
                            target: "_blank",
                            rel: "noreferrer noopener",
                            href: mxEvent.getContent().external_url,
                        }
                    }
                />
            );
        }

        let collapseReplyChainButton: JSX.Element | undefined;
        if (collapseReplyChain) {
            collapseReplyChainButton = (
                <IconizedContextMenuOption
                    icon={<CollapseIcon />}
                    label={_t("timeline|context_menu|collapse_reply_thread")}
                    onClick={this.onCollapseReplyChainClick}
                />
            );
        }

        let jumpToRelatedEventButton: JSX.Element | undefined;
        const relatedEventId = mxEvent.getAssociatedId();
        if (relatedEventId && SettingsStore.getValue("developerMode")) {
            jumpToRelatedEventButton = (
                <IconizedContextMenuOption
                    icon={<TreeIcon />}
                    label={_t("timeline|context_menu|view_related_event")}
                    onClick={() => this.onJumpToRelatedEventClick(relatedEventId)}
                />
            );
        }

        let reportEventButton: JSX.Element | undefined;
        if (mxEvent.getSender() !== me) {
            reportEventButton = (
                <IconizedContextMenuOption
                    icon={<ErrorIcon />}
                    label={_t("timeline|context_menu|report")}
                    onClick={this.onReportEventClick}
                />
            );
        }

        let copyLinkButton: JSX.Element | undefined;
        if (link) {
            copyLinkButton = (
                <IconizedContextMenuOption
                    icon={<CopyIcon />}
                    onClick={this.onCopyLinkClick}
                    label={_t("action|copy_link")}
                    element="a"
                    {
                        // XXX: Typescript signature for AccessibleButton doesn't work properly for non-inputs like `a`
                        ...{
                            href: link,
                            target: "_blank",
                            rel: "noreferrer noopener",
                        }
                    }
                />
            );
        }

        let copyImageButton: JSX.Element | undefined;
        if (this.props.loadImage && canCopyImageToClipboard()) {
            copyImageButton = (
                <IconizedContextMenuOption
                    icon={<ImageIcon />}
                    label={_t("telement|timeline|context_menu|copy_image")}
                    onClick={this.onCopyImageClick}
                />
            );
        }

        let saveAsButton: JSX.Element | undefined;
        if (contentActionable && MediaEventHelper.isEligible(mxEvent) && this.state.canSaveMedia) {
            saveAsButton = (
                <IconizedContextMenuOption
                    icon={<DownloadIosIcon />}
                    label={_t("telement|media|save_as")}
                    onClick={this.onSaveAsClick}
                />
            );
        }

        const selectedText = getSelectedText();

        let copyButton: JSX.Element | undefined;
        const messageText = getMessageText(mxEvent);
        if (rightClick && selectedText) {
            copyButton = (
                <IconizedContextMenuOption
                    icon={<CopyIcon />}
                    label={_t("action|copy")}
                    triggerOnMouseDown={true} // We use onMouseDown so that the selection isn't cleared when we click
                    onClick={this.onCopyClick}
                />
            );
        } else if (messageText) {
            // Telement: Telegram's "Copy Text", the whole message without selecting it first
            copyButton = (
                <IconizedContextMenuOption
                    icon={<CopyIcon />}
                    label={_t("telement|timeline|context_menu|copy_text")}
                    onClick={() => this.onCopyTextClick(messageText)}
                />
            );
        }

        let quoteButton: JSX.Element | undefined;
        if (rightClick && selectedText && selectedText.trim().length > 0 && this.isSelectionWithinSingleTextBody()) {
            quoteButton = (
                <IconizedContextMenuOption
                    icon={<QuoteIcon />}
                    label={_t("action|quote")}
                    triggerOnMouseDown={true}
                    onClick={this.onQuoteClick}
                />
            );
        }

        let editButton: JSX.Element | undefined;
        if (rightClick && canEditContent(cli, mxEvent)) {
            editButton = (
                <IconizedContextMenuOption icon={<EditIcon />} label={_t("action|edit")} onClick={this.onEditClick} />
            );
        }

        let replyButton: JSX.Element | undefined;
        if (rightClick && contentActionable && canSendMessages) {
            replyButton = (
                <IconizedContextMenuOption
                    icon={<ReplyIcon />}
                    label={_t("action|reply")}
                    onClick={this.onReplyClick}
                />
            );
        }

        // A removed message's thread stays reachable, as from the hover toolbar Element had
        const threadOfRemovedMessage =
            !contentActionable && timelineRenderingType === TimelineRenderingType.Room && !!mxEvent.getThread();
        let replyInThreadButton: JSX.Element | undefined;
        if (
            rightClick &&
            ((contentActionable &&
                canSendMessages &&
                Thread.hasServerSideSupport &&
                timelineRenderingType !== TimelineRenderingType.Thread) ||
                threadOfRemovedMessage)
        ) {
            replyInThreadButton = <ReplyInThreadButton mxEvent={mxEvent} closeMenu={this.closeMenu} />;
        }

        // Telement: Telegram's quick reactions above the menu, in place of "React"; their last button opens the picker
        let quickReactions: JSX.Element | undefined;
        if (rightClick && contentActionable && canReact) {
            quickReactions = (
                <MessageQuickReactions
                    ref={this.quickReactionsRef}
                    mxEvent={mxEvent}
                    reactions={reactions}
                    canSelfRedact={this.context.canSelfRedact}
                    timelineRenderingType={timelineRenderingType}
                    onShowAllReactions={this.onReactClick}
                    onFinished={this.closeMenu}
                />
            );
        }

        let pinButton: JSX.Element | undefined;
        if (rightClick && this.state.canPin) {
            const isPinned = PinningUtils.isPinned(MatrixClientPeg.safeGet(), this.props.mxEvent);
            pinButton = (
                <IconizedContextMenuOption
                    icon={isPinned ? <UnpinIcon /> : <PinIcon />}
                    label={isPinned ? _t("action|unpin") : _t("action|pin")}
                    onClick={() => this.onPinClick(isPinned)}
                />
            );
        }

        let viewInRoomButton: JSX.Element | undefined;
        if (isThreadRootEvent) {
            viewInRoomButton = (
                <IconizedContextMenuOption
                    icon={<VisibilityOnIcon />}
                    label={_t("timeline|mab|view_in_room")}
                    onClick={this.viewInRoom}
                />
            );
        }

        let nativeItemsList: JSX.Element | undefined;
        if (copyButton || quoteButton || copyImageButton || saveAsButton || copyLinkButton) {
            nativeItemsList = (
                <IconizedContextMenuOptionList>
                    {copyButton}
                    {quoteButton}
                    {copyImageButton}
                    {saveAsButton}
                    {copyLinkButton}
                </IconizedContextMenuOptionList>
            );
        }

        let sendItemsList: JSX.Element | undefined;
        if (resendButton || cancelSendButton) {
            sendItemsList = (
                <IconizedContextMenuOptionList>
                    {resendButton}
                    {cancelSendButton}
                </IconizedContextMenuOptionList>
            );
        }

        let quickItemsList: JSX.Element | undefined;
        if (editButton || replyButton || replyInThreadButton || pinButton) {
            quickItemsList = (
                <IconizedContextMenuOptionList>
                    {replyButton}
                    {replyInThreadButton}
                    {editButton}
                    {pinButton}
                </IconizedContextMenuOptionList>
            );
        }

        const commonItemsList = (
            <IconizedContextMenuOptionList>
                {viewInRoomButton}
                {openInMapSiteButton}
                {endPollButton}
                {forwardButton}
                {permalinkButton}
                {reportEventButton}
                {externalURLButton}
                {jumpToRelatedEventButton}
                {unhidePreviewButton}
                {hideMediaButton}
                {viewSourceButton}
                {resendReactionsButton}
                {toggleQuoteExpandedButton}
                {collapseReplyChainButton}
            </IconizedContextMenuOptionList>
        );

        let redactItemList: JSX.Element | undefined;
        if (redactButton) {
            redactItemList = <IconizedContextMenuOptionList red>{redactButton}</IconizedContextMenuOptionList>;
        }

        let reactionPicker: JSX.Element | undefined;
        if (this.state.reactionPickerDisplayed) {
            // The picker takes the quick reactions' place, as Telegram expands them into it
            const quickReactionsRect = this.quickReactionsRef.current?.getBoundingClientRect();
            reactionPicker = (
                <ContextMenu
                    left={quickReactionsRect?.left}
                    top={quickReactionsRect?.top}
                    // The chevron would sit on the picker's round corner
                    chevronFace={ChevronFace.None}
                    menuClassName="mx_TelementEmojiPickerMenu"
                    onFinished={this.closeMenu}
                    managed={false}
                    focusLock
                >
                    {/* Without the picker's own quick reactions: the menu's, a different set, just opened it */}
                    <ReactionPicker
                        mxEvent={mxEvent}
                        onFinished={this.onCloseReactionPicker}
                        reactions={reactions}
                        showQuickReactions={false}
                    />
                </ContextMenu>
            );
        }

        return (
            <React.Fragment>
                <IconizedContextMenu
                    {...other}
                    className="mx_MessageContextMenu"
                    compact={true}
                    data-testid="mx_MessageContextMenu"
                    header={quickReactions}
                    menuClassName={classNames({
                        mx_MessageQuickReactions_menu: !!quickReactions,
                        mx_MessageQuickReactions_menu_hidden: this.state.reactionPickerDisplayed,
                    })}
                >
                    {sendItemsList}
                    {nativeItemsList}
                    {quickItemsList}
                    {commonItemsList}
                    {redactItemList}
                </IconizedContextMenu>
                {reactionPicker}
            </React.Fragment>
        );
    }
}
