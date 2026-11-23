/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { EventType, type MatrixClient, type MatrixEvent, RelationType, type Room } from "matrix-js-sdk/src/matrix";
import {
    BaseViewModel,
    type ReactionsRowButtonReactor,
    type ReactionsRowButtonViewSnapshot,
    type ReactionsRowButtonViewModel as ReactionsRowButtonViewModelInterface,
} from "@element-hq/web-shared-components";

import { mediaFromMxc } from "../../../../../customisations/Media";
import { _t } from "../../../../../languageHandler";
import { formatList } from "../../../../../utils/FormattingUtils";
import dis from "../../../../../dispatcher/dispatcher";
import { ReactionsRowButtonTooltipViewModel } from "./ReactionsRowButtonTooltipViewModel";
import { REACTION_SHORTCODE_KEY } from "./reactionShortcode";

/** Telement: how many people who reacted a chip shows as avatars, in place of the count, as Telegram does. */
const MAX_REACTORS_SHOWN = 3;
const REACTOR_AVATAR_SIZE_PX = 16;

export interface ReactionsRowButtonViewModelProps {
    /**
     * The Matrix client instance.
     */
    client: MatrixClient;
    /**
     * The event we're displaying reactions for.
     */
    mxEvent: MatrixEvent;
    /**
     * The reaction content / key / emoji.
     */
    content: string;
    /**
     * The count of votes for this key.
     */
    count: number;
    /**
     * The CSS class name.
     */
    className?: string;
    /**
     * A list of Matrix reaction events for this key.
     */
    reactionEvents: MatrixEvent[];
    /**
     * A possible Matrix event if the current user has voted for this type.
     */
    myReactionEvent?: MatrixEvent;
    /**
     * Whether to prevent quick-reactions by clicking on this reaction.
     */
    disabled?: boolean;
    /**
     * Whether to render custom image reactions.
     */
    customReactionImagesEnabled?: boolean;
}

