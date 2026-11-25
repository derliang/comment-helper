# 頁面實作規範

> 給所有要改畫面的開發者與 AI（Claude、ChatGPT／Codex 等）。設計「長什麼樣」看 [DESIGN.md](DESIGN.md)；本文件規定「怎麼寫進程式」。兩份衝突時以 DESIGN.md 為準。要偏離，先改 DESIGN.md 並取得使用者確認。

> **改版狀態（2026-11-26）**：DESIGN.md 已改為全站改版後的目標畫面，程式尚未實作。改版實作另開 PR，範圍見 DESIGN.md〈4〉「實作對照」；實作期間，下文提到的 `style.css` 舊結構（四層 `:root`、側欄、`.stat`、`.student` 展開卡等）指的是**待替換的舊版**，新樣式以 DESIGN.md〈2〉tokens 與〈4〉元件為準。實作完成後回頭刪除本段。

## 1. 開工前

1. 讀 `DESIGN.md`（tokens、元件、頁面表、不要做的事）與本文件。
2. 對照 `docs/design/mockups/` 裡對應頁面的模擬頁；模擬頁只放假資料。
3. 確認要改的是哪個頁面（`work`、`history`、`settings`，或七個對話框之一）。頁面表沒有的新頁面，先走〈6. 新增頁面或元件〉。
4. 只改被要求的部分；其他版面、文案、間距維持原狀，覺得別處也該改就記下來建議，不順手改。

## 2. 檔案與架構

| 檔案 | 內容 | 注意 |
|---|---|---|
| `index.html` | 單頁骨架：導覽、三個 `section`、七個 `dialog`（舊版為側欄與四個對話框） | 以 `data-tab` 切換頁面；改結構要同步 `app.mjs` 的選取器 |
| `style.css` | 全部樣式 | 已是多層覆寫（四個 `:root` 區塊），**以最後一層為準**；新規則加在檔案**最後**，不要回頭改舊層，也不要再新增一個 `:root` 區塊覆寫同名變數，直接修改最後一層 |
| `app.mjs` | 畫面渲染與事件（以字串模板產生 HTML） | 評分色在這裡（`colors`／`pale`），與 DESIGN.md 的五級色一致 |
| `advanced.mjs` | 版本常數等 | 升版見〈5〉 |
| 其餘 `.mjs` | 引擎、匯入、交接等邏輯 | 設計工作不動它們 |

不使用前端框架與打包工具，保持純 HTML、CSS、ES module。第三方函式庫只走 `scripts/build-site.sh`（固定版本打包到 `site/vendor`），不從 CDN 載入。

## 3. 寫樣式的規則

1. **用 token，不寫死色碼與間距**：顏色一律 `var(--…)`，名稱以 DESIGN.md〈2. Tokens〉為準；`style.css` 還沒有的 token，先在最後一層 `:root` 補上，再使用。
2. **沿用既有 class**：先查〈DESIGN.md 4. 元件規則〉的 class（`.panel` 類、`.stat`、`.student`、`.preview`、`.issues`、`.rating`、`.primary` 等），不自創近似的新 class。
3. **狀態都要寫**：新的互動元件至少有預設、hover、焦點（`:focus-visible`）、停用；有送出動作的加錯誤狀態。
4. **焦點框不可移除**；點擊區手機 ≥44px（既有評分列的差距見 DESIGN.md，動到時順手評估）。
5. **響應式**：手機優先檢查 375px 寬，不得有頁面層級橫向捲動；寬表格放進 `overflow:auto` 容器。新斷點沿用 760px；要新增別的斷點先說明理由。
6. **動畫**：只用既有 `transition` 範圍，並確保 `prefers-reduced-motion` 仍會關閉。
7. **深色模式**：目前未實作；新樣式不要寫只適用深色的規則，也不要半套實作。要做時整站一起做，並先更新 DESIGN.md。
8. **不要用 `!important`**，現有檔案已有的除外；若覆寫不過，是順序或選擇器問題，到檔案最後加更具體的規則。

## 4. 寫 HTML 與腳本的規則

1. 語意標籤與無障礙：按鈕用 `<button>`；欄位要有 `<label>` 或 `aria-label`；錯誤用 `role="alert"`，狀態用 `role="status"`，動態結果區用 `aria-live="polite"`；評分按鈕用 `aria-pressed`。
2. 不使用 inline `style`，除非是由資料決定的動態值（例如進度條寬度、評分等第色）。
3. 不內嵌外部腳本、字型、圖片；CSP 為 `connect-src 'self'`，不得放寬。
4. 文案用台灣繁體中文，依 DESIGN.md〈6〉；不要在畫面加使用者沒要求的說明文字或統計。
5. 不增減功能、不改評語生成邏輯與資料格式；設計工作若發現邏輯問題，另外回報，不混在同一次修改。
6. **個資**：測試、範例、模擬頁、截圖、commit 一律只用合成資料（例如「範例甲」）；不提交真實名單、評語、備份（`.gitignore` 已擋 `*.xlsx`、`*.docx`、`*backup.json`，不要繞過）。

## 5. 驗證與交付

在 repo 根目錄（Node.js 22）依序執行，全綠才算完成：

```sh
node --check app.mjs
node --test
bash scripts/build-site.sh
python -m http.server 8000 --directory site
```

- 改了畫面，要開 `http://localhost:8000` 實際看過：桌機寬度與 375px 手機寬度各一次，檢查溢出、被裁切的文字、焦點框、三種狀態（尚未評／評分中／已評）。
- 端對端瀏覽器測試在 `tests/browser-smoke.py`、`tests/mobile-webkit.py`（需 Playwright，見 `README.md`）；改到評分、匯入、下載流程時要跑。
- 版本號：改動若要升版，依 `README.md` 的規則同步更新 `advanced.mjs`、HTML、README 與測試（`tests/version-assets.test.mjs`、`tests/version-json.test.mjs` 會檢查）。純文件或規範修改不升版。
- 回報時附：改了哪些檔、跑了哪些指令與結果、截圖或寬度檢查說明、沒驗證到的地方。

## 6. 新增頁面或元件

1. 先在 DESIGN.md 新增規則（元件寫進〈4〉，頁面寫進〈5〉的頁面表並新增 `mockups/<名稱>.html`），並在〈10. 修訂紀錄〉記一列。
2. 取得使用者確認後才寫程式；Claude 可用 `設計員` 技能出設計稿，其他 AI 先把設計稿（HTML 或文字說明）給使用者確認。
3. 模擬頁用 tokens、只放假資料，並涵蓋手機與桌機寬度、空白與錯誤畫面。
4. 程式與規範放在同一個提交或 PR，不讓兩者脫節。

## 7. 給 AI 的固定提醒

- 你看不到先前的對話；規範以 repo 內 `docs/design/` 為唯一來源，不憑印象發明樣式。
- 使用者只指出一處要改，就只改那一處。
- 要違反本規範的任何一條，先停下來告訴使用者並更新 DESIGN.md，不要只在程式裡悄悄偏離。
- 每次提交前自查：沒寫死色碼、沒新增重複元件、沒放真實資料、測試全綠。

## 8. 規範自身的維護

- 稿件核對腳本（Claude 設計員技能提供）：`python <技能資料夾>/scripts/check-manuscript.py <專案路徑>`，檢查稿件版本、頁面清單與模擬頁、修訂紀錄是否一致。沒有該技能的環境，人工確認〈DESIGN.md 5. 頁面規則〉表中每個模擬頁檔案都存在。
- 規範變動與程式變動同一個提交；DESIGN.md 的〈9. 決策紀錄〉與〈10. 修訂紀錄〉要補一列。
