/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import mime from "mime";
import { logger } from "matrix-js-sdk/src/logger";
import { type IContent } from "matrix-js-sdk/src/matrix";

/*
 * Moved out of MessageEvent, which shows media that fails these checks as a file, so that the event tile's view
 * model can tell whether a picture or video will actually be shown.
 */

/**
 * Parses and returns the the major part of a mimetype(before the "/").
 * @param mimetype As optional mimetype string to parse
 * @returns The major part of the mimetype string or undefined
 */
function parseMajorMimetype(mimetype?: string): string | undefined {
    return mimetype?.split("/")[0];
}

/**
 * Validates that the major part of a mimetime from an allowed list.
 * @param mimetype The mimetype to validate
 * @param allowedMajorMimeTypes The list of allowed major mimetimes
 * @returns A boolean indicating whether the validation passed
 */
function validateAllowedMimetype(mimetype: string, allowedMajorMimeTypes: string[]): boolean {
    const majorMimetype = parseMajorMimetype(mimetype);
    return !!majorMimetype && allowedMajorMimeTypes.includes(majorMimetype);
}

/**
 *  For image/video messages or stickers that have a thumnail mimetype specified,
 *  validates that the major mimetime is image.
 * @param content The mxEvent content of the message
 * @returns A boolean indicating whether the validation passed
 */
function validateThumbnailMimetype(content: IContent): boolean {
    const thumbnailMimetype = content.info?.thumbnail_info?.mimetype;
    return !thumbnailMimetype || validateAllowedMimetype(thumbnailMimetype, ["image"]);
}

/**
 *  Validates that the filename extension and advertised mimetype
 *  of the supplied image/file message content match and are actuallly video/image content.
 *  For image/video messages with a thumbnail it also validates the mimetype is an image.
 * @param content The mxEvent content of the message
 * @returns A boolean indicating whether the validation passed
 */
export function validateImageOrVideoMimetype(content: IContent): boolean {
    // As per the spec if filename is not present the body represents the filename
    const filename = content.filename ?? content.body;
    if (!filename) {
        logger.log("Failed to validate image/video content, filename null");
        return false;
    }
    // Check mimetype of the thumbnail
    if (!validateThumbnailMimetype(content)) {
        logger.log("Failed to validate file/image thumbnail");
        return false;
    }

    // if there is no mimetype from the extesion or the mimetype is not image/video validation fails
    const typeFromExtension = mime.getType(filename) ?? undefined;
    const extensionMajorMimetype = parseMajorMimetype(typeFromExtension);
    if (!typeFromExtension || !validateAllowedMimetype(typeFromExtension, ["image", "video"])) {
        logger.log("Failed to validate image/video content, invalid or missing extension");
        return false;
    }

    // if the content mimetype is set check it is an image/video and that it matches the extesion mimetype otherwise validation fails
    const contentMimetype = content.info?.mimetype;
    if (contentMimetype) {
        const contentMajorMimetype = parseMajorMimetype(contentMimetype);
        if (
            !validateAllowedMimetype(contentMimetype, ["image", "video"]) ||
            extensionMajorMimetype !== contentMajorMimetype
        ) {
            logger.log("Failed to validate image/video content, invalid or missing mimetype");
            return false;
        }
    }
    return true;
}

/**
 *  Validates that the advertised mimetype of the sticker content
 *  is an image.
 *  For stickers with a thumbnail it also validates the mimetype is an image.
 * @param content The mxEvent content of the message
 * @returns A boolean indicating whether the validation passed
 */
export function validateStickerMimetype(content: IContent): boolean {
    // Validate mimetype of the thumbnail
    const thumbnailResult = validateThumbnailMimetype(content);
    if (!thumbnailResult) {
        logger.log("Failed to validate sticker thumbnail");
        return false;
    }
    // Validate mimetype of the content info is valid if it is set
    const contentMimetype = content.info?.mimetype;
    if (contentMimetype && !validateAllowedMimetype(contentMimetype, ["image"])) {
        logger.log("Failed to validate image/video content, invalid or missing mimetype/extensions");
        return false;
    }
    return true;
}
