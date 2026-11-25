#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p site/vendor
cp index.html style.css app.mjs engine.mjs importers.mjs advanced.mjs handoff.mjs original-prompt.md site/
# Serve version-pinned scripts from the deployed site; no third-party scripts at runtime.
curl --fail --location --retry 3 --max-time 90 https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js -o site/vendor/xlsx.full.min.js
curl --fail --location --retry 3 --max-time 90 https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js -o site/vendor/jszip.min.js
node --check site/vendor/xlsx.full.min.js
node --check site/vendor/jszip.min.js
printf 'SheetJS CE 0.20.3 (Apache-2.0); JSZip 3.10.1 (MIT or GPL-3.0); upstream notices are retained in the distributed scripts.\n' > site/vendor/NOTICE.txt
# Publish version metadata (Teacher Hub reads it to update the tool card's version).
node scripts/write-version-json.mjs
