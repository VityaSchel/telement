/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import {
    BaseViewModel,
    type ValueRowAvatar,
    type ValueRowOption,
    type ValueRowViewModel as ValueRowViewModelInterface,
    type ValueRowViewSnapshot,
} from "@element-hq/web-shared-components";

export interface ValueRowViewModelProps {
    /** What the setting is. */
    label: string;
    /** A second line under the label, such as a person's Matrix ID. */
    description?: string;
    /** The person or room the row is about. */
    avatar?: ValueRowAvatar;
    /** The choices. */
    options: ValueRowOption[];
    /** The key of the current choice, if the value is one of the options. */
    selectedKey?: string;
    /** What the row shows as the value; the chosen option's label by default. */
    value?: string;
    /** Whether the value can't be changed. */
    disabled?: boolean;
    /** The label of the menu item that lets the user type a value of their own, such as "Custom…". */
    customLabel?: string;
    /** What the field for a value of one's own starts with, such as the current number. */
    customValue?: string;
    /** Applies a choice. A rejected promise puts the previous value back. */
    onSelect: (key: string) => void | Promise<void>;
    /** Applies a typed value. A rejected promise, such as for a value that isn't valid, puts the previous one back. */
    onCustom?: (value: string) => void | Promise<void>;
}

function valueOf(props: ValueRowViewModelProps): string {
    return props.value ?? props.options.find((option) => option.key === props.selectedKey)?.label ?? "";
}

function sameOptions(a: ValueRowOption[], b: ValueRowOption[]): boolean {
    return a.length === b.length && a.every((option, i) => option.key === b[i].key && option.label === b[i].label);
}

function sameAvatar(a?: ValueRowAvatar, b?: ValueRowAvatar): boolean {
    return a?.id === b?.id && a?.name === b?.name && a?.src === b?.src;
}

/**
 * View model of a settings row with a value, which a legacy settings component creates for each of its single-choice
 * settings and keeps up to date with {@link ValueRowViewModel.setProps}. A choice shows at once and is put back if
 * applying it fails, so the row never waits on the server.
 */
export class ValueRowViewModel
    extends BaseViewModel<ValueRowViewSnapshot, ValueRowViewModelProps>
    implements ValueRowViewModelInterface
{
    public constructor(props: ValueRowViewModelProps) {
        super(props, {
            label: props.label,
            description: props.description,
            avatar: props.avatar,
            value: valueOf(props),
            options: props.options,
            selectedKey: props.selectedKey,
            disabled: !!props.disabled,
            customLabel: props.customLabel,
            customValue: undefined,
        });
    }

    /** Takes the component's latest props, such as a value the server confirmed or a new list of devices. */
    public setProps(props: ValueRowViewModelProps): void {
        const previous = this.props;
        this.props = props;
        const current = this.getSnapshot();
        this.snapshot.merge({
            label: props.label,
            description: props.description,
            avatar: sameAvatar(current.avatar, props.avatar) ? current.avatar : props.avatar,
            options: sameOptions(current.options, props.options) ? current.options : props.options,
            disabled: !!props.disabled,
            customLabel: props.customLabel,
        });
        // A value applied here stays until the component's value changes, as it does once the server has it
        if (previous.selectedKey !== props.selectedKey || valueOf(previous) !== valueOf(props)) {
            this.snapshot.merge({ selectedKey: props.selectedKey, value: valueOf(props) });
        }
    }

    private restore(): void {
        this.snapshot.merge({ selectedKey: this.props.selectedKey, value: valueOf(this.props) });
    }

    public select = async (key: string): Promise<void> => {
        const option = this.props.options.find((candidate) => candidate.key === key);
        if (!option || key === this.getSnapshot().selectedKey) return;

        this.snapshot.merge({ selectedKey: key, value: option.label });
        try {
            await this.props.onSelect(key);
        } catch {
            if (!this.isDisposed) this.restore();
        }
    };

    public startCustom = (): void => {
        this.snapshot.merge({ customValue: this.props.customValue ?? "" });
    };

    public setCustomValue = (value: string): void => {
        this.snapshot.merge({ customValue: value });
    };

    public commitCustom = async (): Promise<void> => {
        const value = this.getSnapshot().customValue;
        if (value === undefined) return;

        this.snapshot.merge({ customValue: undefined, selectedKey: undefined, value });
        try {
            await this.props.onCustom?.(value);
        } catch {
            if (!this.isDisposed) this.restore();
        }
    };

    public cancelCustom = (): void => {
        this.snapshot.merge({ customValue: undefined });
    };
}
