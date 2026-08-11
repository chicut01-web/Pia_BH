#!/usr/bin/env bash
# Converte le foto scelte dall'archivio in asset pronti per il sito.
#
# Due accorgimenti non ovvi:
#  - ffmpeg applica da solo la rotazione EXIF, sips no. Le foto del telefono
#    sono quasi tutte ruotate via EXIF, quindi il ridimensionamento passa da
#    ffmpeg o escono coricate.
#  - ffmpeg qui non ha l'encoder webp compilato, quindi la codifica finale la
#    fa cwebp su un PNG intermedio.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=public/assets/foto
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

converti() {
  local src="$1" dst="$2" w="$3"
  ffmpeg -hide_banner -loglevel error -i "$src" \
    -vf "scale=${w}:-2:force_original_aspect_ratio=decrease" \
    "$TMP/x.png" -y
  cwebp -quiet -q 82 "$TMP/x.png" -o "$OUT/$dst"
  printf '  %-22s %s\n' "$dst" "$(du -h "$OUT/$dst" | cut -f1)"
}

echo "Converto le foto..."
converti "Photos-1-001 (2)/IMG_20260625_162704.jpg" finale.webp        1400
converti "Photos-1-001 (1)/IMG_20260412_125402.jpg" intro.webp         1000
converti "Photos-1-001 (2)/IMG_20260622_185613.jpg" car1.webp          1000
converti "Photos-1-001 (1)/IMG_20260622_185616.jpg" car2.webp          1000
converti "Photos-1-001/IMG_20260625_162732.jpg"     car3.webp          1000
converti "Photos-1-001 (2)/IMG_20260625_162729.jpg" sfondo-finale.webp 1400
converti "Photos-1-001 (1)/IMG_20260410_174454.jpg" sfondo-hub.webp    1200

echo "Fatto. Totale:"
du -sh "$OUT"
