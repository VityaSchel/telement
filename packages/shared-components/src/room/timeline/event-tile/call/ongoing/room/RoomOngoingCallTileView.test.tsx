/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { composeStories } from "@storybook/react-vite";
import { beforeAll, describe, expect, it } from "vitest";
import React from "react";
import { render } from "@test-utils";

import * as Stories from "./RoomOngoingCallTileView.stories";
import { loadAvatarPhotos } from "../../../../../../telement/core/Avatar/loadAvatarPhotos";
import profileLink1 from "../../../../../../../static/profile-pics/profile1.png";
import profileLink2 from "../../../../../../../static/profile-pics/profile2.png";
import profileLink3 from "../../../../../../../static/profile-pics/profile3.png";

const { RoomCallIgnored, RoomCallJoined, RoomCallWithoutOtherParticipants } = composeStories(Stories);

describe("RoomOngoingCallTileView", () => {
    // Avatars show their letter until their photo has loaded, so the snapshots load the photos first
    beforeAll(() => loadAvatarPhotos(profileLink1, profileLink2, profileLink3));

    describe("renders the tile", () => {
        it("RoomCallIgnored", () => {
            const { container } = render(<RoomCallIgnored />);
            expect(container).toMatchSnapshot();
        });

        it("RoomCallJoined", () => {
            const { container } = render(<RoomCallJoined />);
            expect(container).toMatchSnapshot();
        });

        it("RoomCallWithoutOtherParticipants", () => {
            const { container } = render(<RoomCallWithoutOtherParticipants />);
            expect(container).toMatchSnapshot();
        });
    });
});
