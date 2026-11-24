/*
Copyright 2026 Viktor Shchelochkov

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { rustPackages } from "./rustPackages.ts";
import { type Override, type Overrides } from "./types.ts";

const APACHE = "texts/Apache-2.0.txt";
const MIT = "texts/MIT.txt";
const MPL = "texts/MPL-2.0.txt";
const OFL = "texts/OFL-1.1.txt";
const UNICODE = "texts/Unicode-3.0.txt";
const AGPL = "../../../../LICENSE-AGPL-3.0";
const GPL = "../../../../LICENSE-GPL-3.0";

/** Element's packages, which are also offered under a commercial license. */
const ELEMENT: Override = { license: "AGPL-3.0-or-later", texts: [AGPL] };
const ELEMENT_CALL: Override = { ...ELEMENT, copyright: "Copyright 2021-2026 New Vector Ltd" };
const MATRIX_WYSIWYG: Override = {
    ...ELEMENT,
    copyright: "Copyright (c) 2022-2024 The Matrix.org Foundation C.I.C.\nCopyright (c) 2024-2025 New Vector Ltd",
};

/** The Apache License 2.0, which needs no copyright notice of the work to be shown. */
const APACHE_LICENSED: Override = { license: "Apache-2.0", texts: [APACHE] };

const SESHAT_PLATFORMS = ["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "win32-arm64", "win32-x64"];
const SESHAT_PACKAGES = SESHAT_PLATFORMS.map((platform) => `@matrix-org/seshat-${platform}`);

/** Packages of which Element Call bundles versions that aren't installed here, checked in npm's archives of them. */
const ELEMENT_CALL_PACKAGES: Record<string, Override> = {
    "@formatjs/bigdecimal": { license: "MIT", versions: ["0.2.7"], texts: ["texts/formatjs-bigdecimal.txt"] },
    "@formatjs/ecma402-abstract": { license: "MIT", versions: ["2.3.6"], sameAs: "@formatjs/fast-memoize" },
    "@formatjs/fast-memoize": { license: "MIT", versions: ["2.2.7"], sameAs: "@formatjs/fast-memoize" },
    "@formatjs/intl-durationformat": { license: "MIT", versions: ["0.10.18"], sameAs: "@formatjs/fast-memoize" },
    "@formatjs/intl-localematcher": {
        license: "MIT",
        versions: ["0.6.2", "0.8.13"],
        sameAs: "@formatjs/fast-memoize",
    },
    "@formatjs/intl-segmenter": { license: "MIT", versions: ["11.7.12"], sameAs: "@formatjs/intl-segmenter" },
    "@livekit/components-core": { ...APACHE_LICENSED, versions: ["0.12.15"] },
    "@livekit/components-react": { ...APACHE_LICENSED, versions: ["2.9.24"] },
    "@livekit/track-processors": { ...APACHE_LICENSED, versions: ["0.7.2"] },
    "@radix-ui/number": { license: "MIT", versions: ["1.1.3"], sameAs: "@radix-ui/primitive" },
    "@radix-ui/react-slider": { license: "MIT", versions: ["1.4.7"], sameAs: "@radix-ui/primitive" },
    "@radix-ui/react-use-previous": { license: "MIT", versions: ["1.1.4"], sameAs: "@radix-ui/primitive" },
    "@radix-ui/react-visually-hidden": { license: "MIT", versions: ["1.2.11"], sameAs: "@radix-ui/primitive" },
    "@react-spring/animated": { license: "MIT", versions: ["10.1.2"], texts: ["texts/react-spring.txt"] },
    "@react-spring/core": { license: "MIT", versions: ["10.1.2"], texts: ["texts/react-spring.txt"] },
    "@react-spring/rafz": { license: "MIT", versions: ["10.1.2"], texts: ["texts/react-spring.txt"] },
    "@react-spring/shared": { license: "MIT", versions: ["10.1.2"], texts: ["texts/react-spring.txt"] },
    "@react-spring/web": { license: "MIT", versions: ["10.1.2"], texts: ["texts/react-spring.txt"] },
    "@sentry/browser": { license: "MIT", versions: ["8.55.2"], texts: ["texts/sentry.txt"] },
    "@sentry/core": { license: "MIT", versions: ["8.55.2"], texts: ["texts/sentry.txt"] },
    "@sentry/react": { license: "MIT", versions: ["8.55.2"], texts: ["texts/sentry.txt"] },
    "@sentry-internal/browser-utils": { license: "MIT", versions: ["8.55.2"], texts: ["texts/sentry-internal.txt"] },
    "@use-gesture/core": { license: "MIT", versions: ["10.3.1"], texts: ["texts/use-gesture.txt"] },
    "@use-gesture/react": { license: "MIT", versions: ["10.3.1"], texts: ["texts/use-gesture.txt"] },
    "copy-to-clipboard": { license: "MIT", versions: ["3.3.3"], texts: ["texts/copy-to-clipboard.txt"] },
    "i18next": { license: "MIT", versions: ["26.4.1"], texts: ["texts/i18next.txt"] },
    "i18next-browser-languagedetector": {
        license: "MIT",
        versions: ["8.2.1"],
        texts: ["texts/i18next-browser-languagedetector.txt"],
    },
    "livekit-client": { ...APACHE_LICENSED, versions: ["2.22.3"] },
    "observable-hooks": { license: "MIT", versions: ["4.2.4"], texts: ["texts/observable-hooks.txt"] },
    "pako": { license: "MIT AND Zlib", versions: ["2.2.0"], sameAs: "pako" },
    "posthog-js": { license: "Apache-2.0 AND MIT", versions: ["1.408.2"], texts: ["texts/posthog-js.txt"] },
    "react-i18next": { license: "MIT", versions: ["16.6.6"], texts: ["texts/react-i18next.txt"] },
    "react-router": { license: "MIT", versions: ["7.18.3"], texts: ["texts/react-router.txt"] },
    "react-use-measure": { license: "MIT", versions: ["2.1.7"], texts: ["texts/react-use-measure.txt"] },
    "scheduler": { license: "MIT", versions: ["0.27.0"], sameAs: "scheduler" },
    "unique-names-generator": { license: "MIT", versions: ["4.7.1"], texts: ["texts/unique-names-generator.txt"] },
    "void-elements": { license: "MIT", versions: ["3.1.0"], texts: ["texts/void-elements.txt"] },
};

/** Packages that come without a license file. Their texts are from their repositories, or what their metadata says. */
const PACKAGES_WITHOUT_LICENSE_FILE: Record<string, Override> = {
    "@mediapipe/tasks-vision": APACHE_LICENSED,
    "@matrix-org/seshat": APACHE_LICENSED,
    "@matrix-org/spec": APACHE_LICENSED,
    ...Object.fromEntries(SESHAT_PACKAGES.map((name) => [name, APACHE_LICENSED])),
    "blurhash": { texts: ["texts/blurhash.txt"] },
    "except": { texts: [MIT], copyright: "Copyright (c) Martin Andert" },
    "html-parse-stringify": { license: "MIT", texts: ["texts/html-parse-stringify.txt"] },
    "indexof": { license: "MIT", texts: ["texts/indexof.txt"] },
    "jsrsasign": { texts: ["texts/jsrsasign.txt"] },
    "matrix-web-i18n": APACHE_LICENSED,
    "react-blurhash": { texts: [MIT], copyright: "Copyright (c) nygardk" },
    "react-property": { sameAs: "react" },
    "react-remove-scroll-bar": { texts: ["texts/react-remove-scroll-bar.txt"] },
    "toggle-selection": { license: "MIT", texts: ["texts/toggle-selection.txt"] },
    "truncate-utf8-bytes": { sameAs: "utf8-byte-length" },
};

/** What packages contain besides their modules. */
const CONTENTS: Record<string, Override> = {
    "@braintree/sanitize-url": { license: "MIT", texts: ["texts/sanitize-url.txt"] },
    "@bufbuild/protobuf": { license: "Apache-2.0 AND BSD-3-Clause", texts: [APACHE, "texts/protobuf.txt"] },
    "@fluent/bundle": APACHE_LICENSED,
    "@fluent/dom": APACHE_LICENSED,
    "@hapi/bourne": { license: "BSD-3-Clause", texts: ["texts/bourne.txt"] },
    "@jitsi/js-utils": APACHE_LICENSED,
    "@jitsi/logger": APACHE_LICENSED,
    "@livekit/mutex": APACHE_LICENSED,
    "Abseil": APACHE_LICENSED,
    "browser-pack": { license: "MIT", texts: [MIT] },
    "cached-iterable": APACHE_LICENSED,
    "Eigen": { license: "MPL-2.0", texts: [MPL], remark: "Source code: https://gitlab.com/libeigen/eigen" },
    "Emscripten": { license: "MIT OR NCSA", texts: ["texts/emscripten.txt"] },
    "FarmHash": { license: "MIT", texts: ["texts/farmhash.txt"] },
    "FFT2D": { license: "permission of the author", texts: ["texts/fft2d.txt"] },
    "FlatBuffers": APACHE_LICENSED,
    "FP16": { license: "MIT", texts: ["texts/fp16.txt"] },
    "gemmlowp": APACHE_LICENSED,
    "jose": { license: "MIT", texts: ["texts/jose.txt"] },
    "KaTeX fonts": {
        license: "OFL-1.1",
        texts: [OFL],
        copyright:
            "Copyright (c) 2009-2010, Design Science, Inc. (<www.mathjax.org>)\n" +
            "Copyright (c) 2014-2018 Khan Academy (<www.khanacademy.org>),\n" +
            "with Reserved Font Names KaTeX_AMS, KaTeX_Caligraphic, KaTeX_Fraktur, KaTeX_Main, KaTeX_Math,\n" +
            "KaTeX_SansSerif, KaTeX_Script, KaTeX_Size1 to KaTeX_Size4, KaTeX_Typewriter.",
    },
    "LLVM's C and C++ libraries": { license: "Apache-2.0 WITH LLVM-exception", texts: ["texts/llvm.txt"] },
    "machina": { license: "MIT", texts: ["texts/machina.txt"] },
    "musl": { license: "MIT", texts: ["texts/musl.txt"] },
    "normalize.css": { license: "MIT", texts: ["texts/normalize.css.txt"] },
    "OpenCV": { ...APACHE_LICENSED, remark: "Version 4.13.0 in @mediapipe/tasks-vision 0.10.35" },
    "OpenSSL": {
        ...APACHE_LICENSED,
        remark: "Version 3.6.3 in @matrix-org/seshat 6.0.1",
        copyright:
            "Copyright (c) 1998-2026 The OpenSSL Project Authors\n" +
            "Copyright (c) 1995-1998 Eric A. Young, Tim J. Hudson\n" +
            "All rights reserved.",
    },
    "PKCS #11 headers": { license: "permission of the authors", texts: ["texts/pkcs11-headers.txt"] },
    "postis": { license: "MIT", texts: ["texts/postis.txt"] },
    "Protocol Buffers": { license: "BSD-3-Clause", texts: ["texts/protobuf.txt"] },
    "pthreadpool": { license: "BSD-2-Clause", texts: ["texts/pthreadpool.txt"] },
    "ruy": APACHE_LICENSED,
    "Rust's standard library": { license: "Apache-2.0 OR MIT", texts: [APACHE] },
    "sdp": { license: "MIT", texts: ["texts/sdp.txt"] },
    "SQLCipher": {
        license: "BSD-3-Clause",
        texts: ["texts/sqlcipher.txt"],
        remark: "Version 4.5.3 in @matrix-org/seshat 6.0.1",
    },
    "SQLite": {
        license: "public domain",
        texts: ["texts/sqlite.txt"],
        remark: "Version 3.39.4 in @matrix-org/seshat 6.0.1",
    },
    "TensorFlow Lite": { license: "Apache-2.0", texts: [APACHE, "texts/tensorflow-caffe.txt"] },
    "Unicode data": { license: "Unicode-3.0", texts: [UNICODE] },
    "vite": { license: "MIT", texts: ["texts/vite.txt"] },
    "webrtc-adapter": { license: "BSD-3-Clause", texts: ["texts/webrtc-adapter.txt"] },
    "XNNPACK": { license: "BSD-3-Clause", texts: ["texts/xnnpack.txt"] },
};

/** Files kept in the repository, or code in its own files, that aren't from packages. */
const VENDORED_WORKS: Record<string, Override> = {
    "Default cover photo": { license: "CC-BY-SA-4.0", texts: ["texts/cover-photo.txt"] },
    "favico.js": {
        license: "MIT",
        texts: ["texts/favico.txt"],
        remark: "The badge of the favicon is based on it.",
    },
    "Jitsi Meet external API": {
        license: "Apache-2.0",
        texts: ["../../../web/res/jitsi_external_api.min.js.LICENSE.txt"],
    },
    "Modernizr": {
        license: "MIT",
        texts: [MIT],
        copyright:
            "Copyright (c) Faruk Ates, Paul Irish, Alex Sexton, Ryan Seddon, Patrick Kettner, Stu Cox, Richard Herrera, Veeck",
    },
    "Nunito": {
        license: "OFL-1.1",
        texts: [OFL],
        copyright: "Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/NunitoFont)",
    },
    "Twemoji Mozilla": {
        license: "Apache-2.0 AND CC-BY-4.0",
        texts: ["texts/twemoji-colr.txt", APACHE],
        remark:
            "A font by Mozilla (https://github.com/matrix-org/twemoji-colr), converted from Twemoji, emoji art by\n" +
            "Twitter, Inc and other contributors (https://github.com/jdecked/twemoji).",
    },
};

const MEDIAPIPE_LIBRARIES = [
    "Abseil",
    "Eigen",
    "Emscripten",
    "FarmHash",
    "FFT2D",
    "FlatBuffers",
    "FP16",
    "gemmlowp",
    "LLVM's C and C++ libraries",
    "musl",
    "OpenCV",
    "Protocol Buffers",
    "pthreadpool",
    "ruy",
    "TensorFlow Lite",
    "XNNPACK",
];

export const overrides: Overrides = {
    notices: {
        ...ELEMENT_CALL_PACKAGES,
        ...PACKAGES_WITHOUT_LICENSE_FILE,
        ...CONTENTS,
        ...VENDORED_WORKS,
        "@element-hq/element-call-component": ELEMENT_CALL,
        "@element-hq/element-call-embedded": ELEMENT_CALL,
        "@vector-im/compound-design-tokens": {
            ...ELEMENT,
            copyright: "Copyright (c) 2025 Element Creations Ltd.\nCopyright (c) 2023 - 2025 New Vector Ltd.",
        },
        "@vector-im/compound-web": { ...ELEMENT, copyright: "Copyright (c) 2023-2026 New Vector Ltd" },
        "@vector-im/matrix-wysiwyg": MATRIX_WYSIWYG,
        "@vector-im/matrix-wysiwyg-wasm": MATRIX_WYSIWYG,
        "applescript": { license: "MIT" },
        "caniuse-lite": {
            remark:
                "Browser support data of https://caniuse.com by Alexis Deveria and contributors, licensed under CC-BY-4.0\n" +
                "(https://creativecommons.org/licenses/by/4.0/), as condensed by caniuse-lite (https://github.com/browserslist/caniuse-lite).",
        },
        // The LGPL adds to the terms of the GPL
        "diff-dom": {
            extraTexts: [GPL],
            copyright: "Copyright (c) Johannes Wilm and contributors",
            remark: "Source code: https://github.com/fiduswriter/diffDOM",
        },
        "jszip": { license: "MIT" },
        "sanitize-filename": { license: "ISC" },
        "utf8-byte-length": { license: "MIT" },
    },

    contents: {
        "@element-hq/element-call-component": ["normalize.css"],
        // Its style sheet and the scripts made by its bundler have no source maps
        "@element-hq/element-call-embedded": [
            "normalize.css",
            "@fontsource/inconsolata",
            "@fontsource/inter",
            "rolldown",
            "vite",
        ],
        "@formatjs/intl-localematcher": ["Unicode data"],
        "@formatjs/intl-segmenter": ["Unicode data"],
        "@matrix-org/matrix-sdk-crypto-wasm": ["Rust's standard library"],
        "@matrix-org/seshat@6.0.1": ["OpenSSL", "Rust's standard library", "SQLCipher", "SQLite"],
        "@mediapipe/tasks-vision@0.10.35": MEDIAPIPE_LIBRARIES,
        "@vector-im/matrix-wysiwyg-wasm": ["Rust's standard library"],
        "emojibase-data": ["Unicode data"],
        "Jitsi Meet external API": [
            "@braintree/sanitize-url",
            "@hapi/bourne",
            "@jitsi/js-utils",
            "@jitsi/logger",
            "events",
            "postis",
        ],
        "katex": ["KaTeX fonts"],
        "livekit-client@2.22.3": [
            "@bufbuild/protobuf",
            "@livekit/mutex",
            "events",
            "jose",
            "loglevel",
            "machina",
            "sdp",
            "sdp-transform",
            "webrtc-adapter",
        ],
        "opus-recorder@8.0.5": ["Emscripten", "LLVM's C and C++ libraries", "musl"],
        "pkcs11js@2.1.7": ["PKCS #11 headers"],
        "posthog-js@1.408.2": ["fflate"],
        "unhomoglyph": ["Unicode data"],
        "vite-plugin-node-polyfills": ["process"],
    },

    unused: {
        // Command line interfaces
        "@maplibre/maplibre-gl-style-spec": ["minimist"],
        "katex": ["commander"],
        "pbf": ["resolve-protobuf-schema"],
        "qrcode": ["pngjs", "yargs"],
        // Build tools, of which only runtime code is bundled
        "matrix-web-i18n": ["*"],
        "react-redux": ["loose-envify"],
        "vite-plugin-node-polyfills": ["*"],
        // Types
        "dom-helpers": ["csstype"],
        // Updates the package's data when it is installed
        "browserslist": ["update-browserslist-db"],
    },

    origins: {
        "^decoder-ring/": null,
        "^decoderWorker\\.min\\.wasm$": "opus-recorder",
        "^fonts/fira-code-": "@fontsource/fira-code",
        "^fonts/inter-": "@fontsource/inter",
        "^fonts/KaTeX/": "katex",
        "^fonts/Nunito/": "Nunito",
        "^fonts/Twemoji_Mozilla/": "Twemoji Mozilla",
        "^jitsi_external_api\\.min\\.js$": "Jitsi Meet external API",
        "^opus-(de|en)coderWorker\\.min\\.": "opus-recorder",
        "^themes/element/img/backgrounds/lake\\.jpg$": "Default cover photo",
        "^wave-encoderWorker\\.min\\.": "opus-recorder",
        "^webpack://.*/src/favicon\\.ts$": "favico.js",
        "^webpack://.*/src/vector/modernizr\\.cjs$": "Modernizr",
        "^widgets/element-call/index\\.html$": "@element-hq/element-call-embedded",
        "^widgets/element-call/assets/inconsolata-": "@fontsource/inconsolata",
        "^widgets/element-call/assets/inter-": "@fontsource/inter",
        "^widgets/element-call/assets/matrix_sdk_crypto_wasm_bg-": "@matrix-org/matrix-sdk-crypto-wasm",
        "^widgets/element-call/assets/rolldown-runtime-": "rolldown",
        "^widgets/element-call/assets/selfie_segmenter-": "@mediapipe/tasks-vision",
        "^widgets/element-call/assets/vision_wasm_internal-": "@mediapipe/tasks-vision",
    },

    rustPackages: Object.keys(rustPackages),
};
