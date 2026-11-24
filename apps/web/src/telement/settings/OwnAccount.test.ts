/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "test-utils-rtl";
import { stubClient } from "test-utils";
import { type IThreepid, type MatrixClient, ThreepidMedium } from "matrix-js-sdk/src/matrix";

import SettingsStore from "../../settings/SettingsStore";
import { UIFeature } from "../../settings/UIFeature";
import { OwnAccount, useAccountManagementUrl, useOwnThreepids } from "./OwnAccount";

const EMAIL: IThreepid = {
    medium: ThreepidMedium.Email,
    address: "alice@example.org",
    validated_at: 1,
    added_at: 1,
};
const PHONE: IThreepid = { medium: ThreepidMedium.Phone, address: "447700900000", validated_at: 1, added_at: 1 };

describe("OwnAccount", () => {
    let client: MatrixClient;

    beforeEach(() => {
        client = stubClient();
        vi.mocked(client.getThreePids).mockResolvedValue({ threepids: [EMAIL, PHONE] });
        client.getAuthMetadata = vi.fn().mockResolvedValue({ account_management_uri: "https://id.example.org/" });
        vi.mocked(client.isGuest).mockReturnValue(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("is one per client", () => {
        expect(OwnAccount.of(client)).toBe(OwnAccount.of(client));
        expect(OwnAccount.of(stubClient())).not.toBe(OwnAccount.of(client));
    });

    it("loads the addresses, numbers and the account's page as the client starts", async () => {
        const account = OwnAccount.of(client);
        await account.load();

        expect(account.threepids).toEqual([EMAIL, PHONE]);
        expect(account.accountManagementUrl).toBe("https://id.example.org/");
    });

    it("loads nothing for guests, nor addresses where they are turned off", async () => {
        vi.mocked(client.isGuest).mockReturnValue(true);
        await OwnAccount.of(client).load();
        expect(client.getThreePids).not.toHaveBeenCalled();

        vi.mocked(client.isGuest).mockReturnValue(false);
        vi.spyOn(SettingsStore, "getValue").mockImplementation((name) => name !== UIFeature.ThirdPartyID);
        await OwnAccount.of(client).load();
        expect(client.getThreePids).not.toHaveBeenCalled();
        expect(OwnAccount.of(client).accountManagementUrl).toBe("https://id.example.org/");
    });

    it("has no page where the homeserver has none", async () => {
        vi.mocked(client.getAuthMetadata).mockRejectedValue(new Error("M_UNRECOGNIZED"));
        await OwnAccount.of(client).load();

        expect(OwnAccount.of(client).accountManagementUrl).toBeUndefined();
    });

    describe("useOwnThreepids", () => {
        it("has them from the first render once they were loaded", async () => {
            await OwnAccount.of(client).load();
            const renders: unknown[] = [];
            renderHook(() => renders.push(useOwnThreepids(client)));

            expect(renders[0]).toEqual({ emails: [EMAIL], phoneNumbers: [PHONE], state: "loaded" });
        });

        it("is loading until then, then has the latest", async () => {
            const { result } = renderHook(() => useOwnThreepids(client));
            expect(result.current).toEqual({ state: "loading" });

            await act(() => OwnAccount.of(client).refreshThreepids());
            expect(result.current.state).toBe("loaded");

            vi.mocked(client.getThreePids).mockResolvedValue({ threepids: [PHONE] });
            await act(() => OwnAccount.of(client).refreshThreepids());
            expect(result.current).toEqual({ emails: [], phoneNumbers: [PHONE], state: "loaded" });
        });

        it("failed only while there are none to show", async () => {
            vi.mocked(client.getThreePids).mockRejectedValueOnce(new Error("offline"));
            const { result } = renderHook(() => useOwnThreepids(client));
            await act(() => OwnAccount.of(client).refreshThreepids());
            expect(result.current).toEqual({ state: "error" });

            await act(() => OwnAccount.of(client).refreshThreepids());
            vi.mocked(client.getThreePids).mockRejectedValueOnce(new Error("offline"));
            await act(() => OwnAccount.of(client).refreshThreepids());
            expect(result.current.state).toBe("loaded");
        });
    });

    it("useAccountManagementUrl has the page from the first render once it was loaded", async () => {
        await OwnAccount.of(client).load();
        const renders: unknown[] = [];
        renderHook(() => renders.push(useAccountManagementUrl(client)));

        expect(renders[0]).toBe("https://id.example.org/");
    });
});
