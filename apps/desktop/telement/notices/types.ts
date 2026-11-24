/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type PackageReference } from "./store.ts";

/** A work of others that Telement ships, with what its license requires to be shown. */
export interface Notice extends PackageReference {
    /** SPDX license expression, if there is one for the license. */
    license: string;
    /** What contains the work, for works without a version. */
    within?: string;
    /** Copyright notice, for a license text that has none. */
    copyright?: string;
    remark?: string;
    /** License texts. */
    texts: string[];
    /** Where the license texts are from. */
    source: string;
}

/** What to show for a work that has no license file of its own, or more than its license file says. */
export interface Override {
    /** SPDX license expression. Without it, the one of the package's metadata applies. */
    license?: string;
    /** Versions of a package for which this was checked. It applies to the caret ranges of them. */
    versions?: string[];
    /** Files of the license texts, relative to this directory. */
    texts?: string[];
    /** Installed package that has the same license texts. */
    sameAs?: string;
    /** Files of texts to show along with the package's own license file. */
    extraTexts?: string[];
    copyright?: string;
    remark?: string;
}

/** What the packages that Telement ships don't tell about their licenses and contents. */
export interface Overrides {
    /** Notices by the name of the package or other work. */
    notices: Record<string, Override>;
    /**
     * Works contained in a package, of which its modules and source maps have no trace. They are by the package's
     * `name`, or `name@version` if they can differ between versions, which then applies to its caret range.
     */
    contents: Record<string, string[]>;
    /** Dependencies that a package doesn't use where Telement uses it, by the package's name. "*" is all of them. */
    unused: Record<string, string[]>;
    /** Names of works by regular expressions for paths of the web app's files and modules. Null is Element's own. */
    origins: Record<string, string | null>;
    /** Packages that contain Rust code. */
    rustPackages: string[];
}

/** Rust crates in the packages that contain Rust code, as recorded by crates.ts. */
export interface Crates {
    /** Crates as `name@version`, by the package as `name@version`. */
    packages: Record<string, string[]>;
    /** IDs of license texts, or files of them relative to this directory, by the crate as `name@version`. */
    crates: Record<string, { license: string; texts: string[] }>;
    /** License texts by their IDs. */
    texts: Record<string, string>;
}
