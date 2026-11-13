/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const variantDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "telement", "release");

interface Variant {
    appId: string;
    productName: string;
    protocols: string[];
}

type Config = Record<string, unknown> & {
    oidc_metadata: Record<string, string | undefined> & { client_uri: string };
};

function readJson<T>(fileName: string): T {
    return JSON.parse(fs.readFileSync(path.join(variantDir, fileName), "utf8"));
}

function isSameHostOrSubdomain(host: string, candidate: string): boolean {
    return candidate === host || candidate.endsWith(`.${host}`);
}

describe("Telement desktop variant", () => {
    const build = readJson<Variant>("build.json");
    const config = readJson<Config>("config.json");

    it("does not claim Element's identity or URL schemes", () => {
        expect(build.appId).toBe("dev.hloth.telement");
        expect(build.productName).toBe("Telement");
        expect(build.protocols).not.toContain("element");
        expect(build.protocols).not.toContain("io.element.desktop");
    });

    // Matrix OAuth 2.0 client registration rejects clients whose URIs break these rules,
    // which would stop users from logging in to servers that use it.
    describe("OAuth client metadata", () => {
        const clientUri = new URL(config.oidc_metadata.client_uri);

        it("uses an https client URI", () => {
            expect(clientUri.protocol).toBe("https:");
        });

        it("uses a URL scheme prefixed with the client URI host in reverse-DNS notation", () => {
            const reversedHost = clientUri.hostname.split(".").reverse();
            const schemeParts = build.protocols[0].split(".");
            expect(schemeParts.slice(0, reversedHost.length)).toEqual(reversedHost);
        });

        it.each(["logo_uri", "tos_uri", "policy_uri"])("hosts %s on the client URI's host or a subdomain", (key) => {
            const uri = config.oidc_metadata[key];
            if (uri === undefined) return;
            const parsed = new URL(uri);
            expect(parsed.protocol).toBe("https:");
            expect(isSameHostOrSubdomain(clientUri.hostname, parsed.hostname)).toBe(true);
        });

        it("does not fall back to Element's terms or privacy links", () => {
            expect(config.terms_and_conditions_links).toBeUndefined();
            expect(config.privacy_policy_url).toBeUndefined();
        });
    });

    it("shows Telement's logo instead of Element's on the login page", () => {
        const branding = config.branding as Record<string, string> | undefined;
        expect(branding?.auth_header_logo_url).toBe("vector-icons/1024.png");
        expect(branding?.logo_link_url).toBe(config.oidc_metadata.client_uri);
    });

    it.each(["update_base_url", "map_style_url"])("does not use Element's %s", (key) => {
        expect(config[key]).toBeUndefined();
    });
});
