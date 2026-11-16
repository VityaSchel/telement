# Telement

Telement is a fork of [Element Web and Element Desktop](https://github.com/element-hq/element-web) restyled to match
Telegram's UX and UI. The reference clients are Telegram for macOS, Android and iOS; Telegram Desktop (Windows/Linux)
and Telegram Web are used where they fit better.

Telement adds features and UX changes on top of Element instead of rewriting it, so upstream releases keep flowing in.
Most rules below exist to keep that merge cheap.

Telement keeps every Element feature. An Element feature is changed, hidden or removed only when it conflicts with
something Telement builds, and each such case goes into the [decision log](#decision-log).

This file covers what is specific to the fork: workflow, decisions and upstream merge notes. Upstream documentation
([README.md](./README.md), [CONTRIBUTING.md](./CONTRIBUTING.md), [code_style.md](./code_style.md),
[developer_guide.md](./developer_guide.md), [docs/](./docs)) still applies unless this file says otherwise.

## Remotes and branches

| Name             | What                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `origin`         | The Telement repository (Forgejo).                                               |
| `upstream`       | [element-hq/element-web](https://github.com/element-hq/element-web). Fetch only. |
| `main`           | Default branch: the latest merged upstream release plus all Telement work.       |
| `feature/<name>` | Work in progress, branched off `main`.                                           |

- `main` takes upstream **release tags** (`vX.Y.Z`) through signed merge commits. It never takes upstream `develop`
  or release candidates directly.
- No local branch mirrors upstream. Use `upstream/develop` and the tags.
- Feature branches are rebased onto `main` and fast-forwarded, so Telement's own history stays linear between upstream
  merges.

Useful views of the fork:

```sh
# Last upstream release merged into main
git tag --merged main --sort=-v:refname --list 'v[0-9]*' | grep -v -- -rc | head -1
# Every Telement commit, and the total Telement diff, relative to that release
git log --no-merges v1.12.33..main
git diff v1.12.33 main
```

### Why release tags and not upstream `develop`

- Element releases every two weeks: `develop` → `staging` (release candidates) → tag on `master`. A release pins
  `matrix-js-sdk` to a published version, while `develop` pins a moving commit of the SDK's `develop` branch.
- Telement releases then map one-to-one to Element releases, and upstream's changelog describes what we ship.
- Two weeks of upstream is roughly 80–125 merged PRs touching about 500 files, mostly under `apps/web/src`. That is a
  manageable merge.
- Release tags form one line (`v1.12.33` → `v1.12.34-rc.0` → … → `v1.12.34`), so each merge brings exactly one
  release's worth of changes.

### Why merge and not rebase

- Upstream churn sits in the same UI code Telement changes: the room list, the timeline and the composer are all being
  moved to MVVM. With a rebase, every Telement commit that touches a changed file conflicts on its own at every sync,
  and the work grows with the number of Telement commits. A merge resolves each conflict once.
- Published history never changes: no force-pushes, Forgejo pull requests and release tags stay valid, and commits
  keep their original signatures.
- Telement's changes stay easy to list with the commands above.

## Syncing with upstream

One-time local setup:

```sh
git config rerere.enabled true          # reuse conflict resolutions across merges and trial merges
git config merge.conflictStyle zdiff3   # show the common ancestor inside conflict markers
```

For each upstream release:

```sh
git fetch upstream --tags
git switch main
git merge-tree --write-tree --name-only main vX.Y.Z   # preview conflicting files; changes nothing
git merge --no-ff -S<key-id> -m "Merge upstream vX.Y.Z" vX.Y.Z
pnpm install
pnpm -r --workspace-concurrency=1 lint:types
pnpm test:unit
```

- Regenerate generated files instead of merging them by hand:
    - `pnpm-lock.yaml`: take upstream's version, then run `pnpm install`.
    - `apps/web/res/css/_components.pcss`: run `pnpm --filter element-web rethemendex`.
    - `apps/web/src/i18n/strings/en_EN.json`: take upstream's version, then run `pnpm i18n`.
- Start the app and check the screens Telement changes.
- Add a row to the [upstream merge log](#upstream-merge-log), noting conflicts and anything surprising.

Between releases, preview what the next merge will conflict on:

```sh
git fetch upstream
git merge-tree --write-tree --name-only main upstream/develop
```

## Commits, tags and upstream contributions

- Follow upstream's [code_style.md](./code_style.md): one concern per commit, short imperative subject, no
  conventional-commit prefixes, and never mix formatting changes with behavior changes.
- Commit messages are a single line. Keep history linear, and fold a fix into the commit it fixes unless that commit
  has already been pushed.
- Sign every commit and tag with an explicit key: `git commit -S<key-id>`, `git tag -s -u <key-id>`.
- New files need a copyright header. Put your own name as the holder (`Element Creations Ltd.` is only for work done
  as part of Element) and the package's open-source licences without Element's commercial option, which covers only
  agreements with Element. Upstream files almost all use
  `AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial`, so Telement files use `AGPL-3.0-only OR GPL-3.0-only`.

    ```
    /*
    Copyright 2026 Your Name

    SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
    Please see LICENSE files in the repository root for full details.
    */
    ```

    `oxlint --fix` inserts Element's header automatically, so check what it adds. Leave headers on existing files alone.

- See [versions and release tags](#versions-and-release-tags) for tagging releases.
- Telement does not generally send changes upstream. Features, refactors and performance work stay here. Critical bug
  fixes, security fixes and small layout fixes may go upstream, submitted manually by the maintainer (see
  [upstream pull requests](#upstream-pull-requests)). Keep those in standalone commits that apply cleanly to upstream
  `develop`, with no dependency on Telement code, so they can be cherry-picked.

### Versions and release tags

- Telement uses Element's version numbers. A release built from upstream `v1.12.34` plus Telement's changes is
  Telement 1.12.34. The `version` fields in the `package.json` files stay as upstream sets them.
- Tag a release on the `main` commit that was released, with the `telement-` prefix:

    ```sh
    git tag -s -u <key-id> -m "Telement v1.12.34" telement-v1.12.34
    git push origin telement-v1.12.34
    ```

- Plain `vX.Y.Z` names belong to upstream: `git fetch upstream` puts its tags in the same local namespace, so a
  Telement tag with the same name would collide. Push tags by name; `git push --tags` would also push every upstream
  tag to origin.
- The web packaging scripts (`apps/web/scripts/package.sh`, `scripts/docker-package.sh`) name the build after
  `git describe`. Pass the version explicitly, for example `DIST_VERSION=v1.12.34 pnpm --filter element-web dist`.
- Telement-only fixes ship with the next upstream merge. If one can't wait, pick a hotfix numbering scheme then and
  record it here.

### Upstream pull requests

Decided 2026-11-13: layout fixes that also apply to Element go upstream as about nine small pull requests, one per
component or area, because Element merges small fixes tied to one issue each.

- Each is prepared as a local branch `telement-upstream/<area>` based on upstream `develop`: `bubble-media`,
  `bubble-rows`, `code-quotes`, `dialogs-login`, `event-summary`, `misc-chrome`, `polls-cards`, `spaces-panels` and
  `thread-panel`.
- The maintainer writes each title and description and opens the pull request himself, from a branch of his fork:
  since 2026-10-02 Element closes pull requests with AI-written descriptions (CONTRIBUTING.md), and its AGENTS.md
  tells agents not to open them. Agents prepare the commits, tests, baselines and before/after images; the maintainer
  ticks the template's "AI assistance" box.
- Each pull request needs the Element CLA signed through cla-assistant (the commit email must belong to the GitHub
  account that signed), a linked issue (`Fixes #…`; file a bug report first if none exists, which adds T-Defect), a
  before/after screenshot table, and the Linux screenshot baselines it moves regenerated in Docker.
- Interface-only right-to-left fixes and accessibility-only fixes stay out of these pull requests.

## Changing upstream code

Every upstream merge is reviewed by hand anyway, so Telement doesn't keep code it doesn't use just to make merges
easier.

1. **Remove what Telement doesn't use.** When Telement replaces or drops an upstream feature, delete the upstream code
   and its tests rather than hiding it behind a switch or config. The same goes for analytics, metrics and anything
   that contacts Element's servers.
2. **Hardcode Telement's choices.** Behavior Telement always wants is written into the code, not left as a setting or
   a config default.
3. **Touch no more than the change needs.** Don't reformat, reorder or rename upstream code around a change.
4. **Telement's own code goes in `telement` folders**, so it's easy to find and never collides with files upstream adds:
    - views: `packages/shared-components/src/telement/<domain>/<Name>View/`
    - view models: `apps/web/src/viewmodels/telement/<domain>/`
    - other app code: `apps/web/src/telement/`
    - styles for Telement components: `apps/web/res/css/telement/`
    - Desktop: `apps/desktop/telement/` (build variant and scripts), `apps/desktop/src/telement/`
    - assets shared by several packages: `telement/` at the repository root

    New UI follows upstream's MVVM rules ([docs/MVVM.md](./docs/MVVM.md)).

5. **Styles of upstream components are edited in place**, in upstream's stylesheets, using Compound design tokens or
   Telement's radius and spacing tokens (see [radius and spacing](#radius-and-spacing)). Replace a value with a token
   only on lines or in rules Telement changes anyway; never sweep upstream stylesheets.
6. **Strings.** Use `telement|…` translation keys so Telement's strings land in one block of `en_EN.json`. Run
   `pnpm i18n` in `apps/web` and `packages/shared-components` after removing code, so unused strings go too.
7. **Extension points.** The module API (`packages/module-api`) offers custom message renderers, composer upload
   options and component visibility; use it where it fits.

## Behavior changes

What Telement changes in Element's behavior, apart from the features described further down:

- **Room list:** one flat list. Message previews are always shown, and there are no sections: the settings
  `RoomList.showMessagePreview`, `RoomList.showSections` and `RoomList.showPeopleSection` are gone, and so is the
  sections code (custom sections, section headers, drag and drop, the "Introducing Sections" announcement). People
  and low priority remain as filters. Marking a room pinned or low priority no longer clears a custom section
  tag that Element set.
- **Room list rows** are laid out like Telegram for macOS: a 48px avatar, the name with the time of the room's last
  activity at the end of its line, and two lines of message preview. The time follows Telegram Desktop: the time of day
  if it was today or under 20 hours ago, the short weekday within 7 days, the locale's short date before that; it
  updates at midnight. In group rooms the preview starts with "Sender:", or "You:" for your own messages; one-to-one
  chats show only the text (Element showed the sender there too). Emotes, calls and reactions keep Element's sentence.
  Someone typing replaces the preview, in the accent color. Names are always medium weight: Element's bold and gray
  names are gone, and only the badges show unread rooms. Badges, the pin and the call, invite and unsent icons always
  sit on the row's bottom line and stay while hovering. The selected room is a solid accent plate with inverted text,
  icons and badges, in place of Element's marker at the panel's edge.
- **Drafts and read checks in the room list:** a draft left in a room replaces its preview with a red "Draft:" and the
  draft's text, except for the open room, whose draft is in the composer. The composers save drafts in local storage
  when the user leaves the room and now tell the room list (`telement/room-list/roomDrafts.ts`), which also hears other
  tabs. When the last message is the user's own, a check before the time shows its state, as in Telegram: a clock while
  it is being sent, one check once sent, two once any other member has read it. Failed messages keep Element's unsent
  icon instead.
- **Pinned chats:** Element's favourites are called "Pinned" (room menus say "Pin"/"Unpin", room info says "Pin to
  top") and always sit at the top of the list under every sort, ordered among themselves by the active sort; the
  `m.favourite` order value is ignored and there is no Pinned filter. A pin tilted 45° sits at the end of the row's
  bottom line, where any unread, mention, invite, call or unsent decoration replaces it. Every trailing decoration
  sits on that line, as in Telegram, whatever the preview's length, and a muted room's bell sits right after its name.
  A previewed, unjoined room appears below the pinned rooms. The store's sorted lists, which modules and the Home
  button's "jump to unread" use, return pinned rooms first.
- **Muted chats:** show their unread messages in a gray counter, as in Telegram, counted from the loaded timeline
  (`countUnreadMessages`), since the mute push rule gives them no notification count. A message Element would
  highlight if the chat weren't muted adds the accent @: the user's push rules are evaluated without the chat's mute
  rule, so direct mentions and replies, the display name or user name, `@room` from a sender allowed to notify the
  room, and keywords count, and turning all notifications off stops them. Muted counts don't feed the Unread filter or
  the space and app badges.
- **Room menus:** hovering a room shows only the "…" button, in the time's place, and the badges stay; the bell button
  is gone. The notification options are a "Notifications" submenu in the "…" and right-click menus. Room menus have
  the message menu's size (16px icons, 15px text, 4px padding, 8px item highlights, 12px corners).
- **Search fields:** `SearchFieldView` (shared) is Telegram's search field: centred at rest, sliding left on focus,
  with a clear button. The emoji and reaction pickers use it; it scrolls away with the emoji while the category bar
  sticks. Pickers open with focus on the selected category, not on the search field. The room list search keeps Element's search dialog but looks like the field at rest
  (`SearchFieldButtonView`).
- **Timestamps:** always shown; the "Always show message timestamps" setting is gone. Modern layout: at the right of
  the last line, in a reserved gutter. Bubbles: in the bottom-right corner, sharing the last line when it fits.
  Pictures, stickers and videos without a caption show the time as a dark pill over the media's bottom-right corner. The filename and size banner shown when hovering a picture is gone.
- **Message menu:** right-clicking anywhere on a message row (margins, avatar, sender, reply quote, reactions,
  receipts) opens the message menu, with "Copy image" on pictures and "Copy link" on links. Every message with a file
  has "Save as…", which opens the system save dialog in Chromium and Telement Desktop (File System Access API) and
  downloads elsewhere; the picture viewer's Download is "Save as…" too. Electron's own picture menu is gone.
  `BasePlatform.allowOverridingNativeContextMenus()` is gone.
- **Videos:** regular videos never play in the timeline. They show a poster with a play button, the length at the top
  left and the time at the bottom right, and open in a full-window viewer (`VideoLightboxView`) with play/pause, a seek
  bar, volume, speed (0.5–2×), full screen (the whole page), Save as…, Forward, and keys Space, ←/→, M, F and Escape.
  The controls float in a bar up to 640px wide at the bottom and hide, with the pointer, after 3 s of playback without
  input; they stay while paused, loading or hovered. Round video notes still play inline. The `autoplayVideo` setting
  only affects video notes.
- **Reply preview:** the composer shows "Reply to <name>" in the sender's colour with the quote's vertical line and a
  one-line excerpt, like the reply quote in messages; Element's "Replying" header is gone.
- **Cursors:** the arrow on every control (`apps/web/res/css/telement/_Cursor.pcss`); the hand only on links in
  message text and link preview headers; the I-beam over the whole text of a message; not-allowed on disabled
  controls.
- **Dialogs with tabs** (user, room and space settings) focus the selected tab when they open, so Escape works
  straight away. Before, focus could fall to the page when React replaced the first focused element.
- **Stickers:** the "Show stickers button" setting is gone; stickers are available whenever widgets are
  (`UIFeature.Widgets`).
- **Defaults:** GIFs autoplay, and the message layout is bubbles.
- **Preferences:** the "Room list" subsection only appears when its settings list in `PreferencesUserSettingsTab` is
  not empty, which it is today.
- **Settings button:** the gear at the bottom of the space panel opens Settings directly. Element's "Quick settings"
  popup offered only "All settings", a theme switcher and, in developer mode, a developer tools shortcut; it is gone.
  Themes are in Settings › Appearance and developer tools stay reachable with `/devtools`.
- **Update banner:** "What's new" no longer fetches Element's commit log from riot.im; the changelog dialog is gone.
  Desktop release notes from an update feed still show.

## Branding

Telement presents itself as one Matrix client among many. Where Element's apps or pages are the useful pointer,
Telement names them, and mentions that any Matrix client works.

- **Name:** the default `brand` is Telement (SdkConfig defaults, `config.sample.json`, Desktop's config). The page
  title, web app manifest, error pages and unsupported-browser screen say Telement. Upstream strings that hardcode
  "Element" in every language moved to `telement|…` keys, so other languages show them in English until Telement has
  translations.
- **Logos:** the icon script overwrites Element's logo files in place (see [Icons](#icons)), and the static error
  pages embed the same round logo. Link previews (`og:image`) use `https://telement.hloth.dev/logo.png`; Element's
  `opengraph.png` is deleted.
- **Links:** help links still go to Element's help pages, which describe the same features. The logo links to
  `https://telement.hloth.dev`. The login footer shows "Source code" (the Telement repository) and "Powered by
  Matrix".
- **Downloads:** "Use Telement Desktop" prompts link to the repository until there are public builds. Mobile prompts
  recommend Element X, since Telement has no mobile app, and the mobile guide links to
  [matrix.org's client list](https://matrix.org/ecosystem/clients/). Its sign-in button still opens Element X through
  mobile.element.io.
- **Wording:** QR login says "Open your Matrix client on your mobile device"; DMs started by email wait for users to
  "join Matrix". The "Go to element.io" link on the loading error page is gone.
- **Unchanged on purpose:** "Element Call" (a product name), the Jitsi default `meet.element.io`, and the identity
  server and integration manager, which will be revisited.

## Local development

Prerequisites:

- Node.js at the version in `.node-version`; `fnm` and `nvm` pick it up.
- pnpm 12 (`pnpm self-update 12` or `npm install -g pnpm@12`). It downloads and runs the exact version pinned in
  `devEngines` in `package.json` by itself, so upstream's version bumps need no action. pnpm 8 and older can't read
  the lockfile (format 9.0) or the workspace catalogs, and Node 25+ no longer ships corepack.
- A container runtime (Docker, Podman or Colima) only for the Playwright end-to-end tests.

```sh
pnpm install
cp apps/web/config.sample.json apps/web/config.json   # then edit it, see docs/config.md
cd apps/web && pnpm start                             # http://127.0.0.1:8080
```

- `pnpm start` runs the webpack dev server with hot reload, plus watch builds of `shared-components`, `shared-utils`
  and `module-api`. An edit under `apps/web/src` recompiles in about 2 seconds.
- For views in `packages/shared-components`, Storybook is the fastest loop:
  `cd packages/shared-components && pnpm storybook`.
- To run Desktop against the local web build:
  `cd apps/desktop && ln -s ../web/webapp ./ && pnpm start`.
- Run single unit test files as described in [AGENTS.md](./AGENTS.md#running-unit-tests).

### Build cost

Measured 2026-11-10 on a MacBook Pro (M1 Pro, 10 cores, 16 GB RAM), Node 26.13.0, pnpm 12.18.0, upstream `develop` at
`b9ce553db6`. Memory figures are approximate because macOS compresses idle memory.

| Task                                                                          | Wall time                        | Peak memory |
| ----------------------------------------------------------------------------- | -------------------------------- | ----------- |
| `pnpm install`, empty pnpm store                                              | 89 s (network-bound)             | 0.9 GB      |
| Production build, cold caches (`nx build element-web --skip-nx-cache`)        | 107 s (webpack 84 s)             | 2.0 GB      |
| Production build, warm caches                                                 | 65 s (webpack 50 s)              | 2.6 GB      |
| `pnpm start` until the first compile finishes                                 | 40 s                             | 1.1 GB      |
| Dev server alone on Node, first compile (cold / warm Babel cache)             | 25 s / 18 s                      | 1.2 GB      |
| Dev server alone on Bun 1.4.4 (`bun --bun`), first compile                    | 33 s                             | 2.1 GB      |
| Recompile after editing one `.tsx` file (Node / Bun)                          | 1.2–1.9 s / 2.7 s                |             |
| Telement Desktop, unpacked macOS app (`apps/desktop/telement/build.sh --dir`) | 115 s (web 72 s, packaging 28 s) | 2.0 GB      |

- The cold production build used 178 s of CPU time, so about three cores on average.
- Disk: `node_modules` takes 1.6 GB, the git history 0.6 GB, and `apps/web/webapp` 189 MB (including source maps).
- 16 GB of RAM is comfortable for development with an IDE and a browser open.

### Bun

Bun was measured and is not used:

- **As the runtime** for the dev server it works but is slower than Node (33 s against 18 s to the first compile,
  2.7 s against 1.2–1.9 s per recompile) and uses about twice the memory.
- **As the package manager** it would replace pnpm features the repository depends on (catalogs,
  `patchedDependencies`, `allowBuilds`, `packageExtensions`, `devEngines`) and the pnpm lockfile, which upstream
  changes several times a week. Every upstream dependency update would then conflict.
- Repository scripts run as `node scripts/*.ts` using Node's built-in TypeScript support. Telement scripts in the
  repository do the same, so contributors only need Node and pnpm.

If builds need to get faster later, the options all mean editing upstream's `apps/web/webpack.config.ts`: webpack's
filesystem cache for faster dev server restarts, or swc/esbuild loaders or Rspack in place of Babel. The current
numbers do not justify the divergence.

### Tooling that assumes upstream branch names

- `diff-cover.toml` compares against `origin/develop`, which does not exist here. Pass the comparison branch
  explicitly, for example `pnpm coverage:diff --compare-branch=v1.12.33`.
- `nx.json` sets `defaultBase` to `develop`. It only matters for `nx affected`, which the scripts do not use.

## Desktop

Telement Desktop has its own identity, so it installs and runs next to Element Desktop.

### Building

```sh
apps/desktop/telement/build.sh --dir         # unpacked app in apps/desktop/dist, quickest to test
apps/desktop/telement/build.sh               # installers (dmg and zip on macOS)
apps/desktop/telement/build.sh --reuse-web   # skip rebuilding apps/web/webapp
```

The script builds the web app, copies it to `apps/desktop/webapp` with Telement's `config.json`, packs it into
`webapp.asar`, and runs electron-builder with `VARIANT_PATH=telement/release/build.json`. Extra arguments go to
electron-builder.

- **Signing (macOS):** electron-builder signs with the first "Developer ID Application" identity in the keychain. Set
  `CSC_IDENTITY_AUTO_DISCOVERY=false` for an unsigned local build, or `CSC_NAME` to pick an identity.
- **Notarization (macOS):** store the Apple credentials in the keychain once with
  `xcrun notarytool store-credentials telement --apple-id <apple-id> --team-id <team-id>`, then build with
  `APPLE_KEYCHAIN_PROFILE=telement APPLE_TEAM_ID=<team-id>`. Without these variables electron-builder skips
  notarization.

### What makes it Telement

- `apps/desktop/telement/release/build.json` is the build variant: app ID `dev.hloth.telement`, product name
  Telement, Linux package `telement-desktop`, and the single URL scheme `dev.hloth.telement`. Electron derives the
  profile directory from the product name (`~/Library/Application Support/Telement` on macOS).
- Desktop used to register `element://` at runtime whatever its variant said. It now registers only the variant's
  schemes: the second one counts as the legacy `scheme://` form, and Telement has none.
- `apps/desktop/telement/release/config.json` is the web app config embedded in Desktop. Compared with Element's
  (`element.io/release/config.json`) it keeps the matrix.org homeserver, Element's identity server (`vector.im`) and
  integration manager (Scalar), and drops the update feed, crash report upload (`bug_report_endpoint_url`), PostHog
  analytics, the map tile key and Element's terms and privacy links. Without them there are no automatic updates, no
  "submit debug logs", and location sharing maps only work on homeservers that advertise a tile server.
- `web_base_url` and `help_url` keep Element's defaults (`app.element.io`, Element's help centre) until Telement hosts
  its own. `web_base_url` is used for Jitsi widget links and for links copied from inside the app.
- `apps/desktop/package.json` sets the product name, so `pnpm start` in `apps/desktop` uses the Telement profile and
  never opens Element Desktop's data, and the publisher (`Viktor Shchelochkov <hi@hloth.dev>`), homepage and
  repository shown in installer metadata.
- `apps/desktop/src/telement/variant.test.ts` checks the variant and config: no Element URL schemes or services, and
  the OAuth rules below.

### OAuth login

Matrix's OAuth 2.0 login (used by matrix.org and other servers with next-generation auth) registers every client with
a `client_uri`. The spec requires the client's custom URL scheme to start with that host in reverse-DNS order, and
every other URI it registers (logo, terms, privacy policy) to be on the same host or a subdomain. A server rejects a
registration that breaks these rules, and login fails.

- Telement registers `client_uri` `https://telement.hloth.dev` with the scheme `dev.hloth.telement` and the logo
  `https://telement.hloth.dev/logo.png` (`oidc_metadata` in the config).
- `https://telement.hloth.dev/logo.png` serves `apps/web/res/vector-icons/1024.png`; upload it again whenever the
  icon changes. The site root still returns 404, and the login consent screen links to it.
- Unpackaged runs (`pnpm start` in `apps/desktop`) still use Element's built-in scheme `io.element.desktop`, which
  doesn't match Telement's client URI. Test OAuth login with a packaged build.

### Icons

- Every app icon is rendered from `telement/branding/icon.svg` by `telement/branding/generate-icons.sh` (needs
  `rsvg-convert` and ImageMagick 7). Output is byte-for-byte reproducible.
- The icon is a white "T" on a blue gradient. To change it, edit `icon.svg` and run the script.
- The script overwrites upstream's icon files in place (`apps/desktop/build/icon.*`, `install-spinner.gif`,
  `apps/web/res/vector-icons/*.png`, `element-app-logo.png`, and both `element-logo.svg` files: the web theme's and the
  mobile guide's). If an upstream merge conflicts on one of them, keep ours and rerun the script.
- Round icons have transparent corners everywhere, like upstream's. Only the macOS icon (`icon.icon`) is a full
  square, because macOS cuts its own shape.
- The login page shows `vector-icons/1024.png` through `branding.auth_header_logo_url` in the config.
- After changing the icon, regenerate the favicon screenshot baselines, which draw the unread badge over
  `vector-icons/144.png`: `pnpm --filter element-web test:unit:screenshots apps/web/src/favicon.test.browser.ts`
  (needs Docker). The baselines committed with the new icon still show Element's icon.

### Element trademarks

Element's name, logo and device are registered trademarks of Element Creations Ltd. Their
[trademark policy](https://element.io/legal/trademark-policy) asks projects not to alter Element's logos or create
confusingly similar ones, so a recolored Element logo is not an option, and not to incorporate Element trademarks in
app names. The AGPL covers copyright only; section 7(e) lets licensors withhold trademark rights. Telement uses its own
icon and keeps its name by choice.

### Known gaps

- The Linux package still recommends `element-io-archive-keyring`. apt skips it when Element's repository isn't
  configured.
- The `ELEMENT_PROFILE_DIR` environment variable is shared with Element Desktop: if it is set, both apps use the
  same profile directory.
- Only macOS builds have been tried. Windows and Linux packaging is untested.

## CI

- CI runs on a self-hosted Forgejo runner and costs money per run, so run lint and tests locally before pushing.
- Forgejo Actions uses the first of `.forgejo/workflows/`, `.gitea/workflows/` and `.github/workflows/` that exists,
  even if it holds no workflow files. `.forgejo/workflows/.gitkeep` keeps that directory present, so upstream's ~45
  GitHub workflows never run on our runner. Add Telement workflows (`*.yml`) next to it when needed.

## Matrogram review

[Matrogram](https://github.com/VityaSchel/matrogram) was an earlier fork with the same goal: 15 commits on Element
1.11.102 (2025-05-30 to 2025-06-06). Upstream has since replaced most of the code it changed: the legacy room list was
removed in 2026-07 ([element-web#34040](https://github.com/element-hq/element-web/pull/34040)), and
`MessageActionBar`, the event tile and the emoji picker moved to shared-components.
It is a source of ideas, not of code.

Already possible without code changes:

- One mixed chat list without sections: built in, as Telement removed the sections settings. Sorting already
  defaults to recent activity.
- A "new chat" button next to search: the new room list header already has a compose menu. Explore can be hidden with
  the `UIComponent.exploreRooms` customisation.
- Bubble layout, large images, all rooms in Home: the `layout`, `Images.size` and `Spaces.allRoomsInHome` settings.

Worth re-implementing on current code:

| Feature                                                       | Code now                                                                                                                          | Estimate | Upstream churn |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------- |
| Telegram-style chat tile (50 px avatar, 2-line preview, time) | `packages/shared-components/src/room-list/VirtualizedRoomListView/`, `apps/web/src/viewmodels/room-list/RoomListItemViewModel.ts` | 4–8 h    | high           |
| Chat wallpaper pattern                                        | `apps/web/res/css/structures/_RoomView.pcss`, plus `TimelineView.module.css` for the labs timeline                                | 2–4 h    | low            |
| Quick reactions above the message context menu                | `apps/web/src/components/views/context_menus/MessageContextMenu.tsx`, `ReactionPicker.tsx`                                        | 4–6 h    | low–medium     |
| Context menu on right-click anywhere in a message             | `EventTileView.tsx` in shared-components                                                                                          | 1 h      | high           |
| Bubbles: own messages on the right without an avatar          | `EventTileView.module.css` custom properties                                                                                      | 1–2 h    | high           |
| Composer: attachments on the left, mic in place of Send       | `apps/web/src/components/views/rooms/MessageComposer.tsx`, `MessageComposerButtons.tsx`                                           | 8–12 h   | medium         |
| Emoji/stickers tabs in one popover                            | `EmojiButton.tsx`, `Stickerpicker.tsx`                                                                                            | in above | medium         |
| Shortcode tooltip on emoji in the picker                      | `packages/shared-components/src/core/EmojiPicker/Emoji.tsx`                                                                       | 0.5 h    | low            |

Matrogram's `src/utils/Reaction.ts` (commit `cfcb1f0b78`) can be reused nearly as-is. Its other code is reference
only.

Do not repeat:

- Deleting the message action bar or the chat tile hover menus. They are the keyboard and touch path to reply, react
  and edit. Restyle them instead.
- Removing encryption indicators or presence badges without showing them somewhere else.
- Replacing the voice recorder with the video recorder; untranslated strings; missing copyright headers.
- Adding Telegram's wallpaper images without a source and licence notice (see [chat wallpapers](#chat-wallpapers)).

## Roadmap notes

### Chat wallpapers

- Matrogram's images are byte-identical to `src/assets/chat-bg-pattern-light.png`, `chat-bg-pattern-dark.png` and
  `chat-bg-br.png` in Telegram Web A ([Ajaxy/telegram-tt](https://github.com/Ajaxy/telegram-tt)) at commit
  `dc69997bd3` (2022-05-30). Telegram Web A replaced them on 2026-01-13 with `src/assets/pattern.svg`.
- That repository is GPL-3.0 and names no separate licence for its assets, so Telement uses them under GPL-3.0.
  GPL-3.0 section 13 allows combining them with Telement's AGPL-3.0 code; the image files themselves stay GPL-3.0.
- When adding them, give them their own directory with a notice file naming the source repository, commit, path and
  licence and pointing to [LICENSE-GPL-3.0](./LICENSE-GPL-3.0). List any changes made to the images (GPL-3.0 section
  5a). Prefer the current `pattern.svg`: the SVG is its own source form and can be recolored and scaled.
- The GPL covers copyright, not trademarks: no Telegram name or logos in Telement's branding.

### Video messages (round video notes)

- Matrogram's prototype (`00a36c621c`, `416351657b`) is not a usable base. It labels WebM recordings as `video/mp4`,
  mixes up seconds and milliseconds in the duration, doesn't crop to a square, sends no thumbnail or size, and renders
  received notes as ordinary videos.
- [MSC4546 "Circles"](https://github.com/matrix-org/matrix-spec-proposals/pull/4546), open since 2026-09-17, marks an
  `m.video` with `"org.interferolog.circle": true` (stable key `m.circle`). The video must be 1:1, 512×512
  recommended. Clients without support show a normal video.
- mautrix-telegram marks bridged Telegram round videos with `info["fi.mau.telegram.round_message"]: true`.
- Decided (2026-11-11):
    - Telement sends `"org.interferolog.circle": true` and renders a video as a circle when it carries either MSC4546
      key. The mautrix-telegram flag is ignored, so bridged Telegram notes stay ordinary videos.
    - Recording works like Telegram: the composer's voice button toggles between microphone and camera on click.
      Pressing and holding records, dragging up locks hands-free recording, dragging left cancels, and releasing
      sends. Recordings stop at 60 seconds.
- Recording can sit next to voice messages (`apps/web/src/audio/`, `VoiceRecordComposerTile.tsx`). Playback can reuse
  the MVVM audio player pieces (`AudioPlayerViewModel`, shared `SeekBar`, `PlayPauseButton`, `Clock`) and
  `MVideoBodyView`.
- Status:
    - Received notes render as circles (`VideoNoteBodyView`, `VideoNoteBodyViewModel`, hooked into
      `MessageEvent.tsx`). They loop silently when videos may autoplay, play with sound on click with a progress
      ring, and only one plays with sound at a time. Reply quotes keep showing an ordinary video.
    - Recording (`VideoNoteRecorder`) and sending (`sendVideoNote`) are built and tested on the
      `feature/video-notes` branch. They merge into `main` together with the composer's record button.
    - Decided (2026-11-11): the mic/camera record button lands with the composer redesign, not in today's composer.
    - Not built yet: the record button and recording overlay, a playback hook so voice messages pause video notes,
      and a Playwright test.
- Rough size: 30–50 hours.

### Stickers pane

- Today stickers come only from the integration manager's sticker widget (`Stickerpicker.tsx`). Neither Element Web
  nor matrix-js-sdk 45 supports image packs.
- [Spec v1.19](https://spec.matrix.org/v1.19/client-server-api/#image-packs) (2026-07) standardized MSC2545 image
  packs:
    - An `m.room.image_pack` state event holds one pack: the `state_key` is the pack ID, `images` maps shortcodes to an
      `mxc` URL plus image info, and `pack` holds the name, avatar and `usage` (`sticker`, `emoticon`).
    - `m.image_pack.rooms` account data enables packs from the listed rooms in every room.
    - There is no personal pack outside a room. The spec dropped account-data packs on purpose: a personal library is a
      private room holding pack events. [MSC4476](https://github.com/matrix-org/matrix-spec-proposals/pull/4476)
      (open) adds a room type so clients can hide such rooms;
      [MSC4459](https://github.com/matrix-org/matrix-spec-proposals/pull/4459) (open) adds "add this sticker's pack"
      links.
- Cinny, FluffyChat and Nheko support packs only under the unstable names (`im.ponies.room_emotes`,
  `im.ponies.emote_rooms`, `im.ponies.user_emotes`), so Telement has to write both the stable and the unstable names.
- One state event holds up to 64 KiB, about 430 stickers with size info: more than a Telegram pack.
- Pack images, pack events and account data are not end-to-end encrypted, and `m.sticker` has no encrypted-file field.
  Stickers sent in encrypted rooms are unencrypted media, as with Element's sticker widget today.
- Telegram's animated stickers (TGS/Lottie and WebM) render in no Matrix client. Importing them means converting to
  animated WebP or GIF, which Element already plays.
- Options, with estimates that include tests and assume the emoji/stickers/GIF drawer exists:

    | Option                                                                         | Estimate | Sync and sharing                                                                                     | Trade-offs                                                                                                                                                   |
    | ------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | Native: one hidden private room with pack events, enabled through account data | 45–65 h  | All devices; packs shared with Cinny, FluffyChat and Nheko; their packs show up in Telement for free | Clients without MSC4476 show the pack room in their chat list; stable and unstable names written twice; pack edits from two devices can overwrite each other |
    | Device-only library with zip export and import                                 | 35–50 h  | None                                                                                                 | Browser storage can be evicted; Telement-only format                                                                                                         |
    | Custom account data                                                            | 30–40 h  | Telement only                                                                                        | Against the spec's direction; the whole library is rewritten on every change and races between devices                                                       |

- Decided (2026-11-11): native, with zip export and import added later as a backup format on top of it (about 6 h).

### GIFs

- Google shut down the public Tenor API on 2026-06-30. Telegram's GIF search runs through its own servers and its
  `@gif` bot, so it isn't usable without Telegram's API. GIPHY and Klipy are the providers other apps moved to.
- Every provider needs an API key (searched 2026-11-11: GIPHY, Klipy, gifs.chat, Imgur, Tumblr, Openverse,
  Wikimedia Commons and others). The keyless ones have no reaction GIFs or tiny anonymous quotas, and keyless GIPHY
  tools only reuse GIPHY's website key without permission. GIPHY's free key allows 100 searches per hour; Klipy's free
  test key also allows [100 requests per hour](https://docs.klipy.com/getting-started), and its free unlimited key
  needs a request in Klipy's Partner Panel.
- Decided (2026-11-11): GIF search is always on, with no setting to turn it off. Every search sends the user's IP
  address and query to the provider.
- Decided (2026-11-16), replacing the earlier choice of Klipy:
    - Provider: [GIPHY](https://developers.giphy.com/docs/api/), with the maintainer's key in `config.json`. Users
      can't enter their own key.
    - Search returns everything up to the R rating (`rating=r`).
    - A sent GIF is uploaded to the homeserver like any picture, so every Matrix client shows it. GIPHY's API rules
      say "Do not cache API responses or media URLs or cache or store copies of GIPHY's media assets"; the maintainer
      chose uploading anyway.
    - No analytics pingbacks. GIPHY recommends them but doesn't require them.
- GIPHY's rules and limits that shape the design:
    - Every key starts as a beta key: 100 API calls per hour shared by everyone using the build, and at most 50
      results per search. A production key lifts the limit after GIPHY reviews the app (screenshots or a video) and
      quotes a fee. So the GIFs tab searches after a pause in typing, not on every keystroke.
    - The "Powered By GIPHY" mark must be conspicuous wherever search is used. GIPHY's
      [logo files](https://developers.giphy.com/docs/api/) are the only allowed marks.
- Klipy, considered first: the search placeholder had to read "Search KLIPY", and its API rules forbid storing or
  re-hosting media without written approval.

### One emoji / stickers / GIF drawer and the composer

- The composer is still a legacy class component (`MessageComposer.tsx`), and upstream has no composer MVVM rewrite
  under way as of 2026-11. The emoji picker already lives in shared-components (props-based, not MVVM).
- Build the drawer as new MVVM views in Telement folders and hook it into the composer in one place.
- Decided (2026-11-11):
    - Telegram layout: a paperclip on the left opens the attachment menu, the emoji/stickers/GIF button sits inside
      the field on its right edge, and the far right shows the mic/camera record button while the field is empty and
      Send while typing. Element's "+" overflow menu goes away.
    - The paperclip menu holds Photo or video, File, Poll and Location, and Element's integration-manager sticker
      widget stays reachable from the Stickers tab.
    - The drawer opens on click as a popover above the composer, with Emoji, Stickers and GIFs tabs.
    - The composer shows no encryption indicators: the "room is not encrypted" lock and the verification shields
      move to the room header (corrected 2026-11-11 after the first version kept the shields in the composer).
- Build order: the layout and attachment menu, the encryption indicator in the room header, the drawer with the
  existing emoji picker, the record button with the video note overlay (merging `feature/video-notes`), then the
  Stickers and GIFs tabs.
- Implementation:
    - The Telegram layout is the only layout. Element's `MessageComposerButtons`, `EmojiButton`, `LocationButton`
      and the rich-text composer's built-in emoji button and lock were deleted, and upstream's tests were adapted or
      deleted with them.
    - Element's rich-text composer lab (off by default) keeps its "Show formatting" button, now in
      `TelegramComposerActions`.
    - The room header's `RoomEncryptionStatusIcon` shows the unencrypted lock for every room and the verified or
      untrusted state for group rooms; the header already showed it for DMs.
    - Styling: the composer has a visible top border (the light theme's hairline color is transparent) and 20px icons
      on 36px targets (the rich-text lab's formatting button keeps 24px). The buttons stay next to the last line of
      text as it wraps, and the attach button has no native tooltip. Upstream's 16px padding under the composer and its 55px
      minimum height are gone, so one line is 51px tall and multi-line text keeps 16px from the top and bottom. The
      rich-text lab's field is as tall as the buttons (36px for one line, in a 52px row) with 6px above and below its
      text, and its buttons sit on the last line like the plain composer's.
    - The drawer's Emoji/Stickers tabs sit at its bottom, as in Telegram for macOS; the picker's text can't be
      selected except in its search field. The picker's category tabs sit at its top, 8px from the top and sides, and
      the search field sits below them, scrolling away with the emoji. The drawer's corners are concentric with the
      category tabs and the tab pills (27px top, 25px bottom); reaction pickers get 27px corners all round. Where
      scrollbars take up width (Windows, Linux, macOS with scrollbars always shown), the search field and the emoji end
      8px from the scrollbar, a scrollbar's width inside the category tabs and the quick reactions.
- Progress:
    - Done: the paperclip menu (`AttachButton`, `AttachMenuViewModel`, reusing the shared `UploadButton` view),
      encryption state in the room header, and the drawer (`ComposerDrawerView`, `ComposerDrawerViewModel`,
      `ComposerDrawerButton`). The drawer has an Emoji tab with Element's picker (without its quick reactions bar)
      and a Stickers tab that opens Element's integration-manager sticker picker; it reopens on the last tab used.
    - Voice messages have no entry point until the record button lands.
    - Next: the record button with the video note overlay, then Telement's own sticker packs and the GIFs tab.

### Radius and spacing

Decided 2026-11-12 after an inventory of the app: 380 radius declarations with 23 different values (10% tokens, 20%
off the 4px grid), 9 of 31 nested rounded pairs concentric, and three button systems (Compound, `AccessibleButton`
kinds, legacy dialog buttons) giving about 17 button specs in 8 visible families.

- **Spacing:** Compound's `--cpd-space-Nx` is already a 4px scale (the same as Tailwind's), so there is no new
  spacing scale. 10px and 14px have no token: round them to 8/12 and 12/16.
- **Leaf elements have fixed radii** (`--tl-radius-*`, named by role, aliasing Compound tokens):

    | Token                 | Value       | For                                                                                                 |
    | --------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
    | `--tl-radius-none`    | 0           | Docked surfaces: room list, timeline, panels, headers, composer bar, the video stage                |
    | `--tl-radius-inline`  | 4px (`1x`)  | `kbd`, inline code, code blocks, checkboxes, emoji cells, search highlights, icon tiles in cards    |
    | `--tl-radius-row`     | 8px (`2x`)  | Rows: list and menu items, room list rows, search results, settings rows; text fields and dropdowns |
    | `--tl-radius-bubble`  | 12px (`3x`) | Message bubbles and media flush with their edge; standalone cards: toasts, home page tiles          |
    | `--tl-radius-control` | full (pill) | Single-line controls: buttons, icon buttons, badges, chips, tabs, search fields, toggles            |

    Insets and sizes have tokens too: `--tl-inset-menu` (4px, how far a row's highlight sits from the edge of its menu
    or panel), `--tl-inset-surface` (16px) and `--tl-control-size` (36px). `--tl-radius-menu` (12px) and
    `--tl-radius-surface` (24px) are computed from them.

- **Containers compute their radius** from what they hold: radius = child radius + the padding between them (+ an
  outside border), with **no cap**. If a container looks too round, reduce its padding. Examples: menus 8 + 4 = 12,
  the search dialog 8 + 16 = 24, the emoji picker and drawer 18 + 8 = 26 around their 36px category tabs, the video
  controls 18 + 4 = 22, the invite dialog's address bar 12 + 6 = 18 around its 24px pills, dialogs 14 + 16 = 30 around
  their 28px close button, inside a Glass frame of 30 + 12 = 42. Bars and fields that can wrap keep their one-line
  radius, `calc(control height / 2 + inset)`, rather than full: a wrapped date pill has 12px corners, and the
  rich-text composer's field, a 36px pill, keeps 18 as it grows. Bubbles push inward: a child inset in a bubble gets
  `max(12 − inset, 4px)`, so a link preview in a bubble, or media under a reply quote, is 4. Circles (avatars) in rows
  are exempt.
- **Timeline cards round by layout** through one property: 12 in the bubble layout, 8 in the modern and IRC layouts.
  Pictures, videos, players, maps, poll options, link previews, file cards and call cards all read it, so a new card
  only has to read it too.
- **Controls are 36px** (Compound md), so some computed radii (22, 26) are off the 4px grid. Two are smaller: room
  list filter chips are 28px with Compound's 8px inset, beside a 28px chevron, so four filters fit at the room list's
  default width; reaction chips stay 24px, as in Telegram, with a 24px add-reaction button. Icon buttons in the room
  header, room list header, card headers and media viewers hold 24px icons (Compound's own 36px icon button would draw
  27px ones); legacy call buttons hold 20px icons. An icon that fills its whole box, unlike Compound's,
  gets a 20px box so it looks as big as its neighbors.
- **Equal insets:** an icon or avatar sits as far from its box's start as from its top and bottom: menu icons 12px,
  room list avatars 8px, a voice message's play button 8px, an SSO logo 6px.
- **One content edge per container:** everything in a container starts and ends on one inset, in both writing
  directions: 12px in the room list, the room header, right panel cards and their headers; 16px in menus; 24px in the
  search dialog. Row highlights are rounded by 8 and sit 4px from the edge of a menu or panel (16px in the search
  dialog, concentric with its 24px corners), so the rows' content stays on the edge. A control puts its box on the
  edge.
- **Menus share one geometry:** 12px corners, 40px rows with no gaps, highlights inset 4px and rounded by 8, 16px
  icons and regular text. What an item holds starts 16px from the menu's edge, so an icon sits 12px from its row's
  top, bottom and start and 12px before its label. Icons, checks, toggles and chevrons sit on the label's first line,
  and what ends an item ends 16px from the edge, measured on what is drawn. Separators span the highlights with 4px
  above and below. Keyboard focus is Compound's 2px ring inside the highlight, and a focused row also gets the hover
  fill.
- **Legacy fields and dropdowns** are 36px, with their 15px text 12px inside the 1px border and a floated label
  centered on the top border. Their block padding is computed so the 22.5px line is centered. Stacked fields are 16px
  apart at every font size. A dropdown looks like a field in every state: its arrow sits 9px from the end, as from the
  top and bottom; focused, it gets the accent border, and from the keyboard a 1px accent ring on that border. Its menu
  opens 4px below the field as a 12px menu with the shared menu rows, its text on the field's text edge, about five
  and a half rows before it scrolls, and its scrollbar clipped to the corners.
- **Centering by painted pixels:** text and icons are centered on what is drawn, measured on screenshots, not on their
  boxes; "centered" means within 0.5px. Chrome rounds the space above a line down to a whole pixel and draws glyphs
  and inline icons on whole pixels, so labels in pills use `line-height: normal` or a whole-pixel line height, text in
  a fixed-height pill (counters, chips) is trimmed to its cap height (`text-box: trim-both cap alphabetic`, or
  `line-height: 1cap` where that isn't supported), and icons sit a whole number of pixels inside their box.
- **Right to left:** Element Web never sets a page direction (it sets only `lang`), so right-to-left work covers
  message content: quotes, code blocks, captions and other text written right to left. Lines Telement changes use
  logical properties so they would mirror, but Telement adds no code only to mirror the interface.
- **Buttons:** five styles mapped to Compound (filled, outline, plain, inline link, icon) plus a menu-row and a
  chip/tab spec. The pill kinds of `AccessibleButton` and the legacy dialog buttons are retuned to Compound's md
  geometry in `_AccessibleButton.pcss` and `_common.pcss`, and Compound Button's lg size takes the same geometry
  through one override, so its callers don't change. Component code changes only where Telement edits it anyway. Text
  buttons lose their underline; inline links keep it.
- **Where tokens live:** one `:root` file in shared-components (imported by its index and Storybook), registered in
  `apps/web/.stylelintrc.cjs` so `.pcss` files may use it. Compound tokens and components are not redefined, except
  single overrides where Compound has no variable (tooltip radius and arrow, text-button underline, the geometry of
  menus made only of items, separators and titles, and Button's lg size).
- **Rollout:** a first pass on 2026-11-12 covered Telement's own styles, menus, the search dialog, the reply bar and
  quote, buttons, tooltips, dialogs, bubbles, media, the action bar, toasts and the legacy jump buttons. A second pass
  on 2026-11-12 and 2026-11-13, after audits of the app and the timeline and the maintainer's review, covered every
  menu, the rich-text composer and the Markdown viewer, code blocks and the IRC layout, bubbles, cards and media, small
  timeline pieces, buttons and legacy fields, the right panel, settings and spaces, headers and media viewers, the
  emoji pickers, legacy search boxes and the room list. Other upstream styles change only when a file is touched for
  another reason. Browser tests (`*.test.browser.ts`) measure radii, sizes and painted pixels with the real
  stylesheets and the app's font, so a merge that undoes one fails. In shared-components unit tests Compound's
  stylesheet loads after Telement's and outside the app's cascade layers, so a Telement rule that overrides Compound at
  equal specificity wins in the app but loses there; give such a rule a more specific selector.
- **Visible results**, by area:
    - **Menus and search dialog:** the shared menu geometry covers the message and room menus with their Notifications
      submenu, the user menu, the thread filter, the legacy call menu, the Threads Activity Centre, the video viewer's
      speed menu and Compound's menus (paperclip, sort, compose, space, room header, pinned message, avatar). The
      search dialog lines its text, section headers, hints and avatars up 24px in; its rows are 40px with the avatar
      8px from every side. Its recently viewed tiles keep upstream's 58px width and are 67px tall, with the avatar
      centered 8px from the top and the name 8px from the bottom. The keyboard hint is a pill of four 19px keys whose
      arrow icons sit 2px inside them at every font size.
    - **Composer and editor:** the composer's text field sits 8px from its buttons. The rich-text field is a 36px pill
      that keeps 18px corners as it grows, with its buttons on its last line and the formatting bar starting at its
      edge. Code blocks in the editor and the Markdown viewer match sent ones, and the Markdown viewer's quote line is
      the message quote's 2px pill.
    - **Code:** blocks round to 4 in every layout, with their text and line numbers 12px inside the edge and the
      numbers 8px from the code, at the start side (on the right in right-to-left messages). The expand and copy
      buttons are 20px icons in 28px boxes, 12px from the top and end. A numbered block in a bubble fits its longest
      line. Inline code is 22px tall with 4px side padding on a 24px line, and stays open where it breaks across
      lines. A code block quoted in a reply keeps 4px under it. Quote lines in formatted text are pills like the reply
      quote. IRC messages are 4px apart; state events stay together.
    - **Bubbles:** text bubbles pad 8 × 12, sections are 12px apart, and reactions sit 8px under the bubble. Hovering
      draws no band; selected and highlighted messages keep theirs, and the selected band is a gray step darker than
      other people's bubbles. Your own messages have no avatar. Read receipts are pills that end at the timeline's
      content edge, and informational rows leave them 60px, as message rows do. Emotes and rows that hide their sender
      center their avatar on their first line, and informational rows are 20px with a 14px avatar 3px from their
      edges, so the read marker clears every avatar by at least 2px. Times of informational rows and emotes center on
      their last line. In the thread panel, receipts end at the content edge and informational rows show their time at
      the row's start.
    - **Cards and media:** a captioned picture or video is one bubble, the media across the top, clipped to the
      bubble's corners, with the caption below it; media under 160px wide is centered in a 160px bubble. Files, audio
      and voice messages are bubbles in the sender's color, with or without a caption: the card or player sits 8px
      from the bubble's start, top and bottom, and captions and quotes 12px. File bubbles fit the file name, from 268px
      up to a bubble's maximum, and keep no time column: the time ends the size line, under 36px buttons centered on
      the name's line. Polls are drawn in a bubble, with options, bars and counts 12px from both ends and the time at
      the end of the vote summary; the modern and IRC layouts keep 8px option cards. File and link icons are 44px
      squares with 24px glyphs. The time over pictures, GIFs, stickers and maps is a 20px dark badge 8px from the
      corner, the same as a GIF's label and a video's length. Link previews end with a row for the time under the last
      card. In bubbles, a legacy 1:1 call card is a stacked 290px card, its type, state and buttons on rows of their
      own and the time 12px from its bottom and end; in IRC the card leaves the caller's avatar and name to the row.
      Ongoing call cards are 60px with their content 12px from every edge.
    - **Timeline pieces:** reaction chips are 24px pills with their content 8px from each edge, custom emoji included,
      and the add-reaction button is a 24px circle. The pinned badge is a 24px pill. Every separator (dates, jump to
      date, "Originally sent …", search results, edit history, export) is a 24px gray pill with 13px medium text and
      no lines, and the jump-to-date chevron sits on the middle of the date's lowercase letters. Search highlights
      round to 4.
      The jump-to-bottom count is a 20px circle for one digit and a pill for more, centered on the button's bottom
      edge.
    - **Controls and fields:** buttons are 36px pills with Compound's hover and pressed colors, including the older 40
      to 52px ones; tooltips have no arrow. Notification keywords are 36px chips. The sessions filter is a 36px chip,
      transparent until hovered, with a 264px menu. The invite dialog's address bar is a 36px pill field that grows by
      32px per row of 24px pills, with the Invite button beside its first row. A labelled SSO button's logo sits 6px
      from its start, top and bottom, and several providers form a row of 36px circles 16px apart. Beta cards and the
      verification options round to 12, and the verification panel's buttons sit 16px under their text. Dialogs are
      30 inside a 42 Glass frame and clip their scrollbars to their corners.
    - **Right panel and panels:** every right panel card keeps its content 12px from both edges, like its header. Room
      info, member info, the threads list and the notifications card highlight their rows 4px from the edge with the
      content 8px inside, and member tiles hold the avatar 12px from the start, top and bottom. The document, PDF and
      Markdown viewers use the same 12px edge. Settings tabs are 36px pills with the 20px icon on the dialog title's
      edge (circles in a narrow dialog). Theme choices are 44px chips with the radio 12px from their top, bottom and
      start. Home page tiles and the session security card are 12px cards, and space home tiles pad 16 (76px tall).
      In the space panel, Threads and Settings are 40px circles when collapsed and 40px rows when expanded, like the
      space buttons. The widget picture-in-picture is 25 around its 12px widget, with a 36px back button.
    - **Headers and viewers:** icon buttons in the room header, right panel card headers, the thread list and both
      media viewers are 36px circles around 24px icons; the legacy call header's hold 20px icons, as does the thread
      list's mark-all-read button. The room header and card headers inset their content 12px. The face pile and the
      thread list's filter are 36px pills. The image and video viewers share a 68px top bar in the dark theme's
      colors, with the sender and the buttons 16px from the edges, and both show the sender as a semibold name over a
      gray date. The video viewer's speed menu is a 12px menu with 8px items inset 4px, and the PDF viewer's zoom
      buttons and page field are 36px.
    - **Pickers and chrome:** the emoji picker's category tabs sit at its top above the search field, highlight as
      36px circles, and mark the selected tab with a 20px line with round ends; headers, emoji, quick reactions and
      the search field share an 8px inset. Emoji cells are 38px squares rounded by 4 (rows 2px shorter). The reaction
      menu rounds all four corners to 27 and clips the picker along its 26px inner edge. Legacy search boxes (Forward,
      Add existing rooms, space home) match the room list's search field. Small toasts center their icon on the first
      line, so one line makes a 36px toast. The action bar's label items are 28px like its icon items.
    - **Room list:** rows are 72px, with a 64px plate inset 4px and rounded by 8; the plate holds a 48px avatar 8px
      from its start, top and bottom. The search field, header, filters and rows share a 12px edge; header buttons are
      36px with 24px icons, and filter chips 28px with their labels centered by cap height. Badges sit on the row's
      bottom line; unread counters and the @ are 20px at the default font size and grow with it (30px at 24px), so one
      digit is a circle and longer counts are pills.

    Linux screenshot baselines that show these surfaces are out of date until regenerated in Docker (see
    [open questions](#open-questions)).

### Floating toolbar

Checked 2026-11-11 whether the hover toolbar can go. The message menu lacks these toolbar actions: resend and
cancel a failed or pending send, download media, hide media, expand or collapse a quote, and reply in thread on a
deleted message that has a thread. The thread list and notification tiles have no message menu, so "View in room"
and "Copy link to thread" exist only in their toolbar. Before removing the toolbar, add these to the menu.

Decided (2026-11-16): the toolbar goes. Its actions move into the message menu, and the thread list and notification
tiles get a message menu of their own.

### Emoji artwork

Researched 2026-11-11:

- **Apple's emoji can't be used outside Apple platforms.** App Store Review Guideline 4.5.6: "Apps may use Unicode
  characters that render as Apple emoji in their app and app metadata. Apple emoji may not be used on other platforms
  or embedded directly in your app binary." The macOS licence limits its fonts to Apple-branded systems, and Apple
  offers no licence for the artwork. Telegram ships Apple-derived images on other platforms without any licence
  notice; that is not a basis Telement can rely on. On macOS and iOS the system font draws Apple's emoji anyway.
- **Telegram's animated emoji can't be reused either.** Clients download them from Telegram's servers at runtime
  (they are in no GPL repository), Telegram grants no licence for them, and their designs follow Apple's.
- **Legitimate sets:** Element already bundles Twemoji (artwork CC-BY 4.0). Others: Google Noto Color Emoji (OFL-1.1
  and Apache-2.0), Microsoft Fluent Emoji (MIT), OpenMoji (CC BY-SA 4.0).
- **Animated single-emoji messages:** [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) is
  CC BY 4.0, with 881 emoji as Lottie, WebP or GIF; Telegram's TGS stickers are gzipped Lottie, so the rendering is
  the same. Self-host the files rather than loading them from Google. Microsoft's animated Fluent emoji are MIT but
  ship as animated PNGs. Mixing Noto animations with Twemoji glyphs would look inconsistent.

### Analytics and phoning home

Telement is a private Matrix client: it has no analytics, crash reporting or bug reporting, not even as an option.
Bug reports go to the public issue tracker and security reports are written by hand. Removed on 2026-11-11:

- **PostHog:** `PosthogAnalytics`, `PosthogTrackers` and every tracking call, the opt-in toast, settings and "learn
  more" dialog, `DecryptionFailureTracker`, and the `posthog-js` and `@matrix-org/analytics-events` packages
  (including the `metricsTrigger` fields on dispatcher actions).
- **Sentry:** `sentry.ts`, the webpack plugin and Desktop's `@sentry/electron`. Five view models that took `logger`
  from `@sentry/browser` now use matrix-js-sdk's.
- **Bug reports and feedback:** rageshake log capture and upload, the bug report and feedback dialogs, the user menu's
  Feedback entry, beta feedback, `/rageshake`, and the "submit debug logs" buttons and links.
- **Element Call and timing metrics:** the analytics and log settings passed to Element Call, the rageshake
  capability, and the `io.element.performance_metric` events sent into rooms.
- **Config keys:** `posthog`, `analytics_owner`, `sentry`, `bug_report_endpoint_url`, `uisi_autorageshake_app`.
- The Security tab's "Sessions" toggle, which records the client's name, version and URL in the user's own account
  data, used to sit inside the analytics section; it now always shows under Privacy.

Still contacting Element by design, to revisit: the identity server and integration manager (Scalar) defaults, and
the Jitsi default `meet.element.io`.

## Open questions

None. Answered on 2026-11-16 (see the decision log):

- Typing in one-to-one chats keeps Element's "Alice is typing …".
- Narrow media in bubbles keeps the plain fill.
- The map in reply quotes has no attribution, but Telement didn't change it, so it is an upstream bug: it goes on
  the list of [upstream pull requests](#upstream-pull-requests), not into Telement.
- The identity server, integration manager and Jitsi defaults keep Element's services for now.

Deferred work:

- About 180 Linux screenshot baselines (Playwright and the shared-components visual tests) show surfaces changed by
  [radius and spacing](#radius-and-spacing) and the room list rows. They are out of date until regenerated in Docker,
  and each needs a look before it is committed.

## Decision log

| Date       | Decision                                                                                                                                        | Details                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2026-11-10 | `main` follows upstream release tags through signed merge commits.                                                                              | [Remotes and branches](#remotes-and-branches)                                        |
| 2026-11-10 | Node and pnpm stay; Bun is not used for the toolchain.                                                                                          | [Bun](#bun)                                                                          |
| 2026-11-10 | Matrogram is a source of ideas, not code.                                                                                                       | [Matrogram review](#matrogram-review)                                                |
| 2026-11-10 | No CI workflows for now; upstream's GitHub workflows are disabled.                                                                              | [CI](#ci)                                                                            |
| 2026-11-10 | Keep all Element features; change one only when it conflicts with Telement's.                                                                   | [Telement](#telement)                                                                |
| 2026-11-10 | Element's version numbers; release tags are `telement-vX.Y.Z`.                                                                                  | [Versions and release tags](#versions-and-release-tags)                              |
| 2026-11-10 | Desktop app ID is `dev.hloth.telement`.                                                                                                         | [Desktop](#desktop)                                                                  |
| 2026-11-10 | Telegram Web A wallpapers may be used under GPL-3.0 with a notice.                                                                              | [Chat wallpapers](#chat-wallpapers)                                                  |
| 2026-11-11 | Stickers sync natively through spec image packs in a hidden pack room.                                                                          | [Stickers pane](#stickers-pane)                                                      |
| 2026-11-11 | Desktop keeps matrix.org, `vector.im` and Scalar; drops Element's updates, crash reports, analytics, maps key and policy links.                 | [Desktop](#desktop)                                                                  |
| 2026-11-11 | OAuth client URI is `https://telement.hloth.dev`.                                                                                               | [OAuth login](#oauth-login)                                                          |
| 2026-11-11 | Installer publisher is Viktor Shchelochkov; macOS builds are signed and notarized under his Developer ID.                                       | [Building](#building)                                                                |
| 2026-11-11 | The app icon is the white "T" on a blue gradient.                                                                                               | [Icons](#icons)                                                                      |
| 2026-11-11 | The name stays Telement, knowing Element's trademark policy discourages names that incorporate its marks.                                       | [Element trademarks](#element-trademarks)                                            |
| 2026-11-11 | Telement's own files: author as holder, package licences without Element's commercial option.                                                   | [Commits, tags and upstream contributions](#commits-tags-and-upstream-contributions) |
| 2026-11-11 | Video notes send MSC4546's flag and only MSC4546 flags render as circles; Telegram-style recording toggle.                                      | [Video messages](#video-messages-round-video-notes)                                  |
| 2026-11-11 | GIF search is always on, through Klipy with each user's own key for now.                                                                        | [GIFs](#gifs)                                                                        |
| 2026-11-11 | The video note record button lands with the composer redesign.                                                                                  | [Video messages](#video-messages-round-video-notes)                                  |
| 2026-11-11 | Telegram composer layout, click-to-open emoji/stickers/GIF popover, extras in the paperclip menu, all encryption indicators in the room header. | [Composer](#one-emoji--stickers--gif-drawer-and-the-composer)                        |
| 2026-11-11 | Unused upstream code is deleted, not isolated; Telement's choices are hardcoded.                                                                | [Changing upstream code](#changing-upstream-code)                                    |
| 2026-11-11 | Room list previews always on, no sections; stickers follow widgets; GIFs autoplay; bubbles by default.                                          | [Behavior changes](#behavior-changes)                                                |
| 2026-11-11 | The settings button opens Settings directly; the quick settings popup is gone.                                                                  | [Behavior changes](#behavior-changes)                                                |
| 2026-11-11 | No Apple emoji and no Telegram animated emoji; Noto Animated Emoji is the candidate for animated emoji.                                         | [Emoji artwork](#emoji-artwork)                                                      |
| 2026-11-11 | No analytics, crash reporting or bug reporting, not even as an option.                                                                          | [Analytics and phoning home](#analytics-and-phoning-home)                            |
| 2026-11-11 | Branding says Telement; help stays with Element; mobile users are pointed to Element X or any Matrix client.                                    | [Branding](#branding)                                                                |
| 2026-11-11 | Favourites become pinned chats at the top of the list, ordered by the active sort.                                                              | [Behavior changes](#behavior-changes)                                                |
| 2026-11-11 | Timestamps always show, Telegram-style; right-click anywhere on a message opens its menu.                                                       | [Behavior changes](#behavior-changes)                                                |
| 2026-11-11 | Arrow cursor on controls, hand only on message links, I-beam on text.                                                                           | [Behavior changes](#behavior-changes)                                                |
| 2026-11-11 | The room list search stays a button to Element's search dialog, with Telegram's look.                                                           | [Behavior changes](#behavior-changes)                                                |
| 2026-11-11 | The Security tab's Sessions toggle stays visible.                                                                                               | [Analytics and phoning home](#analytics-and-phoning-home)                            |
| 2026-11-12 | Regular videos open in a full-window viewer and never play inline; length top-left, time bottom-right.                                          | [Behavior changes](#behavior-changes)                                                |
| 2026-11-12 | "Save as…" for every file in the message menu and viewers, with the system save dialog where available.                                         | [Behavior changes](#behavior-changes)                                                |
| 2026-11-12 | No Pinned filter; Pin/Unpin wording; mute bell next to the name; tilted 16px pin.                                                               | [Behavior changes](#behavior-changes)                                                |
| 2026-11-12 | Pickers don't focus their search on open; 20px composer icons; buttons follow the last line.                                                    | [Composer](#one-emoji--stickers--gif-drawer-and-the-composer)                        |
| 2026-11-12 | Radius and spacing tokens: fixed leaf radii (row 8px), containers computed concentrically without a cap, 36px controls.                         | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Button pill kinds retuned to Compound md; text buttons lose the underline.                                                                      | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Muted chats show a gray unread count; notification options move from the hover bell to a "Notifications" submenu.                               | [Behavior changes](#behavior-changes)                                                |
| 2026-11-12 | Video viewer controls auto-hide and float in a bar up to 640px wide; the reply preview reads "Reply to <name>".                                 | [Behavior changes](#behavior-changes)                                                |
| 2026-11-12 | Mentions in muted chats follow Element's push rules, evaluated without the room's mute rule; no reply arrow in the reply bar.                   | [Behavior changes](#behavior-changes)                                                |
| 2026-11-12 | Dialogs follow the container rule without a cap: body 30, Glass frame 42.                                                                       | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Tooltips have no arrow; the composer's text field sits 8px from its buttons.                                                                    | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Quote lines in formatted text are pills like the reply quote; dialogs clip their scrollbars to the corners.                                     | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Export and Import room keys put Cancel before the primary button, like other dialogs.                                                           | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | In bubbles, hovering draws no band (selection and highlights keep theirs) and your own avatar is hidden.                                        | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Date separators are a Telegram-style pill without lines.                                                                                        | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Compound Button's lg size takes the 36px md geometry through one override; legacy text fields are 36px.                                         | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Header icon buttons and legacy call buttons are 36px.                                                                                           | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Cards round to 12 in bubbles and 8 in the modern and IRC layouts.                                                                               | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-12 | Files, audio and voice messages are bubbles, with or without a caption.                                                                         | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Telegram-style room list rows: 72px, 48px avatars, time, "Sender:"/"You:" previews, typing, medium names, an accent plate when selected.        | [Behavior changes](#behavior-changes)                                                |
| 2026-11-13 | In bubbles, the selected band is one gray step darker than other people's bubbles.                                                              | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Polls are drawn in bubbles; every timeline separator is the date pill.                                                                          | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | File and player blocks sit 8px inside bubbles; file bubbles size to their name.                                                                 | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Every right panel card uses one 12px content edge, with rows inset like the room list's.                                                        | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Legacy dropdowns match the 36px text fields: text inset, font, arrow inset and menu geometry.                                                   | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Both media viewers show the sender the same way.                                                                                                | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Kept as they are: 24px reaction chips, 20px legacy call icons, radius 4 for URL previews in bubbles, 76px space home tiles.                     | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Room list badges always sit on the bottom line, centered and growing with the font (one digit is a circle); filter chips are 28px.              | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | The search dialog's recently viewed tiles are 58px wide again.                                                                                  | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Reaction emoji, the date chevron and the keyboard hint's arrows are centered by their painted pixels.                                           | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | The GIF badge matches the picture's time badge; the jump-to-bottom counter is a circle like the room list's.                                    | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Legacy fields are 16px apart and dropdown borders match theirs; legacy 1:1 call cards in bubbles are stacked.                                   | [Radius and spacing](#radius-and-spacing)                                            |
| 2026-11-13 | Small layout fixes go upstream as about nine small PRs by component; the maintainer writes the descriptions and opens them.                     | [Upstream pull requests](#upstream-pull-requests)                                    |
| 2026-11-16 | Upstream bugs Telement didn't cause are fixed upstream, not in Telement (the map in reply quotes).                                              | [Open questions](#open-questions)                                                    |
| 2026-11-16 | Element's identity server, integration manager and Jitsi stay the defaults for now.                                                             | [Open questions](#open-questions)                                                    |
| 2026-11-16 | One-to-one chats keep Element's typing text; narrow media keeps the plain fill.                                                                 | [Open questions](#open-questions)                                                    |
| 2026-11-16 | The search dialog's bell moves into "…"; the video viewer gets the image viewer's "…" menu.                                                     | [Open questions](#open-questions)                                                    |
| 2026-11-16 | Room list read checks: ✓✓ once any other member has read your last message.                                                                     | [Open questions](#open-questions)                                                    |
| 2026-11-16 | The hover toolbar goes; its actions move into the message menu.                                                                                 | [Floating toolbar](#floating-toolbar)                                                |
| 2026-11-16 | GIFs come from GIPHY with the maintainer's key, up to R, uploaded to the homeserver when sent, without pingbacks.                               | [GIFs](#gifs)                                                                        |

## Upstream merge log

| Date       | Upstream   | Notes                                    |
| ---------- | ---------- | ---------------------------------------- |
| 2026-11-10 | `v1.12.33` | Fork point: `main` created from the tag. |
