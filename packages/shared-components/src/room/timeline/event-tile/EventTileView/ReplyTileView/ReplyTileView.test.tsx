/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@test-utils";
import { describe, expect, it, vi } from "vitest";

import { type MemberAvatarViewSnapshot } from "../../../../../core/MemberAvatar/MemberAvatarView";
import { MockViewModel } from "../../../../../core/viewmodel";
import { type DisambiguatedProfileViewSnapshot } from "../DisambiguatedProfile";
import {
    ReplyTileView,
    type ReplyTileViewActions,
    type ReplyTileViewModel,
    type ReplyTileViewSnapshot,
} from "./ReplyTileView";
import styles from "./ReplyTileView.module.css";

class TestReplyTileViewModel extends MockViewModel<ReplyTileViewSnapshot> implements ReplyTileViewActions {
    public onClick?: ReplyTileViewActions["onClick"];

    public constructor(
        snapshot: ReplyTileViewSnapshot,
        onClick: ReplyTileViewActions["onClick"] = vi.fn((event) => event.preventDefault()),
    ) {
        super(snapshot);
        this.onClick = onClick;
    }
}

const avatarViewModel = new MockViewModel<MemberAvatarViewSnapshot>({
    id: "@alice:example.org",
    name: "Alice",
    size: "16px",
});

const profileViewModel = new MockViewModel<DisambiguatedProfileViewSnapshot>({
    displayName: "Alice",
    emphasizeDisplayName: true,
});

function renderReplyTile(
    snapshot: Partial<ReplyTileViewSnapshot> = {},
    actions?: Partial<ReplyTileViewActions>,
): ReturnType<typeof render> {
    const vm = new TestReplyTileViewModel(
        {
            href: "/room/event",
            body: <span>Reply content</span>,
            ...snapshot,
        },
        actions?.onClick ?? vi.fn(),
    ) as ReplyTileViewModel;

    return render(<ReplyTileView vm={vm} />);
}

