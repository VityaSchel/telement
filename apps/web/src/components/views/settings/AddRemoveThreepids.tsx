/*
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode, useCallback, useId, useRef, useState } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import {
    type IRequestMsisdnTokenResponse,
    type IRequestTokenResponse,
    MatrixError,
    ThreepidMedium,
} from "matrix-js-sdk/src/matrix";
import { emailLooksValid } from "@element-hq/element-web-shared-utils";
import { ActionRowView, DialogFooterButton, DialogFooterView, ValueRowList } from "@element-hq/web-shared-components";
import PlusIcon from "@vector-im/compound-design-tokens/assets/web/icons/plus";

import AddThreepid, { type Binding, type ThirdPartyIdentifier } from "../../../AddThreepid";
import { _t, UserFriendlyError } from "../../../languageHandler";
import AccessibleButton, { type ButtonEvent } from "../elements/AccessibleButton";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import Modal from "../../../Modal";
import ErrorDialog, { extractErrorMessageFromError } from "../dialogs/ErrorDialog";
import Field from "../elements/Field";
import CountryDropdown from "../auth/CountryDropdown";
import { type PhoneNumberCountryDefinition } from "../../../phonenumber";
import InlineSpinner from "../elements/InlineSpinner";

// Whether we're adding 3pids to the user's account on the homeserver or sharing them on an identity server
type TheepidControlMode = "hs" | "is";

/** An email address, or a phone number in the international format, which the homeserver keeps without its plus. */
function formatThreepid({ medium, address }: Pick<ThirdPartyIdentifier, "medium" | "address">): string {
    return medium === ThreepidMedium.Phone && !address.startsWith("+") ? `+${address}` : address;
}

interface ThreepidRowProps {
    /** The address or number, or what is asked about it. */
    children: ReactNode;
    textId?: string;
    /** What state it is in, in secondary text under it. */
    description?: ReactNode;
    /** The row's text buttons. */
    actions?: ReactNode;
}

/**
 * Telement: an address as a settings row, as Telegram lists a phone number: the address at the start, over its state, and
 * text buttons for what can be done with it at the end, their labels on the card's edge.
 */
const ThreepidRow: React.FC<ThreepidRowProps> = ({ children, textId, description, actions }) => (
    <div className="mx_AddRemoveThreepids_row">
        <div className="mx_AddRemoveThreepids_row_text">
            <span id={textId}>{children}</span>
            {description && <span className="mx_AddRemoveThreepids_row_description">{description}</span>}
        </div>
        {actions && <DialogFooterView className="mx_AddRemoveThreepids_row_actions">{actions}</DialogFooterView>}
    </div>
);

interface ExistingThreepidProps {
    mode: TheepidControlMode;
    threepid: ThirdPartyIdentifier;
    onChange: (threepid: ThirdPartyIdentifier) => void;
    disabled?: boolean;
}

