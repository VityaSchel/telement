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

rm -rf "$desktop_dir/webapp" "$desktop_dir/webapp.asar"
cp -R "$web_dir/webapp" "$desktop_dir/webapp"
cp "$desktop_dir/telement/release/config.json" "$desktop_dir/webapp/config.json"

cd "$desktop_dir"
pnpm run asar-webapp
VARIANT_PATH=telement/release/build.json pnpm run build "$@"
