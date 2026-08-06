#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-cloudflare-estate}"
rm -rf "$OUT"
mkdir -p "$OUT"

for file in \
  index.html estate-app.js estate-accessibility.js estate-head-public-consumer.js \
  estate.css estate-accessibility.css icon.svg manifest.webmanifest sw.js \
  author-home-door.js robots.txt sitemap.xml 404.html cading.html; do
  if [[ -f "$file" ]]; then cp "$file" "$OUT/"; fi
done

for dir in \
  apps author coding-estate estate fresh-app-lab games-beyond lyrics navigator \
  recent recovery theory money-menu; do
  if [[ -d "$dir" ]]; then cp -a "$dir" "$OUT/$dir"; fi
done

cp -a registry "$OUT/registry"

cat > "$OUT/_headers" <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(self), geolocation=()
  Cache-Control: no-store, no-cache, must-revalidate
/sw.js
  Cache-Control: no-store, no-cache, must-revalidate
  Service-Worker-Allowed: /
/registry/*
  Cache-Control: no-store, no-cache, must-revalidate
/theory/wave01-runtime-proof.html
  Cache-Control: no-store, no-cache, must-revalidate
EOF

cat > "$OUT/_redirects" <<'EOF'
/apps /apps/index.html 200
/apps/ /apps/index.html 200
/theory /theory/index.html 200
/theory/ /theory/index.html 200
/games-beyond /games-beyond/index.html 200
/games-beyond/ /games-beyond/index.html 200
/recovery /recovery/index.html 200
/recovery/ /recovery/index.html 200
/author /author/index.html 200
/author/ /author/index.html 200
/recent /recent/index.html 200
/recent/ /recent/index.html 200
/money-menu /money-menu/index.html 200
/money-menu/ /money-menu/index.html 200
/coding-estate/integration /coding-estate/integration/00_OPEN_FIRST.html 200
/coding-estate/integration/ /coding-estate/integration/00_OPEN_FIRST.html 200
EOF

required=(
  index.html
  apps/index.html
  theory/index.html
  theory/wave01-runtime-proof.html
  games-beyond/index.html
  coding-estate/integration/00_OPEN_FIRST.html
  recovery/index.html
  author/index.html
  recent/index.html
  estate-head-public-consumer.js
  theory/source-body-integrity-v12.js
  theory/data/source-body-integrity/v0_20-audit.json
  registry/estate-head-public-current.json
)

for path in "${required[@]}"; do
  test -s "$OUT/$path"
done

grep -Fq 'data-public-route-wave="01"' "$OUT/apps/index.html"
grep -Fq 'data-public-route-wave="01"' "$OUT/theory/index.html"
grep -Fq '242-route v1.1 data authority · live public contact v1.2' "$OUT/apps/index.html"
grep -Fq 'v0.20.1 integrity layer · v0.19 reconciled shell' "$OUT/theory/index.html"
grep -Fq 'JM.TheoryWave01RuntimeWitness/1.0' "$OUT/theory/wave01-runtime-proof.html"

echo "WAVE 01 ASSEMBLY PASS: $OUT"