const ExistingThreepid: React.FC<ExistingThreepidProps> = ({ mode, threepid, onChange, disabled }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    // Whether the row was asking to confirm, so that Remove takes the focus back from Cancel
    const [wasConfirming, setWasConfirming] = useState(false);
    const textId = useId();
    const client = useMatrixClientContext();
    const bindTask = useRef<AddThreepid>(undefined);

    const [isVerifyingBind, setIsVerifyingBind] = useState(false);
    const [continueDisabled, setContinueDisabled] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");

    const onRemoveClick = useCallback((e: ButtonEvent) => {
        e.stopPropagation();
        e.preventDefault();

        setIsConfirming(true);
    }, []);

    const onCancelClick = useCallback((e: ButtonEvent) => {
        e.stopPropagation();
        e.preventDefault();

        setIsConfirming(false);
        setWasConfirming(true);
    }, []);

    const onConfirmRemoveClick = useCallback(
        (e: ButtonEvent) => {
            e.stopPropagation();
            e.preventDefault();

            client
                .deleteThreePid(threepid.medium, threepid.address)
                .then(() => {
                    return onChange(threepid);
                })
                .catch((err) => {
                    logger.error("Unable to remove contact information: " + err);
                    Modal.createDialog(ErrorDialog, {
                        title: _t("settings|general|error_remove_3pid"),
                        description: err?.message ?? _t("invite|failed_generic"),
                    });
                });
        },
        [client, threepid, onChange],
    );

    const changeBinding = useCallback(
        async ({ bind, label, errorTitle }: Binding) => {
            try {
                if (bind) {
                    bindTask.current = new AddThreepid(client);
                    setContinueDisabled(true);
                    if (threepid.medium === ThreepidMedium.Email) {
                        await bindTask.current.bindEmailAddress(threepid.address);
                    } else {
                        // XXX: Sydent will accept a number without country code if you add
                        // a leading plus sign to a number in E.164 format (which the 3PID
                        // address is), but this goes against the spec.
                        // See https://github.com/matrix-org/matrix-doc/issues/2222
                        await bindTask.current.bindMsisdn(null as unknown as string, `+${threepid.address}`);
                    }
                    setContinueDisabled(false);
                    setIsVerifyingBind(true);
                } else {
                    await client.unbindThreePid(threepid.medium, threepid.address);
                    onChange(threepid);
                }
            } catch (err) {
                logger.error(`changeBinding: Unable to ${label} email address ${threepid.address}`, err);
                setIsVerifyingBind(false);
                setContinueDisabled(false);
                bindTask.current = undefined;
                Modal.createDialog(ErrorDialog, {
                    title: errorTitle,
                    description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
                });
            }
        },
        [client, threepid, onChange],
    );

    const onRevokeClick = useCallback(
        (e: ButtonEvent): void => {
            e.stopPropagation();
            e.preventDefault();
            void changeBinding({
                bind: false,
                label: "revoke",
                errorTitle:
                    threepid.medium === "email"
                        ? _t("settings|general|error_revoke_email_discovery")
                        : _t("settings|general|error_revoke_msisdn_discovery"),
            });
        },
        [changeBinding, threepid.medium],
    );

    const onShareClick = useCallback(
        (e: ButtonEvent): void => {
            e.stopPropagation();
            e.preventDefault();
            void changeBinding({
                bind: true,
                label: "share",
                errorTitle:
                    threepid.medium === "email"
                        ? _t("settings|general|error_share_email_discovery")
                        : _t("settings|general|error_share_msisdn_discovery"),
            });
        },
        [changeBinding, threepid.medium],
    );

    const onContinueClick = useCallback(
        async (e: ButtonEvent) => {
            e.stopPropagation();
            e.preventDefault();

            setContinueDisabled(true);
            try {
                if (threepid.medium === ThreepidMedium.Email) {
                    await bindTask.current?.checkEmailLinkClicked();
                } else {
                    await bindTask.current?.haveMsisdnToken(verificationCode);
                }
                setIsVerifyingBind(false);
                onChange(threepid);
                bindTask.current = undefined;
            } catch (err) {
                logger.error(`Unable to verify threepid:`, err);

                let underlyingError = err;
                if (err instanceof UserFriendlyError) {
                    underlyingError = err.cause;
                }

                if (underlyingError instanceof MatrixError && underlyingError.errcode === "M_THREEPID_AUTH_FAILED") {
                    Modal.createDialog(ErrorDialog, {
                        title:
                            threepid.medium === "email"
                                ? _t("settings|general|email_not_verified")
                                : _t("settings|general|error_msisdn_verification"),
                        description:
                            threepid.medium === "email"
                                ? _t("settings|general|email_verification_instructions")
                                : extractErrorMessageFromError(err, _t("invite|failed_generic")),
                    });
                } else {
                    logger.error("Unable to verify email address: " + err);
                    Modal.createDialog(ErrorDialog, {
                        title: _t("settings|general|error_email_verification"),
                        description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
                    });
                }
            } finally {
                setContinueDisabled(false);
            }
        },
        [verificationCode, onChange, threepid],
    );

    const onVerificationCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setVerificationCode(e.target.value);
    }, []);

    const address = formatThreepid(threepid);

    if (isConfirming) {
        return (
            // Cancel is where Remove was, so that clicking twice doesn't remove the address
            <ThreepidRow
                actions={
                    <>
                        <DialogFooterButton destructive onClick={onConfirmRemoveClick}>
                            {_t("action|remove")}
                        </DialogFooterButton>
                        <DialogFooterButton autoFocus onClick={onCancelClick}>
                            {_t("action|cancel")}
                        </DialogFooterButton>
                    </>
                }
            >
                {threepid.medium === ThreepidMedium.Email
                    ? _t("settings|general|remove_email_prompt", { email: address })
                    : _t("settings|general|remove_msisdn_prompt", { phone: address })}
            </ThreepidRow>
        );
    }

    if (isVerifyingBind) {
        if (threepid.medium === ThreepidMedium.Email) {
            return (
                <ThreepidRow
                    description={_t("settings|general|discovery_email_verification_instructions")}
                    actions={
                        <DialogFooterButton onClick={onContinueClick} disabled={continueDisabled}>
                            {_t("action|complete")}
                        </DialogFooterButton>
                    }
                >
                    {address}
                </ThreepidRow>
            );
        } else {
            return (
                <>
                    <ThreepidRow description={_t("settings|general|msisdn_verification_instructions")}>
                        {address}
                    </ThreepidRow>
                    <form
                        className="mx_AddRemoveThreepids_code"
                        onSubmit={onContinueClick}
                        autoComplete="off"
                        noValidate={true}
                    >
                        <Field
                            type="text"
                            label={_t("settings|general|msisdn_verification_field_label")}
                            autoComplete="off"
                            disabled={continueDisabled}
                            value={verificationCode}
                            onChange={onVerificationCodeChange}
                        />
                    </form>
                </>
            );
        }
    }

    return (
        <ThreepidRow
            textId={textId}
            actions={
                <DialogFooterButton
                    onClick={mode === "hs" ? onRemoveClick : threepid.bound ? onRevokeClick : onShareClick}
                    destructive={mode === "hs" || threepid.bound}
                    disabled={disabled}
                    autoFocus={wasConfirming}
                    aria-describedby={textId}
                >
                    {mode === "hs" ? _t("action|remove") : threepid.bound ? _t("action|revoke") : _t("action|share")}
                </DialogFooterButton>
            }
        >
            {address}
        </ThreepidRow>
    );
};

