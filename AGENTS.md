# AGENTS.md

給在此 repo 工作的 AI 代理（ChatGPT／Codex、Claude 等）與開發者。專案說明見 [README.md](README.md)，開發進度見 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 設計規範（改頁面前必讀）

- 本專案的設計規範在 [docs/design/DESIGN.md](docs/design/DESIGN.md)，頁面實作規範在 [docs/design/IMPLEMENTATION.md](docs/design/IMPLEMENTATION.md)，定案的模擬頁在 `docs/design/mockups/`。一切頁面、版面、元件、樣式的工作以它們為準。
- 新增、改版、調整任何頁面前，先讀這兩份。沿用其中的 tokens 與元件規則，不寫死色碼與間距，不自創近似的新元件。
- 新頁面或大改版：先在對話中提出設計稿給使用者確認，定案後把規範與模擬頁更新回 `docs/design/`，和程式放在同一個提交或 PR。
- 要偏離規範，先更新 DESIGN.md 並取得使用者確認，不要只改程式。
- 使用者只要求改某一處，就只改那一處。

## 驗證（改程式或畫面後）

```sh
node --check app.mjs
node --test
bash scripts/build-site.sh
```

改了畫面要實際開 `site/` 檢查桌機與 375px 手機寬度。詳見 IMPLEMENTATION.md〈5. 驗證與交付〉。

## 個資與安全

- 不提交真實學生名單、評語、備份或金鑰；測試、範例與截圖只用合成資料。
- 不引入外部 CDN；第三方函式庫由 `scripts/build-site.sh` 打包。
- 使用者介面文字一律台灣繁體中文。
