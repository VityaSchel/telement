/*
Copyright 2024 New Vector Ltd.
Copyright 2019-2024 The Matrix.org Foundation C.I.C.
Copyright 2019 New Vector Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { ClientEvent, type MatrixEvent } from "matrix-js-sdk/src/matrix";
import { Toast } from "@vector-im/compound-web";
import React, { type JSX, useEffect, useRef, useState } from "react";
import UserProfileIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";
import DevicesIcon from "@vector-im/compound-design-tokens/assets/web/icons/devices";
import ThemeIcon from "@vector-im/compound-design-tokens/assets/web/icons/theme";
import NotificationsIcon from "@vector-im/compound-design-tokens/assets/web/icons/notifications";
import PreferencesIcon from "@vector-im/compound-design-tokens/assets/web/icons/preferences";
import KeyboardIcon from "@vector-im/compound-design-tokens/assets/web/icons/keyboard";
import KeyIcon from "@vector-im/compound-design-tokens/assets/web/icons/key";
import SidebarIcon from "@vector-im/compound-design-tokens/assets/web/icons/sidebar";
import MicOnIcon from "@vector-im/compound-design-tokens/assets/web/icons/mic-on";
import LockIcon from "@vector-im/compound-design-tokens/assets/web/icons/lock";
import LabsIcon from "@vector-im/compound-design-tokens/assets/web/icons/labs";
import BlockIcon from "@vector-im/compound-design-tokens/assets/web/icons/block";
import HelpIcon from "@vector-im/compound-design-tokens/assets/web/icons/help";
import {
    SettingsSearchView,
    ToastContext,
    useActiveToast,
    useCreateAutoDisposedViewModel,
} from "@element-hq/web-shared-components";

import TabbedView, { Tab, useActiveTabWithDefault } from "../../structures/TabbedView";
import { _t, _td } from "../../../languageHandler";
import AccountUserSettingsTab from "../settings/tabs/user/AccountUserSettingsTab";
import SettingsStore from "../../../settings/SettingsStore";
import LabsUserSettingsTab, { showLabsFlags } from "../settings/tabs/user/LabsUserSettingsTab";
import AppearanceUserSettingsTab from "../settings/tabs/user/AppearanceUserSettingsTab";
import SecurityUserSettingsTab from "../settings/tabs/user/SecurityUserSettingsTab";
import NotificationUserSettingsTab from "../settings/tabs/user/NotificationUserSettingsTab";
import PreferencesUserSettingsTab from "../settings/tabs/user/PreferencesUserSettingsTab";
import VoiceUserSettingsTab from "../settings/tabs/user/VoiceUserSettingsTab";
import HelpUserSettingsTab from "../settings/tabs/user/HelpUserSettingsTab";
import MjolnirUserSettingsTab from "../settings/tabs/user/MjolnirUserSettingsTab";
import { UIFeature } from "../../../settings/UIFeature";
import BaseDialog from "./BaseDialog";
import SidebarUserSettingsTab from "../settings/tabs/user/SidebarUserSettingsTab";
import KeyboardUserSettingsTab from "../settings/tabs/user/KeyboardUserSettingsTab";
import SessionManagerTab from "../settings/tabs/user/SessionManagerTab";
import { UserTab } from "./UserTab";
import { type NonEmptyArray } from "../../../@types/common";
import { SDKContext } from "../../../contexts/SDKContext";
import { type SDKContextClass } from "../../../contexts/SDKContextClass";
import { useSettingValue } from "../../../hooks/useSettings";
import { NoChange, useEventEmitterAsyncState, type AsyncStateCallbackResult } from "../../../hooks/useEventEmitter";
import { EncryptionUserSettingsTab, type State } from "../settings/tabs/user/EncryptionUserSettingsTab";
import { SettingsSearchViewModel } from "../../../viewmodels/telement/settings/SettingsSearchViewModel";
import { getSettingsSearchTargets } from "../../../telement/settings/settingsSearchTargets";
import { revealSetting } from "../../../telement/settings/revealSetting";

interface IProps {
    initialTabId?: UserTab;
    showMsc4108QrCode?: boolean;
    /*
     * If true, the Account tab's status control starts in custom status mode,
     * ready for the user to enter a custom status.
     */
    startCustomStatus?: boolean;
    /*
     * The initial state of the Encryption tab.
     * If undefined, the default state is used ("loading").
     */
    initialEncryptionState?: State;
    sdkContext: SDKContextClass;
    onFinished(this: void): void;
}

