#!/usr/bin/env sh
# Renders every Telement app icon from icon.svg. Requires rsvg-convert and ImageMagick 7.
set -eu

cd "$(dirname "$0")/../.."
master=telement/branding/icon.svg
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Square artwork, for macOS, which applies its own icon shape
square() {
    mkdir -p "$(dirname "$2")"
    rsvg-convert -w "$1" -h "$1" "$master" -o "$tmp/square.png"
    magick "$tmp/square.png" -strip "$2"
}

# Circular icon with transparent corners, matching Element's icon shape
round() {
    mkdir -p "$(dirname "$2")"
    rsvg-convert -w "$1" -h "$1" "$master" -o "$tmp/square.png"
    radius=$(echo "$1" | awk '{ print ($1 - 1) / 2 }')
    magick "$tmp/square.png" -alpha set \
        \( -size "$1x$1" xc:none -fill white -draw "circle $radius,$radius $radius,0" \) \
        -compose DstIn -composite -strip "$tmp/round.png"
    case "$2" in
        *.png) magick "$tmp/round.png" "PNG32:$2" ;;
        *) magick "$tmp/round.png" "$2" ;;
    esac
}

# Round vector logo, cut from the master by replacing its square background with a circle
round_svg() {
    sed 's|<rect width="1024" height="1024" fill="url(#background)" />|<circle cx="512" cy="512" r="512" fill="url(#background)" />|' \
        "$master" > "$1"
    grep -q "<circle" "$1"
}

square 1024 apps/desktop/build/icon.icon/Assets/telement.png
round 320 apps/desktop/build/install-spinner.gif
round 512 apps/desktop/build/icon.png
round 256 "$tmp/ico.png"
magick "$tmp/ico.png" -define icon:auto-resize=256,128,64,48,32,24,16 apps/desktop/build/icon.ico

for size in 24 120 144 152 180 512 1024; do
    round "$size" "apps/web/res/vector-icons/$size.png"
done
round 320 apps/web/res/themes/element/img/logos/element-app-logo.png
round_svg apps/web/res/themes/element/img/logos/element-logo.svg
round_svg apps/web/src/vector/mobile_guide/assets/element-logo.svg
