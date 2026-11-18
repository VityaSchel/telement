#!/usr/bin/env sh
# Usage: apps/desktop/telement/build.sh [--reuse-web] [electron-builder arguments, e.g. --dir]
set -eu

desktop_dir=$(cd "$(dirname "$0")/.." && pwd)
web_dir="$desktop_dir/../web"

if [ "${1:-}" = "--reuse-web" ]; then
    shift
else
    pnpm --dir "$web_dir" build
fi

# Webpack never clears apps/web/webapp, so it keeps every earlier build's bundles; ship only the one index.html loads
bundle=$(sed -n 's|.*"bundles/\([0-9a-f]*\)/.*|\1|p' "$web_dir/webapp/index.html" | head -n 1)
if [ -z "$bundle" ]; then
    echo "No bundle referenced by $web_dir/webapp/index.html" >&2
    exit 1
fi

rm -rf "$desktop_dir/webapp" "$desktop_dir/webapp.asar"
mkdir -p "$desktop_dir/webapp/bundles"
for entry in "$web_dir/webapp"/* "$web_dir/webapp"/.well-known; do
    [ "$(basename "$entry")" = bundles ] || [ ! -e "$entry" ] || cp -R "$entry" "$desktop_dir/webapp/"
done
cp -R "$web_dir/webapp/bundles/$bundle" "$desktop_dir/webapp/bundles/"
cp "$desktop_dir/telement/release/config.json" "$desktop_dir/webapp/config.json"

cd "$desktop_dir"
pnpm run asar-webapp
# Nx hashes only files git tracks, so it misses the ignored webapp.asar and would restore an older dist from its cache
NX_SKIP_NX_CACHE=true VARIANT_PATH=telement/release/build.json pnpm run build "$@"
