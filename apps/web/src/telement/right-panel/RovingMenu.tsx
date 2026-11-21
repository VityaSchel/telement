/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type ComponentProps, type JSX, type PropsWithChildren, useId } from "react";
import { MenuItem, ToggleInput } from "@vector-im/compound-web";

import { RovingTabIndexProvider, useRovingTabIndex } from "../../accessibility/RovingTabIndex";

type MenuItemProps = ComponentProps<typeof MenuItem>;

const noop = (): void => {};

/**
 * A vertical menu bar of {@link RovingMenuItem}s, such as the room info panel's: one Tab stop, which the up and down
 * arrows, Home and End move through, as they do through a menu's items.
 */
export function RovingMenuBar({ children }: PropsWithChildren): JSX.Element {
    return (
        <RovingTabIndexProvider handleUpDown handleHomeEnd>
            {({ onKeyDownHandler }) => (
                // The focus is on one of the items, never on the bar, which only hears their keys, as Toolbar does
                // oxlint-disable-next-line jsx-a11y/interactive-supports-focus
                <div role="menubar" aria-orientation="vertical" onKeyDown={onKeyDownHandler}>
                    {children}
                </div>
            )}
        </RovingTabIndexProvider>
    );
}

/**
 * A Compound menu item that takes part in a {@link RovingMenuBar}'s one Tab stop. A disabled item can't take focus, so
 * it stays out of it.
 */
export function RovingMenuItem(props: MenuItemProps): JSX.Element {
    const [onFocus, isActive, ref] = useRovingTabIndex<HTMLButtonElement>();
    // MenuItem passes the props it doesn't use on to its button, the ref too, although its props type leaves it out
    const roving = { ref: props.disabled ? undefined : ref, tabIndex: isActive && !props.disabled ? 0 : -1, onFocus };
    return <MenuItem {...props} {...roving} />;
}

/** Props for {@link RovingToggleMenuItem}. */
interface RovingToggleMenuItemProps extends Omit<MenuItemProps, "children" | "as" | "role" | "hideChevron"> {
    /** Whether the toggle is on. */
    checked: boolean;
}

/**
 * Compound's ToggleMenuItem as a {@link RovingMenuItem}: ToggleMenuItem passes neither a ref nor a tab index to its
 * item, so it can't take part in the menu bar's one Tab stop.
 */
export function RovingToggleMenuItem({ checked, disabled, ...props }: RovingToggleMenuItemProps): JSX.Element {
    const toggleId = useId();
    return (
        <RovingMenuItem
            {...props}
            as="button"
            role="menuitemcheckbox"
            aria-checked={checked}
            disabled={disabled}
            hideChevron
        >
            <ToggleInput
                id={toggleId}
                aria-hidden
                tabIndex={-1}
                checked={checked}
                disabled={disabled}
                onChange={noop}
            />
        </RovingMenuItem>
    );
}
