# CLAUDE.md

專案通用規則在 [AGENTS.md](AGENTS.md)（ChatGPT／Codex 也讀同一份），請先讀它。

## 設計規範（改頁面前必讀）

- 本專案的設計規範在 [docs/design/DESIGN.md](docs/design/DESIGN.md)，頁面實作規範在 [docs/design/IMPLEMENTATION.md](docs/design/IMPLEMENTATION.md)，定案的模擬頁在 `docs/design/mockups/`。一切頁面、版面、元件、樣式的工作以它們為準。
- 新增、改版、調整任何頁面前，先讀它們。沿用其中的 tokens 與元件規則，不寫死色碼與間距。
- 新頁面或大改版使用 `設計員` 技能（輸入 `/設計員`）：先在對話中出設計稿給使用者確認，定案後把規範與模擬頁更新回 `docs/design/`，和程式放在同一個 PR。
- 要偏離規範，先更新 DESIGN.md 並取得使用者確認，不要只改程式。

## 測試與建置

```sh
node --check app.mjs
node --test
bash scripts/build-site.sh
```

端對端瀏覽器測試見 README.md 與 `tests/browser-smoke.py`。