function titleForTabID(tabId: UserTab): React.ReactNode {
    const subs = {
        strong: (sub: string) => <span className="mx_UserSettingsDialog_title_strong">{sub}</span>,
    };
    switch (tabId) {
        case UserTab.Account:
            return _t("settings|account|dialog_title", undefined, subs);
        case UserTab.SessionManager:
            return _t("settings|sessions|dialog_title", undefined, subs);
        case UserTab.Appearance:
            return _t("settings|appearance|dialog_title", undefined, subs);
        case UserTab.Notifications:
            return _t("settings|notifications|dialog_title", undefined, subs);
        case UserTab.Preferences:
            return _t("settings|preferences|dialog_title", undefined, subs);
        case UserTab.Keyboard:
            return _t("settings|keyboard|dialog_title", undefined, subs);
        case UserTab.Sidebar:
            return _t("settings|sidebar|dialog_title", undefined, subs);
        case UserTab.Voice:
            return _t("settings|voip|dialog_title", undefined, subs);
        case UserTab.Security:
            return _t("settings|security|dialog_title", undefined, subs);
        case UserTab.Encryption:
            return _t("settings|encryption|dialog_title", undefined, subs);
        case UserTab.Labs:
            return _t("settings|labs|dialog_title", undefined, subs);
        case UserTab.Mjolnir:
            return _t("settings|labs_mjolnir|dialog_title", undefined, subs);
        case UserTab.Help:
            return _t("setting|help_about|dialog_title", undefined, subs);
    }
}