function isMsisdnResponse(
    resp: IRequestTokenResponse | IRequestMsisdnTokenResponse,
): resp is IRequestMsisdnTokenResponse {
    return (resp as IRequestMsisdnTokenResponse).msisdn !== undefined;
}

const AddThreepidSection: React.FC<{ medium: "email" | "msisdn"; disabled?: boolean; onChange: () => void }> = ({
    medium,
    disabled,
    onChange,
}) => {
    const addTask = useRef<AddThreepid>(undefined);
    const [newThreepidInput, setNewThreepidInput] = useState("");
    const [phoneCountryInput, setPhoneCountryInput] = useState("");
    const [verificationCodeInput, setVerificationCodeInput] = useState("");
    // Telement: the form opens from a row, which takes the focus back when the form is cancelled
    const [isOpen, setIsOpen] = useState(false);
    const [wasCancelled, setWasCancelled] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [continueDisabled, setContinueDisabled] = useState(false);
    const [sentToMsisdn, setSentToMsisdn] = useState("");

    const client = useMatrixClientContext();

    const onPhoneCountryChanged = useCallback((country: PhoneNumberCountryDefinition) => {
        setPhoneCountryInput(country.iso2);
    }, []);

    const onContinueClick = useCallback(
        (e: ButtonEvent) => {
            e.stopPropagation();
            e.preventDefault();

            if (!addTask.current) return;

            setContinueDisabled(true);

            const checkPromise =
                medium === "email"
                    ? addTask.current?.checkEmailLinkClicked()
                    : addTask.current?.haveMsisdnToken(verificationCodeInput);
            checkPromise
                .then(([finished]) => {
                    if (finished) {
                        addTask.current = undefined;
                        setIsOpen(false);
                        setWasCancelled(false);
                        setIsVerifying(false);
                        setNewThreepidInput("");
                        setVerificationCodeInput("");
                        onChange();
                    }
                    setContinueDisabled(false);
                })
                .catch((err) => {
                    logger.error("Unable to verify 3pid: ", err);

                    setContinueDisabled(false);

                    let underlyingError = err;
                    if (err instanceof UserFriendlyError) {
                        underlyingError = err.cause;
                    }

                    if (
                        underlyingError instanceof MatrixError &&
                        underlyingError.errcode === "M_THREEPID_AUTH_FAILED"
                    ) {
                        Modal.createDialog(ErrorDialog, {
                            title:
                                medium === "email"
                                    ? _t("settings|general|email_not_verified")
                                    : _t("settings|general|error_msisdn_verification"),
                            description: _t("settings|general|email_verification_instructions"),
                        });
                    } else {
                        Modal.createDialog(ErrorDialog, {
                            title:
                                medium == "email"
                                    ? _t("settings|general|error_email_verification")
                                    : _t("settings|general|error_msisdn_verification"),
                            description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
                        });
                    }
                });
        },
        [onChange, medium, verificationCodeInput],
    );

    const onOpenClick = useCallback(() => {
        setIsOpen(true);
    }, []);

    const onCancelClick = useCallback((e: ButtonEvent) => {
        e.stopPropagation();
        e.preventDefault();

        addTask.current = undefined;
        setIsOpen(false);
        setWasCancelled(true);
        setIsVerifying(false);
        setContinueDisabled(false);
        setNewThreepidInput("");
        setVerificationCodeInput("");
    }, []);

    const onNewThreepidInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setNewThreepidInput(e.target.value);
    }, []);

    const onAddClick = useCallback(
        (e: React.FormEvent) => {
            e.stopPropagation();
            e.preventDefault();

            if (!newThreepidInput) return;

            // TODO: Inline field validation
            if (medium === "email" && !emailLooksValid(newThreepidInput)) {
                Modal.createDialog(ErrorDialog, {
                    title: _t("settings|general|error_invalid_email"),
                    description: _t("settings|general|error_invalid_email_detail"),
                });
                return;
            }

            addTask.current = new AddThreepid(client);
            setIsVerifying(true);
            setContinueDisabled(true);

            const addPromise =
                medium === "email"
                    ? addTask.current.addEmailAddress(newThreepidInput)
                    : addTask.current.addMsisdn(phoneCountryInput, newThreepidInput);

            addPromise
                .then((resp: IRequestTokenResponse | IRequestMsisdnTokenResponse) => {
                    setContinueDisabled(false);
                    if (isMsisdnResponse(resp)) {
                        setSentToMsisdn(resp.msisdn);
                    }
                })
                .catch((err) => {
                    logger.error(`Unable to add threepid ${newThreepidInput}`, err);
                    setIsVerifying(false);
                    setContinueDisabled(false);
                    addTask.current = undefined;
                    Modal.createDialog(ErrorDialog, {
                        title: medium === "email" ? _t("settings|general|error_add_email") : _t("common|error"),
                        description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
                    });
                });
        },
        [client, phoneCountryInput, newThreepidInput, medium],
    );

    const onVerificationCodeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setVerificationCodeInput(e.target.value);
    }, []);

    const cancelButton = (
        <AccessibleButton onClick={onCancelClick} kind="primary_outline">
            {_t("action|cancel")}
        </AccessibleButton>
    );

    if (isVerifying && medium === "email") {
        return (
            <>
                <ThreepidRow description={_t("common|unverified")}>{newThreepidInput}</ThreepidRow>
                <div className="mx_AddRemoveThreepids_add">
                    <div>{_t("settings|general|add_email_instructions")}</div>
                    <div className="mx_AddRemoveThreepids_buttons">
                        {cancelButton}
                        <AccessibleButton onClick={onContinueClick} kind="primary" disabled={continueDisabled}>
                            {_t("action|continue")}
                        </AccessibleButton>
                    </div>
                </div>
            </>
        );
    } else if (isVerifying) {
        return (
            <>
                <ThreepidRow description={_t("common|unverified")}>
                    {sentToMsisdn
                        ? formatThreepid({ medium: ThreepidMedium.Phone, address: sentToMsisdn })
                        : newThreepidInput}
                </ThreepidRow>
                <form
                    className="mx_AddRemoveThreepids_add"
                    onSubmit={onContinueClick}
                    autoComplete="off"
                    noValidate={true}
                >
                    <div>{_t("settings|general|add_msisdn_instructions", { msisdn: sentToMsisdn })}</div>
                    <Field
                        type="text"
                        label={_t("settings|general|msisdn_verification_field_label")}
                        autoComplete="off"
                        disabled={disabled || continueDisabled}
                        value={verificationCodeInput}
                        onChange={onVerificationCodeInputChange}
                    />
                    <div className="mx_AddRemoveThreepids_buttons">
                        {cancelButton}
                        <AccessibleButton
                            onClick={onContinueClick}
                            kind="primary"
                            disabled={disabled || continueDisabled || verificationCodeInput.length === 0}
                        >
                            {_t("action|continue")}
                        </AccessibleButton>
                    </div>
                </form>
            </>
        );
    }

    if (!isOpen) {
        return (
            <ActionRowView Icon={PlusIcon} onClick={onOpenClick} disabled={disabled} autoFocus={wasCancelled}>
                {medium === "email"
                    ? _t("settings|general|add_email_dialog_title")
                    : _t("settings|general|add_msisdn_dialog_title")}
            </ActionRowView>
        );
    }

    const phoneCountry =
        medium === "msisdn" ? (
            <CountryDropdown
                onOptionChange={onPhoneCountryChanged}
                className="mx_PhoneNumbers_country"
                value={phoneCountryInput}
                disabled={isVerifying}
                isSmall={true}
                showPrefix={true}
            />
        ) : undefined;

    return (
        <form className="mx_AddRemoveThreepids_add" onSubmit={onAddClick} autoComplete="off" noValidate={true}>
            <Field
                type="text"
                label={
                    medium === "email"
                        ? _t("settings|general|email_address_label")
                        : _t("settings|general|msisdn_label")
                }
                autoComplete={medium === "email" ? "email" : "tel-national"}
                autoFocus={true}
                disabled={disabled || isVerifying}
                value={newThreepidInput}
                onChange={onNewThreepidInputChange}
                prefixComponent={phoneCountry}
            />
            <div className="mx_AddRemoveThreepids_buttons">
                {cancelButton}
                <AccessibleButton onClick={onAddClick} kind="primary" disabled={disabled}>
                    {_t("action|add")}
                </AccessibleButton>
            </div>
        </form>
    );
};