export class ReactionsRowButtonViewModel
    extends BaseViewModel<ReactionsRowButtonViewSnapshot, ReactionsRowButtonViewModelProps>
    implements ReactionsRowButtonViewModelInterface
{
    private readonly tooltipVm: ReactionsRowButtonTooltipViewModel;
    private static readonly getAriaLabel = (snapshot: ReactionsRowButtonViewSnapshot): string | undefined =>
        (snapshot as ReactionsRowButtonViewSnapshot & { ariaLabel?: string }).ariaLabel;

    private static readonly computeSnapshot = (
        props: ReactionsRowButtonViewModelProps,
        tooltipVm: ReactionsRowButtonTooltipViewModel,
    ): ReactionsRowButtonViewSnapshot => {
        const {
            client,
            mxEvent,
            content,
            count,
            className,
            reactionEvents,
            myReactionEvent,
            disabled,
            customReactionImagesEnabled,
        } = props;

        const room = client.getRoom(mxEvent.getRoomId());
        let ariaLabel: string | undefined;
        let customReactionName: string | undefined;

        if (room) {
            const senders: string[] = [];
            for (const reactionEvent of reactionEvents) {
                const member = room.getMember(reactionEvent.getSender()!);
                senders.push(member?.name || reactionEvent.getSender()!);
                customReactionName =
                    (customReactionImagesEnabled && REACTION_SHORTCODE_KEY.findIn(reactionEvent.getContent())) ||
                    undefined;
            }

            const reactors = formatList(senders, 6);
            if (content) {
                ariaLabel = _t("timeline|reactions|label", {
                    reactors,
                    content: customReactionName || content,
                });
            } else {
                ariaLabel = reactors;
            }
        }

        let imageSrc: string | undefined;
        let imageAlt: string | undefined;
        if (customReactionImagesEnabled && content.startsWith("mxc://")) {
            const resolved = mediaFromMxc(content).srcHttp;
            if (resolved) {
                imageSrc = resolved;
                imageAlt = customReactionName || _t("timeline|reactions|custom_reaction_fallback_label");
            }
        }

        const snapshot = {
            content,
            count,
            className,
            ariaLabel,
            isSelected: !!myReactionEvent,
            isDisabled: !!disabled,
            imageSrc,
            imageAlt,
            tooltipVm,
            reactors: room ? ReactionsRowButtonViewModel.computeReactors(client, room, reactionEvents) : undefined,
        };

        return snapshot;
    };

    /**
     * Telement: the people who reacted, while there are few enough for their avatars to stand in for the count, as in
     * Telegram.
     */
    private static computeReactors(
        client: MatrixClient,
        room: Room,
        reactionEvents: MatrixEvent[],
    ): ReactionsRowButtonReactor[] | undefined {
        const senders = [
            ...new Set(reactionEvents.map((event) => event.getSender()).filter((sender): sender is string => !!sender)),
        ];
        if (senders.length === 0 || senders.length > MAX_REACTORS_SHOWN) return undefined;

        const thumbnailSize = Math.round(REACTOR_AVATAR_SIZE_PX * window.devicePixelRatio);
        return senders.map((userId) => {
            const member = room.getMember(userId);
            const mxcAvatarUrl = member?.getMxcAvatarUrl();
            return {
                id: userId,
                name: member?.name || userId,
                avatarUrl: mxcAvatarUrl
                    ? (mediaFromMxc(mxcAvatarUrl, client).getThumbnailOfSourceHttp(
                          thumbnailSize,
                          thumbnailSize,
                          "crop",
                      ) ?? undefined)
                    : undefined,
            };
        });
    }

    private static sameReactors(
        a: ReactionsRowButtonReactor[] | undefined,
        b: ReactionsRowButtonReactor[] | undefined,
    ): boolean {
        if (a === b) return true;
        if (!a || !b || a.length !== b.length) return false;
        return a.every(
            (reactor, i) =>
                reactor.id === b[i].id && reactor.name === b[i].name && reactor.avatarUrl === b[i].avatarUrl,
        );
    }

    public constructor(props: ReactionsRowButtonViewModelProps) {
        const tooltipVm = new ReactionsRowButtonTooltipViewModel({
            client: props.client,
            mxEvent: props.mxEvent,
            content: props.content,
            reactionEvents: props.reactionEvents,
            customReactionImagesEnabled: props.customReactionImagesEnabled,
        });
        super(props, ReactionsRowButtonViewModel.computeSnapshot(props, tooltipVm));
        this.tooltipVm = tooltipVm;
        this.disposables.track(tooltipVm);
    }

    private setSnapshot(nextSnapshot: ReactionsRowButtonViewSnapshot): void {
        const currentSnapshot = this.snapshot.current;

        if (
            nextSnapshot.content === currentSnapshot.content &&
            nextSnapshot.count === currentSnapshot.count &&
            ReactionsRowButtonViewModel.getAriaLabel(nextSnapshot) ===
                ReactionsRowButtonViewModel.getAriaLabel(currentSnapshot) &&
            nextSnapshot.isSelected === currentSnapshot.isSelected &&
            nextSnapshot.isDisabled === currentSnapshot.isDisabled &&
            nextSnapshot.imageSrc === currentSnapshot.imageSrc &&
            nextSnapshot.imageAlt === currentSnapshot.imageAlt &&
            ReactionsRowButtonViewModel.sameReactors(nextSnapshot.reactors, currentSnapshot.reactors)
        ) {
            return;
        }

        this.snapshot.set(nextSnapshot);
    }

    public setReactionData(
        content: string,
        reactionEvents: MatrixEvent[],
        customReactionImagesEnabled?: boolean,
    ): void {
        this.props = { ...this.props, content, reactionEvents, customReactionImagesEnabled };

        this.tooltipVm.setProps({ content, reactionEvents, customReactionImagesEnabled });
        this.setSnapshot(ReactionsRowButtonViewModel.computeSnapshot(this.props, this.tooltipVm));
    }

    public setCount(count: number): void {
        this.props = { ...this.props, count };
        this.snapshot.merge({ count });
    }

    public setMyReactionEvent(myReactionEvent?: MatrixEvent): void {
        this.props = { ...this.props, myReactionEvent };
        this.snapshot.merge({ isSelected: !!myReactionEvent });
    }

    public setDisabled(disabled?: boolean): void {
        this.props = { ...this.props, disabled };
        this.snapshot.merge({ isDisabled: !!disabled });
    }

    public onClick = (): void => {
        const { client, mxEvent, myReactionEvent, content, disabled } = this.props;
        if (disabled) return;

        if (myReactionEvent) {
            void client.redactEvent(mxEvent.getRoomId()!, myReactionEvent.getId()!);
            return;
        }

        void client.sendEvent(mxEvent.getRoomId()!, EventType.Reaction, {
            "m.relates_to": {
                rel_type: RelationType.Annotation,
                event_id: mxEvent.getId()!,
                key: content,
            },
        });
        dis.dispatch({ action: "message_sent" });
    };
}
