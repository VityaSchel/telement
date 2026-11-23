/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type ComponentType, type JSX } from "react";
import classNames from "classnames";
import { Button, IconButton, Tooltip } from "@vector-im/compound-web";
import {
    AttachmentIcon,
    DownloadIcon,
    ExpandIcon,
    VideoCallSolidIcon,
    VolumeOnSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import styles from "./FileBodyView.module.css";
import { type ViewModel } from "../../../../../core/viewmodel/ViewModel";
import { useViewModel } from "../../../../../core/viewmodel/useViewModel";
import { useI18n } from "../../../../../core/i18n/i18nContext";
import { MediaBody } from "../MediaBody";

/**
 * Which visual state to render for the component.
 */
export enum FileBodyViewState {
    /** Export-only rendering where the info row links to the source file. */
    EXPORT = "EXPORT",
    /** Encrypted file. */
    ENCRYPTED = "ENCRYPTED",
    /** Unencrypted file. */
    UNENCRYPTED = "UNENCRYPTED",
    /** Fallback for missing or unusable file metadata. */
    INVALID = "INVALID",
}

/**
 * Which info icon to render.
 */
export enum FileBodyViewInfoIcon {
    ATTACHMENT = "ATTACHMENT",
    AUDIO = "AUDIO",
    DOWNLOAD = "DOWNLOAD",
    VIDEO = "VIDEO",
}

export interface FileBodyViewSnapshot {
    /**
     * Primary rendering branch for the component.
     * Controls the overall state (export, encrypted, unencrypted, invalid).
     */
    state: FileBodyViewState;
    /**
     * Whether to render the info row (icon + label + tooltip).
     */
    showInfo?: boolean;
    /**
     * Optional info label (normally the file name). Defaults to 'Attachment'.
     */
    infoLabel?: string;
    /**
     * Optional tooltip for info button. Defaults to infoLabel.
     */
    infoTooltip?: string;
    /**
     * Optional icon. Defaults to `ATTACHMENT`.
     */
    infoIcon?: FileBodyViewInfoIcon;
    /**
     * Optional URL used by the info row in `EXPORT`.
     */
    infoHref?: string;
    /**
     * Optional label of the download control in the info row. Defaults to 'Download'.
     */
    downloadLabel?: string;
    /**
     * Whether to render a control, inside the info row, that opens the file in a viewer. Only set for
     * file types the host knows how to display, so no action icons appear by default.
     */
    showOpen?: boolean;
    /**
     * Label for the open control, used as its accessible name and its tooltip. Required in practice
     * whenever `showOpen` is set, since the view has no sensible generic wording for "open this
     * particular kind of file".
     */
    openLabel?: string;
    /**
     * Whether to render a download control inside the info row. Set alongside {@link showOpen} so that
     * downloading stays visible as an explicit action once the row has an action for opening.
     */
    showInlineDownload?: boolean;
}

export interface FileBodyViewActions {
    /**
     * Click handler for the info row and its download control.
     */
    onInfoClick?: () => void;
    /**
     * Click handler for the open-in-viewer button.
     */
    onOpenClick?: () => void;
}

/**
 * The view model for the control.
 */
export type FileBodyViewModel = ViewModel<FileBodyViewSnapshot> & FileBodyViewActions;

interface FileBodyViewProps {
    /**
     * The view model for the component.
     */
    vm: FileBodyViewModel;

    /**
     * Optional CSS class for host-level styling.
     */
    className?: string;
}

/**
 * Create the correct icon to render in the view
 */
function getInfoIcon(infoIcon?: FileBodyViewInfoIcon): ComponentType<React.SVGAttributes<SVGElement>> {
    if (infoIcon === FileBodyViewInfoIcon.AUDIO) {
        return VolumeOnSolidIcon;
    } else if (infoIcon === FileBodyViewInfoIcon.DOWNLOAD) {
        return DownloadIcon;
    } else if (infoIcon === FileBodyViewInfoIcon.VIDEO) {
        return VideoCallSolidIcon;
    }
    return AttachmentIcon;
}

/**
 * Renders the body of a file message: its info row, which links to the source file in an export (`EXPORT`), or a
 * message for a file it can't use (`INVALID`).
 *
 * Visibility and content of the info row are driven by the snapshot's `showInfo`, `infoLabel`, `infoTooltip`,
 * `infoIcon` and `infoHref`, and its actions by `showOpen`, `openLabel`, `showInlineDownload` and `downloadLabel`.
 * Telement has no download control under the row: the message menu's "Save as…" saves the file.
 *
 * @example
 * ```tsx
 * <FileBodyView vm={fileBodyViewModel} />
 * ```
 */
export function FileBodyView({ vm, className }: Readonly<FileBodyViewProps>): JSX.Element {
    const { translate: _t } = useI18n();

    const {
        state,
        showInfo,
        infoLabel,
        infoTooltip,
        infoIcon,
        infoHref,
        downloadLabel,
        showOpen,
        openLabel,
        showInlineDownload,
    } = useViewModel(vm);

    const resolvedInfoLabel = infoLabel ?? _t("common|attachment");
    const resolvedInfoTooltip = infoTooltip ?? resolvedInfoLabel;
    const resolvedInfoIcon = getInfoIcon(infoIcon);

    const resolvedDownloadLabel = downloadLabel ?? _t("action|download");

    const infoButton = (
        <Button
            as="button"
            size="md"
            kind="secondary"
            aria-label={resolvedInfoLabel}
            Icon={resolvedInfoIcon}
            onClick={vm.onInfoClick}
        >
            <span>{resolvedInfoLabel}</span>
        </Button>
    );

    // Actions that live inside the info row, to the right of the file name. Absent unless the view
    // model asks for them, which keeps the row exactly as it was for file types we cannot open.
    const infoActions =
        showInlineDownload || (showOpen && openLabel) ? (
            <div data-type="actions">
                {showInlineDownload && (
                    <IconButton
                        size="28px"
                        kind="secondary"
                        aria-label={resolvedDownloadLabel}
                        tooltip={resolvedDownloadLabel}
                        onClick={vm.onInfoClick}
                    >
                        <DownloadIcon />
                    </IconButton>
                )}
                {showOpen && openLabel && (
                    <IconButton
                        size="28px"
                        kind="secondary"
                        aria-label={openLabel}
                        tooltip={openLabel}
                        onClick={vm.onOpenClick}
                    >
                        <ExpandIcon />
                    </IconButton>
                )}
            </div>
        ) : null;

    // With actions present the tooltip moves onto the name itself, so that hovering an action shows
    // that action's tooltip rather than the file name's.
    const infoRow = infoActions ? (
        <MediaBody data-type="info">
            <Tooltip description={resolvedInfoTooltip} placement="right">
                {infoButton}
            </Tooltip>
            {infoActions}
        </MediaBody>
    ) : (
        <Tooltip description={resolvedInfoTooltip} placement="right">
            <MediaBody data-type="info">{infoButton}</MediaBody>
        </Tooltip>
    );

    const info = showInfo ? infoRow : null;

    const classes = classNames(styles.content, className);

    switch (state) {
        case FileBodyViewState.EXPORT:
            return (
                <span className={classes}>
                    <a href={infoHref}>{info}</a>
                </span>
            );

        case FileBodyViewState.ENCRYPTED:
        case FileBodyViewState.UNENCRYPTED:
            return <span className={classes}>{info}</span>;

        case FileBodyViewState.INVALID:
        default:
            return (
                <>
                    <span className={classes}>{info}</span>
                    <span className={classNames(classes, styles.invalid)}>{_t("timeline|m.file|error_invalid")}</span>
                </>
            );
    }
}
