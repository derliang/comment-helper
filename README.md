# 拾語 · 教師評語小幫手

MVP v0.1.5-alpha，純靜態網站；適用 GitHub Pages。預設不需要 API 金鑰。真實學生資料不在此儲存庫。

## 本機操作

在專案資料夾執行 `python -m http.server 8000`，開啟 `http://localhost:8000`。請使用 localhost 或 HTTPS，直接雙擊 HTML 無法完整使用 JavaScript 模組。

## 目前功能

- 學期班級、名單貼上與 XLSX/CSV 匯入（多工作表合併，支援舊版欄位後綴、五級文字與 Word 校務報表）。
- 垂直展開清單、三種評分狀態、綠至紅五級量表、六向度等權平均星等（暫定）。
- 即時規則式草稿、補充觀察、字數與文字相似度檢查、人工確認鎖定。
- 歷史評語文字、試算表或 Word 校務報表匯入（去重與身分欄位保留）、常用詞特徵分析、全班與跨學期文字相似度比對。
- localStorage 自動儲存、JSON 備份/還原、已確認評語 Word/Excel 匯出。

## 限制與安全

- 本機規則產生的是草稿，僅辨識少量補充觀察關鍵字，不是完整 AI 或真正機器學習；風格分析也僅是簡易統計。提供可選 HTTPS AI 服務端點，未附實際後端。端點須自行建置、驗證、設定 CORS 並遵守學校個資政策。
- 本機儲存未加密、未跨裝置同步，且清除瀏覽器資料可能造成遺失。勿在共用電腦輸入真實資料。XLSX/Word 功能需外部 CDN 函式庫，請先以假資料驗收；正式使用前建議改成經稽核的本地依賴。
- 原始 Prompt 原封保存，最新六向度及不臆測學業的規則在 API 請求中另列。未實作語意模型比對、AI 自動學習模型微調、完整稽核及跨學期身分管理。
- 已確認評語不得自動覆蓋；評分變動後需解除鎖定並重新確認。匯出目前僅正式版。

## 測試與部署

```sh
node --check app.mjs
node --check engine.mjs
node --check importers.mjs
node --test
```

建立公開 GitHub repository `comment-helper`，推送 main，於 Settings → Pages → Build and deployment → Source 選擇 GitHub Actions。CI 成功後才進入部署 job；若第一次推送時尚未啟用 Pages，可在 Actions 手動重新執行工作流程。遠端執行結果以 GitHub Actions 實際紀錄為準。

```sh
git init -b main
git add .
git commit -m "feat: initial comment helper MVP"
git remote add origin https://github.com/derliang/comment-helper.git
git push -u origin main
```

## 原始規範

`original-prompt.md` 保留使用者提供的原始評語生成指令；最新六向度變更不直接覆蓋原文。

## v0.1.5-alpha 測試

四份匿名統計：匯入解析 187 筆學生紀錄、141 則歷史評語、230 + 240 筆舊版五向度分數；62,500 次規則草稿字數測試通過。真實檔案不納入 Git。跨學期僅以已提供學號或姓名座號輔助識別，不可假定兩學期同座號即同人。正式 AI 端點僅傳風格統計，不送歷史評語全文；相似度仍在本機驗證。
