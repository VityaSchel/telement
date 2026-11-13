/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import "@vector-im/compound-design-tokens/assets/web/css/compound-design-tokens.css";
import "@vector-im/compound-web/dist/style.css";
import React from "react";
import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@test-utils";
import { describe, expect, it } from "vitest";

import * as redactedStories from "./RedactedBodyView.stories";
import * as hiddenStories from "../HiddenBodyView/HiddenBodyView.stories";
import * as textualStories from "../TextualBodyView/TextualBody.stories";

const { SelfRedaction: Redacted } = composeStories(redactedStories);
const { Default: Hidden } = composeStories(hiddenStories);
const { Edited } = composeStories(textualStories);

/** The box of the text in an element, without any padding around it. */
function textBox(element: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
}

/** A bubble's line: its 18px line height is what the message's text takes. */
function Line({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <div style={{ lineHeight: "18px", width: "600px" }}>{children}</div>;
}

describe("Spacing in message bodies", () => {
    it.each([
        ["a deleted message", <Redacted key="redacted" />, "Message deleted"],
        ["a message pending moderation", <Hidden key="hidden" />, "Message pending moderation"],
    ])("puts 8px between the icon and the text of %s", (_name, body, label) => {
        render(<Line>{body}</Line>);
        const text = screen.getByText(label);
        const icon = text.parentElement!.querySelector("svg")!;

        expect(textBox(text).left - icon.getBoundingClientRect().right).toBe(8);
    });

    it("keeps a message pending moderation to the line height of the message around it", () => {
        render(
            <Line>
                <Hidden />
            </Line>,
        );
        const text = screen.getByText("Message pending moderation");

        expect(getComputedStyle(text).lineHeight).toBe("18px");
        expect(text.getBoundingClientRect().height).toBe(18);
    });

    it("puts the edited marker 8px after the text", () => {
        render(<Edited body={<span>See you at ten.</span>} />);
        const marker = screen.getByText("(edited)");

        expect(textBox(marker).left - textBox(screen.getByText("See you at ten.")).right).toBe(8);
    });
});
