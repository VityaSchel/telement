/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

/** Where the sources of a package that contains Rust code are, and what it's built for. */
export interface RustPackage {
    /** Repository on GitHub. */
    repository: string;
    /** What a release's tag has before the version. */
    tagPrefix?: string;
    /** Path of the Cargo.toml in the repository. */
    manifest: string;
    features?: string[];
    targets: string[];
}

const WASM_TARGETS = ["wasm32-unknown-unknown"];
const NATIVE_TARGETS = [
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
    "aarch64-unknown-linux-gnu",
    "x86_64-unknown-linux-gnu",
    "aarch64-pc-windows-msvc",
    "x86_64-pc-windows-msvc",
];

/** Packages that contain Rust code, by their names. */
export const rustPackages: Record<string, RustPackage> = {
    "@matrix-org/matrix-sdk-crypto-wasm": {
        repository: "matrix-org/matrix-rust-sdk-crypto-wasm",
        tagPrefix: "v",
        manifest: "Cargo.toml",
        targets: WASM_TARGETS,
    },
    // Its repository has no lock file, so these are the versions of the crates that cargo would choose today
    "@matrix-org/seshat": {
        repository: "matrix-org/seshat",
        manifest: "seshat-node/Cargo.toml",
        features: ["bundled-sqlcipher"],
        targets: NATIVE_TARGETS,
    },
    "@vector-im/matrix-wysiwyg-wasm": {
        repository: "element-hq/matrix-rich-text-editor",
        manifest: "bindings/wysiwyg-wasm/Cargo.toml",
        targets: WASM_TARGETS,
    },
};

/** Files with the license texts of crates that come without one, from their repositories. */
export const cratesWithoutLicenseFile: Record<string, string> = {
    "decancer": "texts/decancer.txt",
    "eyeball": "texts/MPL-2.0.txt",
    "eyeball-im": "texts/MPL-2.0.txt",
    "inotify": "texts/inotify.txt",
    "matrix_indexed_db_futures": "texts/rust-indexed-db.txt",
    "murmurhash32": "texts/murmurhash32.txt",
    "notify": "texts/CC0-1.0.txt",
    "readlock": "texts/MPL-2.0.txt",
    "readlock-tokio": "texts/MPL-2.0.txt",
    "ruma": "texts/MIT.txt",
    "ruma-client-api": "texts/MIT.txt",
    "ruma-common": "texts/MIT.txt",
    "ruma-events": "texts/MIT.txt",
    "ruma-html": "texts/MIT.txt",
    "ruma-identifiers-validation": "texts/MIT.txt",
    "tantivy-query-grammar": "texts/tantivy.txt",
    "void": "texts/rust-void.txt",
    "wasm_evt_listener": "texts/wasm-evt-listener.txt",
};
