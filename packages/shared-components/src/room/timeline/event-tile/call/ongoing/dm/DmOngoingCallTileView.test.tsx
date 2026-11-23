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

import * as Stories from "./DmOngoingCallTileView.stories";
import { loadAvatarPhotos } from "../../../../../../telement/core/Avatar/loadAvatarPhotos";
import profileLink1 from "../../../../../../../static/profile-pics/profile1.png";
import profileLink2 from "../../../../../../../static/profile-pics/profile2.png";

const {
    IncomingVideoCall,
    IncomingVoiceCall,
    OutgoingVideoCall,
    OutgoingVoiceCall,
    VideoCallInProgress,
    VoiceCallInProgress,
} = composeStories(Stories);

describe("DmOngoingCallTileView", () => {
    // Avatars show their letter until their photo has loaded, so the snapshots load the photos first
    beforeAll(() => loadAvatarPhotos(profileLink1, profileLink2));

    describe("renders the tile", () => {
        it("IncomingVideoCall", () => {
            const { container } = render(<IncomingVideoCall />);
            expect(container).toMatchSnapshot();
        });

        it("IncomingVoiceCall", () => {
            const { container } = render(<IncomingVoiceCall />);
            expect(container).toMatchSnapshot();
        });

        it("OutgoingVideoCall", () => {
            const { container } = render(<OutgoingVideoCall />);
            expect(container).toMatchSnapshot();
        });

        it("OutgoingVoiceCall", () => {
            const { container } = render(<OutgoingVoiceCall />);
            expect(container).toMatchSnapshot();
        });

        it("VoiceCallInProgress", () => {
            const { container } = render(<VoiceCallInProgress />);
            expect(container).toMatchSnapshot();
        });

        it("VideoCallInProgress", () => {
            const { container } = render(<VideoCallInProgress />);
            expect(container).toMatchSnapshot();
        });
    });
});
