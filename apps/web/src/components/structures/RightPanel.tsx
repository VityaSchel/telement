/*
Copyright 2024 New Vector Ltd.
Copyright 2015-2022 The Matrix.org Foundation C.I.C.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { createRef } from "react";
import { type Room, type RoomState, RoomStateEvent, RoomMember, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { type VerificationRequest } from "matrix-js-sdk/src/crypto-api";
import { throttle } from "lodash";

import dis from "../../dispatcher/dispatcher";
import { RightPanelPhases } from "../../stores/right-panel/RightPanelStorePhases";
import RightPanelStore from "../../stores/right-panel/RightPanelStore";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import RoomSummaryCardView from "../views/right_panel/RoomSummaryCardView";
import WidgetCard from "../views/right_panel/WidgetCard";
import UserInfo from "../views/right_panel/UserInfo";
import ThirdPartyMemberInfo from "../views/rooms/ThirdPartyMemberInfo";
import FilePanel from "./FilePanel";
import ThreadView from "./ThreadView";
import ThreadPanel from "./ThreadPanel";
import NotificationPanel from "./NotificationPanel";
import type ResizeNotifier from "../../utils/ResizeNotifier";
import { PinnedMessagesCard } from "../views/right_panel/PinnedMessagesCard";
import { type RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import TimelineCard from "../views/right_panel/TimelineCard";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { type IRightPanelCard, type IRightPanelCardState } from "../../stores/right-panel/RightPanelStoreIPanelState";
import { Action } from "../../dispatcher/actions";
import { DocumentViewerCard } from "../views/right_panel/DocumentViewerCard";
import { type XOR } from "../../@types/common";
import { Key } from "../../Keyboard";
import Modal from "../../Modal";
import { RIGHT_PANEL_ID } from "../../telement/right-panel/panes";
import ExtensionsCard from "../views/right_panel/ExtensionsCard";
import MemberListView from "../views/rooms/MemberList/MemberListView";

interface BaseProps {
    overwriteCard?: IRightPanelCard; // used to display a custom card and ignoring the RightPanelStore (used for UserView)
    resizeNotifier: ResizeNotifier;
}

interface RoomlessProps extends BaseProps {
    room?: undefined;
    permalinkCreator?: undefined;
}

interface RoomProps extends BaseProps {
    room: Room;
    permalinkCreator: RoomPermalinkCreator;
}

type Props = XOR<RoomlessProps, RoomProps>;

interface IState {
    phase?: RightPanelPhases;
    cardState?: IRightPanelCardState;
}

/** Whether a key press is Escape that nothing has taken, such as a menu, or an input method to drop its composition. */
const isEscape = (ev: KeyboardEvent): boolean =>
    ev.key === Key.ESCAPE &&
    !ev.defaultPrevented &&
    !ev.isComposing &&
    !ev.shiftKey &&
    !ev.ctrlKey &&
    !ev.altKey &&
    !ev.metaKey;

export default class RightPanel extends React.Component<Props, IState> {
    public static contextType = MatrixClientContext;
    declare public context: React.ContextType<typeof MatrixClientContext>;

    private readonly panel = createRef<HTMLElement>();

    public constructor(props: Props) {
        super(props);

        this.state = RightPanel.getDerivedStateFromProps(props);
    }

    private readonly delayedUpdate = throttle(
        (): void => {
            this.forceUpdate();
        },
        500,
        { leading: true, trailing: true },
    );

