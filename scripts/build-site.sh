#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p site/vendor
cp index.html style.css app.mjs engine.mjs deep-nlg.mjs importers.mjs advanced.mjs handoff.mjs roundtrip.mjs original-prompt.md site/
# Serve version-pinned scripts from the deployed site; no third-party scripts at runtime.
curl --fail --location --retry 3 --max-time 90 https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js -o site/vendor/xlsx.full.min.js
curl --fail --location --retry 3 --max-time 90 https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js -o site/vendor/jszip.min.js
# Verify pinned SHA-256 so a republished or tampered upstream file can never reach the site.
echo "cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41  site/vendor/xlsx.full.min.js" | sha256sum -c -
echo "acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e  site/vendor/jszip.min.js" | sha256sum -c -
node --check site/vendor/xlsx.full.min.js
node --check site/vendor/jszip.min.js
printf 'SheetJS CE 0.20.3 (Apache-2.0); JSZip 3.10.1 (MIT or GPL-3.0); upstream notices are retained in the distributed scripts.\n' > site/vendor/NOTICE.txt
# Publish version metadata (Teacher Hub reads it to update the tool card's version).
node scripts/write-version-json.mjs
node scripts/version-assets.mjs
