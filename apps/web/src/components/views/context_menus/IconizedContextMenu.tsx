/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";
import classNames from "classnames";
import { CheckboxInput, RadioInput } from "@vector-im/compound-web";

import ContextMenu, {
    ChevronFace,
    type IProps as IContextMenuProps,
    MenuItem,
    MenuItemCheckbox,
    MenuItemRadio,
} from "../../structures/ContextMenu";
import { _t } from "../../../languageHandler";

const noop = (): void => {};

interface IProps extends IContextMenuProps {
    className?: string;
    compact?: boolean;
}

interface IOptionListProps {
    first?: boolean;
    red?: boolean;
    label?: string;
    className?: string;
    children: ReactNode;
}

interface IOptionProps extends React.ComponentProps<typeof MenuItem> {
    icon?: ReactNode;
    isDestructive?: boolean;
}

interface ICheckboxProps extends React.ComponentProps<typeof MenuItemCheckbox> {
    icon?: ReactNode;
    words?: boolean;
}

interface IRadioProps extends React.ComponentProps<typeof MenuItemRadio> {
    icon?: ReactNode;
}

export const IconizedContextMenuRadio: React.FC<IRadioProps> = ({ label, icon, active, className, ...props }) => {
    return (
        <MenuItemRadio
            {...props}
            className={classNames(className, {
                mx_IconizedContextMenu_item: true,
                mx_IconizedContextMenu_active: active,
            })}
            active={active}
            label={label}
        >
            {/* Telement: Compound's radio marks the selected option, as in Compound's menus */}
            <RadioInput
                className="mx_IconizedContextMenu_selection"
                aria-hidden={true}
                tabIndex={-1}
                checked={!!active}
                onChange={noop}
            />
            {icon}
            <span className="mx_IconizedContextMenu_label">{label}</span>
        </MenuItemRadio>
    );
};

export const IconizedContextMenuCheckbox: React.FC<ICheckboxProps> = ({
    label,
    icon,
    active,
    className,
    words,
    ...props
}) => {
    let marker: JSX.Element | undefined;
    if (words) {
        marker = (
            <span className="mx_IconizedContextMenu_activeText">{active ? _t("common|on") : _t("common|off")}</span>
        );
    }

    return (
        <MenuItemCheckbox
            {...props}
            className={classNames(className, {
                mx_IconizedContextMenu_item: true,
                mx_IconizedContextMenu_active: active,
            })}
            active={active}
            label={label}
        >
            {/* Telement: Compound's checkbox marks the option, as in Compound's menus */}
            {!words && (
                <CheckboxInput
                    className="mx_IconizedContextMenu_selection"
                    aria-hidden={true}
                    tabIndex={-1}
                    checked={!!active}
                    onChange={noop}
                />
            )}
            {icon}
            <span className="mx_IconizedContextMenu_label">{label}</span>
            {marker}
        </MenuItemCheckbox>
    );
};

export const IconizedContextMenuOption: React.FC<IOptionProps> = ({
    label,
    className,
    icon,
    children,
    isDestructive,
    ...props
}) => {
    return (
        <MenuItem
            element="li"
            {...props}
            className={classNames(className, {
                mx_IconizedContextMenu_item: true,
                mx_IconizedContextMenu_itemDestructive: isDestructive,
            })}
            label={label}
        >
            {icon}
            <span className="mx_IconizedContextMenu_label">{label}</span>
            {children}
        </MenuItem>
    );
};

export const IconizedContextMenuOptionList: React.FC<IOptionListProps> = ({
    first,
    red,
    className,
    label,
    children,
}) => {
    const classes = classNames("mx_IconizedContextMenu_optionList", className, {
        mx_IconizedContextMenu_optionList_notFirst: !first,
        mx_IconizedContextMenu_optionList_red: red,
    });

    return (
        <div className={classes}>
            {label && (
                <div>
                    <span className="mx_IconizedContextMenu_optionList_label">{label}</span>
                </div>
            )}
            {children}
        </div>
    );
};

const IconizedContextMenu: React.FC<React.PropsWithChildren<IProps>> = ({ className, children, compact, ...props }) => {
    const classes = classNames("mx_IconizedContextMenu", className, {
        mx_IconizedContextMenu_compact: compact,
    });

    return (
        <ContextMenu chevronFace={ChevronFace.None} {...props}>
            <ul role="none" className={classes}>
                {children}
            </ul>
        </ContextMenu>
    );
};

export default IconizedContextMenu;
