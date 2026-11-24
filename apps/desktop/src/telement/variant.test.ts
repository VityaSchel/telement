/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const variantDir = path.join(desktopDir, "telement", "release");

interface Variant {
    appId: string;
    productName: string;
    description: string;
    protocols: string[];
}

type Config = Record<string, unknown> & {
    oidc_metadata: Record<string, string | undefined> & { client_uri: string };
};

/** The parts of the electron-builder configuration that the tests check. */
interface PackagingConfig {
    extraResources: { from?: string; to?: string; filter?: string[] }[];
    deb: { depends: string[]; recommends: string[]; synopsis: string; fpm: string[] };
}

function readText(...pathInDesktop: string[]): string {
    return fs.readFileSync(path.join(desktopDir, ...pathInDesktop), "utf8");
}

function readJson<T>(fileName: string): T {
    return JSON.parse(readText("telement", "release", fileName));
}

/**
 * Loads and validates electron-builder's configuration of the variant, as a build does.
 * It reads files relative to the working directory, which a worker thread can't change, so this runs a process.
 */
function loadPackagingConfig(): PackagingConfig {
    const script = `
        import { getConfig, validateConfiguration } from "app-builder-lib/out/util/config/config.js";
        const config = await getConfig(process.cwd(), null, null);
        await validateConfiguration(config, { isEnabled: false, add() {} });
        process.stdout.write("\\n" + JSON.stringify(config));
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
        cwd: desktopDir,
        env: { ...process.env, VARIANT_PATH: path.join(variantDir, "build.json") },
        encoding: "utf8",
    });
    return JSON.parse(output.slice(output.lastIndexOf("\n")));
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

    describe("packaging", () => {
        let packaging: PackagingConfig;

        beforeAll(() => {
            packaging = loadPackagingConfig();
        });

        // Ubuntu 24.04 has no package named libasound2, only ones that provide it, of which apt picks OSS's emulation
        // of ALSA when none is installed. The app exits with it, as it lacks symbols the app needs.
        it("depends on ALSA's own library by its current name first", () => {
            expect(packaging.deb.depends).toContain("libasound2t64 | libasound2");
            expect(packaging.deb.depends).not.toContain("libasound2");
        });

        it("does not recommend the keyring of Element's apt repository", () => {
            expect(packaging.deb.recommends).toEqual([]);
        });

        // Package lists show only the synopsis. Debian's policy limits it to one line of under 80 characters.
        it("has the variant's description as the deb's synopsis", () => {
            expect(packaging.deb.synopsis).toBe(build.description);
            expect(packaging.deb.synopsis).toMatch(/^.{1,79}$/);
        });

        describe("licenses", () => {
            const copyrightNotice = readText("telement", "release", "COPYRIGHT");

            it("ships the license texts and the copyright notice next to the app's own resources", () => {
                expect(packaging.extraResources).toEqual(
                    expect.arrayContaining([
                        { filter: expect.arrayContaining(["webapp.asar"]) },
                        { from: "telement/release/COPYRIGHT", to: "COPYRIGHT" },
                        { from: "../../LICENSE-AGPL-3.0", to: "LICENSE-AGPL-3.0" },
                        { from: "../../LICENSE-GPL-3.0", to: "LICENSE-GPL-3.0" },
                    ]),
                );
                expect(readText("../../LICENSE-AGPL-3.0")).toContain("GNU AFFERO GENERAL PUBLIC LICENSE");
                expect(readText("../../LICENSE-GPL-3.0")).toContain("GNU GENERAL PUBLIC LICENSE");
            });

            it("puts the copyright notice where Debian expects it, after fpm's options, which end at the first file", () => {
                expect(packaging.deb.fpm.at(-1)).toBe(
                    "telement/release/COPYRIGHT=/usr/share/doc/telement-desktop/copyright",
                );
            });

            it("names in the copyright notice every copyright holder the README names", () => {
                const copyrightLines = readText("../../README.md").match(/^Copyright .*$/gm);
                expect(copyrightLines).not.toBeNull();
                for (const line of copyrightLines!) {
                    expect(copyrightNotice).toContain(`${line}\n`);
                }
            });

            it("states the license in the package metadata as in the copyright notice", () => {
                const { license } = JSON.parse(readText("package.json")) as { license: string };
                expect(license).toBe("AGPL-3.0-only OR GPL-3.0-only");
                expect(copyrightNotice).toContain(`SPDX-License-Identifier: ${license}\n`);
            });
        });
    });
});
