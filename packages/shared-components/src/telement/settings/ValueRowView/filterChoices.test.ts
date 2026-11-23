/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import { filterChoices } from "./filterChoices";

describe("filterChoices", () => {
    const CHOICES = [
        { label: "Browser default (Europe/Berlin)" },
        { label: "America/Argentina/Buenos_Aires" },
        { label: "America/Sao_Paulo" },
        { label: "Europe/Berlin" },
        { label: "Europe/Istanbul" },
        { label: "한국어", searchTerms: ["Korean"] },
        { label: "Türkçe", searchTerms: ["Turkish"] },
    ];

    it.each([
        ["", CHOICES.map(({ label }) => label)],
        ["   ", CHOICES.map(({ label }) => label)],
        ["BERLIN", ["Browser default (Europe/Berlin)", "Europe/Berlin"]],
        ["europe/ber", ["Browser default (Europe/Berlin)", "Europe/Berlin"]],
        ["buenos aires", ["America/Argentina/Buenos_Aires"]],
        ["São Paulo", ["America/Sao_Paulo"]],
        ["İstanbul", ["Europe/Istanbul"]],
        ["turkce", ["Türkçe"]],
        ["turkish", ["Türkçe"]],
        ["한국", ["한국어"]],
        ["korea", ["한국어"]],
        ["klingon", []],
    ])("finds %j in any case, with or without accents, by words", (query, found) => {
        expect(filterChoices(CHOICES, query).map(({ label }) => label)).toEqual(found);
    });
});