    public componentDidMount(): void {
        this.context.on(RoomStateEvent.Members, this.onRoomStateMember);
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelStoreUpdate);
        document.addEventListener("keydown", this.onDocumentKeyDown);
    }

    /** Whether the focus is on the pane that the update is about to replace, and so about to go with it. */
    public getSnapshotBeforeUpdate(): boolean {
        return !!this.panel.current?.contains(document.activeElement);
    }

    public componentDidUpdate(_prevProps: Props, _prevState: IState, hadFocus: boolean): void {
        // The row or message that opened this page went with the pane that held it. The focus goes on to the page's
        // title, as it does to that of a new page, unless the page took it, as a thread's composer does.
        if (hadFocus && (!document.activeElement || document.activeElement === document.body)) {
            const title = this.panel.current?.querySelector<HTMLElement>(".mx_BaseCard_header_title_heading");
            if (!title) return;
            title.tabIndex = -1;
            title.focus({ preventScroll: true });
        }
    }

    public componentWillUnmount(): void {
        this.context?.removeListener(RoomStateEvent.Members, this.onRoomStateMember);
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelStoreUpdate);
        document.removeEventListener("keydown", this.onDocumentKeyDown);
        this.delayedUpdate.cancel();
    }

    public static getDerivedStateFromProps(props: Props): Partial<IState> {
        let currentCard: IRightPanelCard | undefined;
        if (props.room) {
            currentCard = RightPanelStore.instance.currentCardForRoom(props.room.roomId);
        }

        return {
            cardState: currentCard?.state,
            phase: currentCard?.phase ?? undefined,
        };
    }

    private onRoomStateMember = (ev: MatrixEvent, state: RoomState, member: RoomMember): void => {
        if (!this.props.room || member.roomId !== this.props.room.roomId) {
            return;
        }

        // redraw the badge on the membership list
        if (this.state.phase === RightPanelPhases.MemberList) {
            this.delayedUpdate();
        } else if (
            this.state.phase === RightPanelPhases.MemberInfo &&
            member.userId === this.state.cardState?.member?.userId
        ) {
            // refresh the member info (e.g. new power level)
            this.delayedUpdate();
        }
    };

    private onRightPanelStoreUpdate = (): void => {
        this.setState({ ...(RightPanel.getDerivedStateFromProps(this.props) as IState) });
    };

    /** The verification the encryption panel shows, while it isn't done yet. */
    private get pendingVerification(): VerificationRequest | undefined {
        const request = this.state.cardState?.verificationRequest;
        return this.state.phase === RightPanelPhases.EncryptionPanel && request?.pending ? request : undefined;
    }

    /**
     * Closes the panel. Telement's panes have no close button: their button in the room header or Escape closes them.
     */
    private close(): void {
        if (this.props.overwriteCard?.state?.member) {
            // If we have a user prop then we're displaying a user from the 'user' page type
            // in LoggedInView, so need to change the page type to close the panel
            dis.dispatch({
                action: Action.ViewHomePage,
            });
        } else {
            RightPanelStore.instance.hide(this.props.room?.roomId ?? null);
        }
    }

    /** Escape inside the panel closes it, before the room around it takes the key to mark its messages as read. */
    private onKeyDown = (ev: React.KeyboardEvent): void => {
        if (!isEscape(ev.nativeEvent)) return;
        ev.preventDefault();
        ev.stopPropagation();

        if (this.pendingVerification) {
            // Not closed yet: the panel says that the verification was canceled
            void this.pendingVerification.cancel();
            return;
        }
        // The focus would go with the panel: it goes back to the button in the room header that opens the pane
        const opener = document.querySelector<HTMLElement>(`[aria-controls="${RIGHT_PANEL_ID}"][aria-expanded="true"]`);
        this.close();
        opener?.focus();
    };

    /**
     * Escape anywhere else closes the panel too, once nothing there took the key: a menu, the composer, the timeline. It
     * doesn't cancel a verification, which may not be what the key is pressed for there.
     */
    private onDocumentKeyDown = (ev: KeyboardEvent): void => {
        if (!isEscape(ev) || Modal.hasDialogs() || this.pendingVerification) return;
        this.close();
    };

    public render(): React.ReactNode {
        let card = <div />;
        const roomId = this.props.room?.roomId;
        const phase = this.props.overwriteCard?.phase ?? this.state.phase;
        const cardState = this.props.overwriteCard?.state ?? this.state.cardState;
        switch (phase) {
            case RightPanelPhases.MemberList:
                if (!!roomId) {
                    card = <MemberListView roomId={roomId} />;
                }
                break;

            case RightPanelPhases.MemberInfo:
            case RightPanelPhases.EncryptionPanel: {
                if (!!cardState?.member) {
                    const roomMember = cardState.member instanceof RoomMember ? cardState.member : undefined;
                    card = (
                        <UserInfo
                            user={cardState.member}
                            room={this.context.getRoom(roomMember?.roomId) ?? this.props.room}
                            key={roomId ?? cardState.member.userId}
                            phase={phase}
                            verificationRequest={cardState.verificationRequest}
                            verificationRequestPromise={cardState.verificationRequestPromise}
                        />
                    );
                }
                break;
            }
            case RightPanelPhases.ThreePidMemberInfo:
                if (!!cardState?.memberInfoEvent) {
                    card = <ThirdPartyMemberInfo event={cardState.memberInfoEvent} key={roomId} />;
                }
                break;

            case RightPanelPhases.NotificationPanel:
                card = <NotificationPanel />;
                break;

            case RightPanelPhases.PinnedMessages:
                if (!!this.props.room) {
                    card = <PinnedMessagesCard room={this.props.room} permalinkCreator={this.props.permalinkCreator} />;
                }
                break;
            case RightPanelPhases.Timeline:
                if (!!this.props.room) {
                    card = (
                        <TimelineCard
                            classNames="mx_ThreadPanel mx_TimelineCard"
                            room={this.props.room}
                            timelineSet={this.props.room.getUnfilteredTimelineSet()}
                            resizeNotifier={this.props.resizeNotifier}
                            permalinkCreator={this.props.permalinkCreator}
                        />
                    );
                }
                break;
            case RightPanelPhases.FilePanel:
                if (!!roomId) {
                    card = <FilePanel roomId={roomId} />;
                }
                break;

            case RightPanelPhases.ThreadView:
                if (!!this.props.room && !!cardState?.threadHeadEvent) {
                    card = (
                        <ThreadView
                            room={this.props.room}
                            resizeNotifier={this.props.resizeNotifier}
                            mxEvent={cardState.threadHeadEvent}
                            initialEvent={cardState.initialEvent}
                            isInitialEventHighlighted={cardState.isInitialEventHighlighted}
                            initialEventScrollIntoView={cardState.initialEventScrollIntoView}
                            permalinkCreator={this.props.permalinkCreator}
                        />
                    );
                }
                break;

            case RightPanelPhases.ThreadPanel:
                if (!!this.props.room) {
                    card = (
                        <ThreadPanel
                            roomId={this.props.room.roomId}
                            resizeNotifier={this.props.resizeNotifier}
                            permalinkCreator={this.props.permalinkCreator}
                        />
                    );
                }
                break;

            case RightPanelPhases.RoomSummary:
                if (!!this.props.room) {
                    card = (
                        <RoomSummaryCardView
                            room={this.props.room}
                            // whenever RightPanel is passed a room it is passed a permalinkcreator
                            permalinkCreator={this.props.permalinkCreator}
                        />
                    );
                }
                break;

            case RightPanelPhases.Extensions:
                if (!!this.props.room) {
                    card = <ExtensionsCard room={this.props.room} />;
                }
                break;

            case RightPanelPhases.Widget:
                if (!!this.props.room && !!cardState?.widgetId) {
                    card = <WidgetCard room={this.props.room} widgetId={cardState.widgetId} />;
                }
                break;

            case RightPanelPhases.DocumentViewer:
                if (!!cardState?.documentViewerEvent) {
                    card = <DocumentViewerCard mxEvent={cardState.documentViewerEvent} />;
                }
                break;
        }

        return (
            <aside
                className="mx_RightPanel"
                id={RIGHT_PANEL_ID}
                data-testid="right-panel"
                ref={this.panel}
                onKeyDown={this.onKeyDown}
            >
                {card}
            </aside>
        );
    }
}