export default function UserSettingsDialog(props: IProps): JSX.Element {
    const voipEnabled = useSettingValue(UIFeature.Voip);
    const mjolnirEnabled = useSettingValue("feature_mjolnir");
    // store these props in state as changing tabs back and forth should clear them
    const [showMsc4108QrCode, setShowMsc4108QrCode] = useState(props.showMsc4108QrCode);
    const [initialEncryptionState, setInitialEncryptionState] = useState(props.initialEncryptionState);
    const [startCustomStatus, setStartCustomStatus] = useState(props.startCustomStatus);

    // If the user doesn't have Recovery set up (no default Secret Storage key),
    // we show an indicator on the Encryption tab.
    const showSetupRecoveryIndicator = useEventEmitterAsyncState(
        props.sdkContext.client,
        ClientEvent.AccountData,
        async (event?: MatrixEvent): AsyncStateCallbackResult<boolean> => {
            if (event === undefined || event.getType() === "m.secret_storage.default_key") {
                const client = props.sdkContext.client;
                if (!client) {
                    return false;
                }

                return !(await client.secretStorage.getDefaultKeyId());
            }
            return new NoChange();
        },
        [],
        false,
    );

    const getTabs = (): NonEmptyArray<Tab<UserTab>> => {
        const tabs: Tab<UserTab>[] = [];

        // Telement: Element's tabs in the order of what people look for: the account, notifications, how the app looks
        // and behaves, calls, then privacy, encryption and devices together, then the shortcuts reference, labs and help
        tabs.push(
            new Tab(
                UserTab.Account,
                _td("settings|account|title"),
                <UserProfileIcon />,
                <AccountUserSettingsTab closeSettingsFn={props.onFinished} startCustomStatus={startCustomStatus} />,
            ),
        );
        tabs.push(
            new Tab(
                UserTab.Notifications,
                _td("notifications|enable_prompt_toast_title"),
                <NotificationsIcon />,
                <NotificationUserSettingsTab />,
            ),
        );
        tabs.push(new Tab(UserTab.Appearance, _td("common|appearance"), <ThemeIcon />, <AppearanceUserSettingsTab />));
        tabs.push(new Tab(UserTab.Sidebar, _td("settings|sidebar|title"), <SidebarIcon />, <SidebarUserSettingsTab />));
        tabs.push(
            new Tab(
                UserTab.Preferences,
                _td("common|preferences"),
                <PreferencesIcon />,
                <PreferencesUserSettingsTab />,
            ),
        );

        if (voipEnabled) {
            tabs.push(new Tab(UserTab.Voice, _td("settings|voip|title"), <MicOnIcon />, <VoiceUserSettingsTab />));
        }

        tabs.push(
            new Tab(UserTab.Security, _td("room_settings|security|title"), <LockIcon />, <SecurityUserSettingsTab />),
        );

        tabs.push(
            new Tab(
                UserTab.Encryption,
                _td("settings|encryption|title"),
                <KeyIcon />,
                <EncryptionUserSettingsTab initialState={initialEncryptionState} />,
                showSetupRecoveryIndicator ? "mx_SettingsDialog_tabLabelsAlert" : undefined,
            ),
        );
        tabs.push(
            new Tab(
                UserTab.SessionManager,
                _td("settings|sessions|title"),
                <DevicesIcon />,
                <SessionManagerTab showMsc4108QrCode={showMsc4108QrCode} />,
            ),
        );
        tabs.push(
            new Tab(UserTab.Keyboard, _td("settings|keyboard|title"), <KeyboardIcon />, <KeyboardUserSettingsTab />),
        );

        if (showLabsFlags() || SettingsStore.getFeatureSettingNames().some((k) => SettingsStore.getBetaInfo(k))) {
            tabs.push(new Tab(UserTab.Labs, _td("common|labs"), <LabsIcon />, <LabsUserSettingsTab />));
        }
        if (mjolnirEnabled) {
            tabs.push(new Tab(UserTab.Mjolnir, _td("labs_mjolnir|title"), <BlockIcon />, <MjolnirUserSettingsTab />));
        }
        tabs.push(new Tab(UserTab.Help, _td("setting|help_about|title"), <HelpIcon />, <HelpUserSettingsTab />));

        return tabs as NonEmptyArray<Tab<UserTab>>;
    };

    const [activeTabId, _setActiveTabId] = useActiveTabWithDefault(getTabs(), UserTab.Account, props.initialTabId);
    const setActiveTabId = (tabId: UserTab): void => {
        _setActiveTabId(tabId);
        // Clear these so switching away from the tab and back to it will not show the QR code again
        setShowMsc4108QrCode(false);
        setInitialEncryptionState(undefined);
        setStartCustomStatus(false);
    };

    // Telement: search in settings, as in Telegram's. Choosing a result opens its tab and shows the setting there
    const tabs = getTabs();
    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;
    const stopRevealing = useRef<() => void>(undefined);
    const searchVm = useCreateAutoDisposedViewModel(
        () =>
            new SettingsSearchViewModel({
                getTargets: () => getSettingsSearchTargets(tabsRef.current),
                onChoose: (target) => {
                    setActiveTabId(target.tabId as UserTab);
                    stopRevealing.current?.();
                    stopRevealing.current = revealSetting(target.tabId, target.group, target.label);
                },
            }),
    );
    useEffect(() => () => stopRevealing.current?.(), []);

    const [activeToast, toastRack] = useActiveToast();

    return (
        // XXX: SDKContext is provided within the LoggedInView subtree.
        // Modals function outside the MatrixChat React tree, so sdkContext is reprovided here to simulate that.
        // The longer term solution is to move our ModalManager into the React tree to inherit contexts properly.
        <SDKContext.Provider value={props.sdkContext}>
            <ToastContext.Provider value={toastRack}>
                <BaseDialog
                    className="mx_UserSettingsDialog"
                    hasCancel={true}
                    onFinished={props.onFinished}
                    title={titleForTabID(activeTabId)}
                    titleClass="mx_UserSettingsDialog_title"
                >
                    <div className="mx_SettingsDialog_content">
                        <TabbedView
                            tabs={tabs}
                            activeTabId={activeTabId}
                            onChange={setActiveTabId}
                            responsive={true}
                            tabsHeader={<SettingsSearchView vm={searchVm} />}
                        />
                    </div>
                    <div className="mx_SettingsDialog_toastContainer">
                        {activeToast && <Toast>{activeToast}</Toast>}
                    </div>
                </BaseDialog>
            </ToastContext.Provider>
        </SDKContext.Provider>
    );
}
