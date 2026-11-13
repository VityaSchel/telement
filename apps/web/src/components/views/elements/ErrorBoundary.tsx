/*
Copyright 2024 New Vector Ltd.
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ErrorInfo, type ReactNode } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import PlatformPeg from "../../../PlatformPeg";
import AccessibleButton from "./AccessibleButton";

interface Props {
    children: ReactNode;
}

interface IState {
    error?: Error;
}

/**
 * This error boundary component can be used to wrap large content areas and
 * catch exceptions during rendering in the component tree below them.
 */
export default class ErrorBoundary extends React.PureComponent<Props, IState> {
    public constructor(props: Props) {
        super(props);

        this.state = {};
    }

    public static getDerivedStateFromError(error: Error): Partial<IState> {
        // Side effects are not permitted here, so we only update the state so
        // that the next render shows an error message.
        return { error };
    }

    public componentDidCatch(error: Error, { componentStack }: ErrorInfo): void {
        // Browser consoles are better at formatting output when native errors are passed
        // in their own `console.error` invocation.
        logger.error(error);
        logger.error("The above error occurred while React was rendering the following components:", componentStack);
    }

    private onClearCacheAndReload = (): void => {
        if (!PlatformPeg.get()) return;

        MatrixClientPeg.safeGet().stopClient();
        void MatrixClientPeg.safeGet()
            .store.deleteAllData()
            .then(() => {
                PlatformPeg.get()?.reload();
            });
    };

    public render(): ReactNode {
        if (this.state.error) {
            let clearCacheButton: JSX.Element | undefined;
            // we only show this button if there is an initialised MatrixClient otherwise we can't clear the cache
            if (MatrixClientPeg.get()) {
                clearCacheButton = (
                    <AccessibleButton onClick={this.onClearCacheAndReload} kind="danger">
                        {_t("setting|help_about|clear_cache_reload")}
                    </AccessibleButton>
                );
            }

            return (
                <div className="mx_ErrorBoundary">
                    <div className="mx_ErrorBoundary_body">
                        <h1>{_t("error|something_went_wrong")}</h1>
                        {clearCacheButton}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
