/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type IThreepid, type MatrixClient, ThreepidMedium, TypedEventEmitter } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import SettingsStore from "../../settings/SettingsStore";
import { UIFeature } from "../../settings/UIFeature";
import { useTypedEventEmitterState } from "../../hooks/useEventEmitter";

enum OwnAccountEvent {
    Update = "update",
}

type OwnAccountEventHandlerMap = {
    [OwnAccountEvent.Update]: () => void;
};

/**
 * What the homeserver keeps of the user's account besides the profile (OwnProfileStore): the email addresses and phone
 * numbers, and the page the account is managed on, if it has one. It is loaded as the client starts and kept, so that the
 * Account tab of the settings opens with it rather than waiting for the server, and is told of by one object, which the
 * tab listens to.
 */
export class OwnAccount extends TypedEventEmitter<OwnAccountEvent, OwnAccountEventHandlerMap> {
    private static readonly accounts = new WeakMap<MatrixClient, OwnAccount>();

    /** The email addresses and phone numbers, or `undefined` until they were loaded. */
    public threepids?: IThreepid[];
    /** Whether they couldn't be loaded. */
    public threepidsFailed = false;
    /** The page the account is managed on, if the homeserver has one. */
    public accountManagementUrl?: string;

    private constructor(private readonly client: MatrixClient) {
        super();
    }

    /** The account of the client's user. */
    public static of(client: MatrixClient): OwnAccount {
        let account = OwnAccount.accounts.get(client);
        if (!account) {
            account = new OwnAccount(client);
            OwnAccount.accounts.set(client, account);
        }
        return account;
    }

    /** Loads everything, as the client starts. */
    public async load(): Promise<void> {
        if (this.client.isGuest()) return;
        await Promise.all([this.refreshThreepids(), this.refreshAccountManagementUrl()]);
    }

    /** Loads the email addresses and phone numbers. Those loaded before stay until then, and if it fails. */
    public refreshThreepids = async (): Promise<void> => {
        if (!SettingsStore.getValue(UIFeature.ThirdPartyID)) return;

        try {
            this.threepids = (await this.client.getThreePids()).threepids;
            this.threepidsFailed = false;
        } catch (e) {
            logger.warn("Failed to load the account's email addresses and phone numbers", e);
            this.threepidsFailed = true;
        }
        this.emit(OwnAccountEvent.Update);
    };

    /** Loads the page the account is managed on. */
    public refreshAccountManagementUrl = async (): Promise<void> => {
        try {
            this.accountManagementUrl = (await this.client.getAuthMetadata()).account_management_uri;
        } catch {
            // The homeserver has none
            this.accountManagementUrl = undefined;
        }
        this.emit(OwnAccountEvent.Update);
    };
}

/** A part of the account, kept up to date. */
function useOwnAccount<T>(client: MatrixClient, get: (account: OwnAccount) => T): T {
    const account = OwnAccount.of(client);
    return useTypedEventEmitterState(account, OwnAccountEvent.Update, () => get(account));
}

/** The page the user's account is managed on, if the homeserver has one. */
export function useAccountManagementUrl(client: MatrixClient): string | undefined {
    return useOwnAccount(client, (account) => account.accountManagementUrl);
}

interface OwnThreepids {
    emails?: IThreepid[];
    phoneNumbers?: IThreepid[];
    /** Whether they are shown, are yet to be loaded, or couldn't be. */
    state: "loading" | "loaded" | "error";
}

/** The user's email addresses and phone numbers. */
export function useOwnThreepids(client: MatrixClient): OwnThreepids {
    const threepids = useOwnAccount(client, (account) => account.threepids);
    const failed = useOwnAccount(client, (account) => account.threepidsFailed);

    if (!threepids) return { state: failed ? "error" : "loading" };
    return {
        emails: threepids.filter(({ medium }) => medium === ThreepidMedium.Email),
        phoneNumbers: threepids.filter(({ medium }) => medium === ThreepidMedium.Phone),
        state: "loaded",
    };
}
