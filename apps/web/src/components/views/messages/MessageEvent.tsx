/*
Copyright 2024 New Vector Ltd.
Copyright 2015-2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { createRef, type JSX, useCallback, useEffect } from "react";
import {
    EventType,
    MsgType,
    MatrixEventEvent,
    M_BEACON_INFO,
    M_LOCATION,
    M_POLL_START,
} from "matrix-js-sdk/src/matrix";
import { MjolnirBodyView, UnknownBodyView, useCreateAutoDisposedViewModel } from "@element-hq/web-shared-components";

import SettingsStore from "../../../settings/SettingsStore";
import { Mjolnir } from "../../../mjolnir/Mjolnir";
import { type IMediaBody } from "./IMediaBody";
import { MediaEventHelper } from "../../../utils/MediaEventHelper";
import { type IBodyProps } from "./IBodyProps";
import MVoiceOrAudioBody from "./MVoiceOrAudioBody";
import MStickerBody from "./MStickerBody";
import MPollBody from "./MPollBody";
import MLocationBody from "./MLocationBody";
import MBeaconBody from "./MBeaconBody";
import { type GetRelationsForEvent, type IEventTileOps } from "../rooms/EventTile";
import { MjolnirBodyViewModel } from "../../../viewmodels/room/timeline/event-tile/body/MjolnirBodyViewModel";
import {
    allowMjolnirBody,
    isMjolnirBodyAllowed,
} from "../../../viewmodels/room/timeline/event-tile/EventTileMjolnirBodyState";
import {
    DecryptionFailureBodyFactory,
    FileBodyFactory,
    ImageBodyFactory,
    RedactedBodyFactory,
    VideoBodyFactory,
    renderMBody,
} from "./MBodyFactory";
import { TextualBodyFactory } from "./TextualBodyFactory";
import { isVideoNote } from "../../../telement/video-notes/isVideoNote";
import { VideoNoteBodyFactory } from "../../../telement/video-notes/VideoNoteBodyFactory";
import { validateImageOrVideoMimetype, validateStickerMimetype } from "../../../telement/media/validateMediaMimetype";

// onMessageAllowed is handled internally
interface IProps extends Omit<IBodyProps, "onMessageAllowed" | "mediaEventHelper"> {
    /* overrides for the msgtype-specific components, used by ReplyTile to override file rendering */
    overrideBodyTypes?: Record<string, React.ComponentType<IBodyProps>>;
    overrideEventTypes?: Record<string, React.ComponentType<IBodyProps>>;

    // helper function to access relations for this event
    getRelationsForEvent?: GetRelationsForEvent;

    isSeeingThroughMessageHiddenForModeration?: boolean;

    /**
     * Optional ID for the root element.
     */
    id?: string;
}

export interface IOperableEventTile {
    getEventTileOps(): IEventTileOps | null;
}

const baseBodyTypes = new Map<string, React.ComponentType<IBodyProps>>([
    [MsgType.Text, TextualBodyFactory],
    [MsgType.Notice, TextualBodyFactory],
    [MsgType.Emote, TextualBodyFactory],
    [MsgType.Image, ImageBodyFactory],
    [MsgType.File, (props: IBodyProps) => renderMBody(props, FileBodyFactory)!],
    [MsgType.Audio, MVoiceOrAudioBody],
    [MsgType.Video, VideoBodyFactory],
]);
const baseEvTypes = new Map<string, React.ComponentType<IBodyProps>>([
    [EventType.Sticker, MStickerBody],
    [M_POLL_START.name, MPollBody],
    [M_POLL_START.altName, MPollBody],
    [M_BEACON_INFO.name, MBeaconBody],
    [M_BEACON_INFO.altName, MBeaconBody],
]);

function MjolnirBodyWrappedView({ mxEvent, onMessageAllowed, ref }: IBodyProps): JSX.Element {
    const onAllow = useCallback(() => {
        allowMjolnirBody(mxEvent, onMessageAllowed);
    }, [mxEvent, onMessageAllowed]);
    const vm = useCreateAutoDisposedViewModel(() => new MjolnirBodyViewModel({ onAllow }));

    useEffect(() => {
        vm.setProps({ onAllow });
    }, [onAllow, vm]);

    return <MjolnirBodyView vm={vm} ref={ref} />;
}

function UnknownBody({ mxEvent, ref }: IBodyProps): JSX.Element {
    return <UnknownBodyView text={mxEvent.getContent().body} ref={ref} className="mx_UnknownBody" />;
}

export default class MessageEvent extends React.Component<IProps> implements IMediaBody, IOperableEventTile {
    private body = createRef<React.Component | IOperableEventTile>();
    private mediaHelper?: MediaEventHelper;
    private bodyTypes = new Map<string, React.ComponentType<IBodyProps>>(baseBodyTypes.entries());
    private evTypes = new Map<string, React.ComponentType<IBodyProps>>(baseEvTypes.entries());

    public constructor(props: IProps) {
        super(props);

        if (MediaEventHelper.isEligible(this.props.mxEvent)) {
            this.mediaHelper = new MediaEventHelper(this.props.mxEvent);
        }

        this.updateComponentMaps();
    }

    public componentDidMount(): void {
        this.props.mxEvent.addListener(MatrixEventEvent.Decrypted, this.onDecrypted);
    }

    public componentWillUnmount(): void {
        this.props.mxEvent.removeListener(MatrixEventEvent.Decrypted, this.onDecrypted);
        this.mediaHelper?.destroy();
    }