describe("ReplyTileView", () => {
    it("renders sender and body from the view model without host classes", () => {
        const { container } = renderReplyTile({
            sender: {
                avatarViewModel,
                profileViewModel,
            },
        });

        expect(screen.getByRole("link")).toHaveAttribute("href", "/room/event");
        expect(screen.getByTestId("reply-tile")).toHaveClass(styles.root);
        expect(screen.getByTestId("reply-tile")).not.toHaveClass("mx_ReplyTile");
        expect(screen.getByTestId("reply-tile-sender")).toHaveClass(styles.sender);
        expect(screen.getByTestId("reply-tile-body")).toHaveClass(styles.body);
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Reply content")).toBeInTheDocument();
        expect(container.querySelector(".mx_ReplyTile_sender")).not.toBeInTheDocument();
    });

    it("neutralises the surrounding event presentation for nested components", () => {
        const vm = new TestReplyTileViewModel({
            href: "#",
            body: "Reply content",
            sender: { profileViewModel },
        }) as ReplyTileViewModel;
        render(<ReplyTileView vm={vm} />, {
            presentation: { layout: "irc", density: "compact" },
        });

        const profile = screen.getByText("Alice").parentElement;
        expect(profile).toHaveAttribute("data-event-layout", "group");
        expect(profile).toHaveAttribute("data-event-density", "default");
    });

    it("applies inline and informational modifiers", () => {
        renderReplyTile({ inline: true, info: true });

        expect(screen.getByTestId("reply-tile")).toHaveClass(styles.root, styles.inline, styles.info);
    });

    it("clips body previews without relying on legacy mx classes", () => {
        renderReplyTile({
            body: <p>Long reply content</p>,
        });

        const body = screen.getByTestId("reply-tile-body");
        const previewContent = screen.getByText("Long reply content");
        expect(body).toHaveClass(styles.body);
        expect(getComputedStyle(body).overflow).toBe("hidden");
        expect(getComputedStyle(body).webkitLineClamp).toBe("2");
        expect(getComputedStyle(previewContent).webkitLineClamp).toBe("2");
    });

    it("shows one line of the body without the sender as an excerpt", () => {
        const vm = new TestReplyTileViewModel({
            href: "/room/event",
            body: <p>Long reply content</p>,
            sender: { avatarViewModel, profileViewModel },
        }) as ReplyTileViewModel;
        render(<ReplyTileView vm={vm} excerpt />);

        expect(screen.getByTestId("reply-tile")).toHaveClass(styles.root, styles.excerpt);
        expect(screen.queryByTestId("reply-tile-sender")).not.toBeInTheDocument();
        expect(screen.queryByText("Alice")).not.toBeInTheDocument();
        expect(screen.getByRole("link")).toHaveAttribute("href", "/room/event");
        expect(getComputedStyle(screen.getByTestId("reply-tile-body")).webkitLineClamp).toBe("1");
        expect(getComputedStyle(screen.getByText("Long reply content")).webkitLineClamp).toBe("1");
    });

    it("keeps an emote excerpt on its own line under the host's title", () => {
        const vm = new TestReplyTileViewModel({
            href: "#",
            body: "Alice waves",
            inline: true,
            sender: { avatarViewModel },
        }) as ReplyTileViewModel;
        render(<ReplyTileView vm={vm} excerpt />);

        expect(getComputedStyle(screen.getByRole("link")).display).toBe("block");
        expect(screen.queryByTestId("reply-tile-sender")).not.toBeInTheDocument();
    });

    it("shows a video in an excerpt as a thumbnail as high as a picture's", () => {
        const vm = new TestReplyTileViewModel({
            href: "#",
            body: (
                <span className="mx_MVideoBody">
                    <div
                        className="mx_MVideoBody_container"
                        data-testid="video-frame"
                        style={{ width: "320px", maxWidth: "100%", maxHeight: 180, aspectRatio: "16/9" }}
                    >
                        <img alt="" />
                        <span>Play</span>
                        <span>0:42</span>
                    </div>
                </span>
            ),
        }) as ReplyTileViewModel;
        render(
            <div style={{ width: 600 }}>
                <ReplyTileView vm={vm} excerpt />
            </div>,
        );

        const frame = screen.getByTestId("video-frame").getBoundingClientRect();
        expect(frame.height).toBe(44);
        expect(frame.width).toBeCloseTo((44 * 16) / 9, 0);
        expect(getComputedStyle(screen.getByText("Play")).display).toBe("none");
        expect(getComputedStyle(screen.getByText("0:42")).display).toBe("none");
    });

    it("keeps a half-size play button on an excerpt video without a picture", () => {
        const vm = new TestReplyTileViewModel({
            href: "#",
            body: (
                <span className="mx_MVideoBody">
                    <div
                        className="mx_MVideoBody_container"
                        data-testid="video-frame"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "320px",
                            aspectRatio: "16/9",
                        }}
                    >
                        <span data-testid="play-button" style={{ display: "flex", width: 48, height: 48 }} />
                        <span>0:42</span>
                    </div>
                </span>
            ),
        }) as ReplyTileViewModel;
        render(<ReplyTileView vm={vm} excerpt />);

        const frame = screen.getByTestId("video-frame").getBoundingClientRect();
        const playButton = screen.getByTestId("play-button").getBoundingClientRect();
        expect(frame.height).toBe(44);
        expect(playButton.width).toBe(24);
        expect(playButton.height).toBe(24);
        expect(playButton.top - frame.top).toBe(10);
        expect(getComputedStyle(screen.getByText("0:42")).display).toBe("none");
    });

    it("leaves videos at their size outside an excerpt", () => {
        renderReplyTile({
            body: (
                <span className="mx_MVideoBody">
                    <div
                        className="mx_MVideoBody_container"
                        data-testid="video-frame"
                        style={{ width: "320px", maxWidth: "100%", maxHeight: 180, aspectRatio: "16/9" }}
                    />
                </span>
            ),
        });

        expect(screen.getByTestId("video-frame").getBoundingClientRect().width).toBe(320);
    });

    it("hides edited markers inside the local body preview", () => {
        renderReplyTile({
            body: (
                <span data-textual-body-annotation-wrapper>
                    <span>Edited reply body</span>
                    <span data-textual-body-edited-marker>Edited</span>
                </span>
            ),
        });

        expect(getComputedStyle(screen.getByText("Edited")).display).toBe("none");
    });

    it("clips code previews and hides line numbers through semantic hooks", () => {
        renderReplyTile({
            body: (
                <pre>
                    <span data-event-tile-line-numbers>1 2 3</span>
                    <code>{"const answer = 42;\nconsole.log(answer);\nconsole.log(answer);"}</code>
                </pre>
            ),
        });

        const pre = screen.getByText(/const answer/).closest("pre");
        const lineNumbers = screen.getByText("1 2 3");
        expect(pre).not.toBeNull();
        expect(getComputedStyle(pre!).overflow).toBe("hidden");
        expect(getComputedStyle(pre!).webkitLineClamp).toBe("2");
        expect(getComputedStyle(lineNumbers).display).toBe("none");
    });

    it("keeps nested controls inert inside the reply preview", () => {
        renderReplyTile({
            body: (
                <>
                    <button type="button">Nested action</button>
                    <div className="mx_MBeaconBody">Beacon body</div>
                </>
            ),
        });

        expect(getComputedStyle(screen.getByRole("button", { name: "Nested action" })).pointerEvents).toBe("none");
        expect(getComputedStyle(screen.getByText("Beacon body")).pointerEvents).toBe("none");
    });

    it("passes clicks to the reply action", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn((event) => event.preventDefault());

        renderReplyTile(undefined, { onClick });

        await user.click(screen.getByRole("link"));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