interface AddRemoveThreepidsProps {
    // Whether the control is for adding 3pids to the user's homeserver account or sharing them on an IS
    mode: TheepidControlMode;
    // Whether the control is for emails or phone numbers
    medium: ThreepidMedium;
    // The current list of third party identifiers
    threepids: ThirdPartyIdentifier[];
    // If true, the component is disabled and no third party identifiers can be added or removed
    disabled?: boolean;
    // Called when changes are made to the list of third party identifiers
    onChange: () => void;
    // If true, a spinner is shown instead of the component
    isLoading: boolean;
}

export const AddRemoveThreepids: React.FC<AddRemoveThreepidsProps> = ({
    mode,
    medium,
    threepids,
    disabled,
    onChange,
    isLoading,
}) => {
    if (isLoading) {
        return <InlineSpinner />;
    }

    const existingEmailElements = threepids.map((e) => {
        return <ExistingThreepid mode={mode} threepid={e} onChange={onChange} key={e.address} disabled={disabled} />;
    });

    if (mode === "is" && threepids.length === 0) return null;

    return (
        <ValueRowList className="mx_AddRemoveThreepids">
            {existingEmailElements}
            {mode === "hs" && <AddThreepidSection medium={medium} disabled={disabled} onChange={onChange} />}
        </ValueRowList>
    );
};