    public componentDidUpdate(prevProps: Readonly<IProps>): void {
        if (this.props.mxEvent !== prevProps.mxEvent && MediaEventHelper.isEligible(this.props.mxEvent)) {
            this.mediaHelper?.destroy();
            this.mediaHelper = new MediaEventHelper(this.props.mxEvent);
        }

        this.updateComponentMaps();
    }

    private updateComponentMaps(): void {
        this.bodyTypes = new Map<string, React.ComponentType<IBodyProps>>(baseBodyTypes.entries());
        for (const [bodyType, bodyComponent] of Object.entries(this.props.overrideBodyTypes ?? {})) {
            this.bodyTypes.set(bodyType, bodyComponent);
        }

        this.evTypes = new Map<string, React.ComponentType<IBodyProps>>(baseEvTypes.entries());
        for (const [evType, evComponent] of Object.entries(this.props.overrideEventTypes ?? {})) {
            this.evTypes.set(evType, evComponent);
        }
    }

    public getEventTileOps = (): IEventTileOps | null => {
        return (this.body.current as IOperableEventTile)?.getEventTileOps?.() || null;
    };

    public getMediaHelper(): MediaEventHelper | undefined {
        return this.mediaHelper;
    }

    private onDecrypted = (): void => {
        // Recheck MediaEventHelper eligibility as it can change when the event gets decrypted
        if (MediaEventHelper.isEligible(this.props.mxEvent)) {
            this.mediaHelper?.destroy();
            this.mediaHelper = new MediaEventHelper(this.props.mxEvent);
        }
    };

    private onTileUpdate = (): void => {
        this.forceUpdate();
    };

    public render(): React.ReactNode {
        const content = this.props.mxEvent.getContent();
        const type = this.props.mxEvent.getType();
        const msgtype = content.msgtype;
        let BodyType: React.ComponentType<IBodyProps> = RedactedBodyFactory;
        if (!this.props.mxEvent.isRedacted()) {
            // only resolve BodyType if event is not redacted
            if (this.props.mxEvent.isDecryptionFailure()) {
                BodyType = DecryptionFailureBodyFactory;
            } else if (type && this.evTypes.has(type)) {
                BodyType = this.evTypes.get(type)!;
            } else if (msgtype && this.bodyTypes.has(msgtype)) {
                BodyType = this.bodyTypes.get(msgtype)!;
            } else if (content.url) {
                // Fallback to file body if there's a content URL
                BodyType = this.bodyTypes.get(MsgType.File)!;
            } else {
                // Fallback to UnknownBody otherwise if not redacted
                BodyType = UnknownBody;
            }

            if (
                ((BodyType === ImageBodyFactory || BodyType === VideoBodyFactory) &&
                    !validateImageOrVideoMimetype(content)) ||
                (BodyType === MStickerBody && !validateStickerMimetype(content))
            ) {
                BodyType = this.bodyTypes.get(MsgType.File)!;
            }

            // Telement: round video notes, unless the caller chose how videos render (as reply quotes do)
            if (
                BodyType === VideoBodyFactory &&
                !this.props.overrideBodyTypes?.[MsgType.Video] &&
                isVideoNote(content)
            ) {
                BodyType = VideoNoteBodyFactory;
            }

            // TODO: move to eventTypes when location sharing spec stabilises
            if (M_LOCATION.matches(type) || (type === EventType.RoomMessage && msgtype === MsgType.Location)) {
                BodyType = MLocationBody;
            }
        }

        if (SettingsStore.getValue("feature_mjolnir")) {
            if (!isMjolnirBodyAllowed(this.props.mxEvent)) {
                const userDomain = this.props.mxEvent.getSender()?.split(":").slice(1).join(":");
                const userBanned = Mjolnir.sharedInstance().isUserBanned(this.props.mxEvent.getSender()!);
                const serverBanned = userDomain && Mjolnir.sharedInstance().isServerBanned(userDomain);

                if (userBanned || serverBanned) {
                    BodyType = MjolnirBodyWrappedView;
                }
            }
        }

        const hasCaption =
            [MsgType.Image, MsgType.File, MsgType.Audio, MsgType.Video].includes(msgtype as MsgType) &&
            content.filename &&
            content.filename !== content.body;
        const bodyProps: IBodyProps = {
            ref: this.body,
            mxEvent: this.props.mxEvent,
            highlights: this.props.highlights,
            highlightLink: this.props.highlightLink,
            showUrlPreview: this.props.showUrlPreview,
            forExport: this.props.forExport,
            maxImageHeight: this.props.maxImageHeight,
            replacingEventId: this.props.replacingEventId,
            editState: this.props.editState,
            onMessageAllowed: this.onTileUpdate,
            permalinkCreator: this.props.permalinkCreator,
            mediaEventHelper: this.mediaHelper,
            getRelationsForEvent: this.props.getRelationsForEvent,
            isSeeingThroughMessageHiddenForModeration: this.props.isSeeingThroughMessageHiddenForModeration,
            inhibitInteraction: this.props.inhibitInteraction,
            id: this.props.id,
        };
        if (hasCaption) {
            return <CaptionBody {...bodyProps} WrappedBodyType={BodyType} />;
        }

        return BodyType ? <BodyType {...bodyProps} /> : null;
    }
}

const CaptionBody: React.FunctionComponent<IBodyProps & { WrappedBodyType: React.ComponentType<IBodyProps> }> = ({
    WrappedBodyType,
    ...props
}) => (
    <div className="mx_EventTile_content">
        <WrappedBodyType {...props} />
        <TextualBodyFactory {...{ ...props, ref: undefined }} />
    </div>
);
