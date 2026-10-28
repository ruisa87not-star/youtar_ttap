# 課程表相容性修正與驗證

> 後續更新：同日已新增 Course Clash 排序並重建本機產物。下列保留課程表修正時的證據／hash；最新產物、排序驗證及未完成項目見 [PROJECT_STATUS.md](PROJECT_STATUS.md)。

日期：2026-10-27（Asia/Kuala_Lumpur）。使用者要求暫停 VPS／隔離代理，優先修正登入後的課程表。代理設計的批准已記錄，代理沒有開始實作或部署。

## 問題與修正

使用者提供的 `ttap_Course_Timetable_Preview.txt` 是 UTF-8 HTML（49,699 bytes）。課程表能被擷取，但舊 parser 最初產生 **0 門課、0 班別**。

已確認三個原因／處理：

1. 新版有 12 欄，新增 `Lecturer/Tutor *Subject to Change`，並保留跨多列的 Remark。舊程式只接受有 Mode 的 11 欄／無 Mode 的 10 欄，因此把所有正常班別當作不完整資料。現在依已辨識欄位決定 Remark 位置與首列／續列欄數；正確保留時間、教室、週次、班別大小與備註，講師欄不會被當成 Remark。
2. 部分課程標題內有先修條件的小表格。舊程式搜尋整列所有後代 `<th>`，誤把其中的欄位標題當成主課程表標題，甚至令後續班別沿用上一門課。現在只檢查該列直接的 cell，不受內嵌表格干擾。
3. 五門課原本就只有 `No Record Found!!!`。現在精確辨識官方跨欄通知，列為「no classes are listed; excluded from planning」，不再為它們建立假班別或顯示 incomplete class 錯誤。

仍保留欄數、rowspan 完整性、required type、時間／週次、重複／衝突資料檢查。缺少續列的班別仍整組排除。沒有改課表方向、排課核心、選課衝突規則、原生導覽或登入權限。

## 原始檔驗證

修正後結果：**20 門可排課課程、40 個班別，另 5 筆原站無班別提示**，沒有其他解析問題。

另外在 production Web build 的離線 Chromium 中，用原始檔內容走 Paste HTML → Preview import → Use these courses → 選第一門課，實際確認 20 course checkboxes、40 classes found、5 個對應提示，及課表顯示兩個時段。所有非本機連線均攔截，官方登入 iframe 使用合成替身；未發出額外外部請求，沒有 auth、截圖、trace 或私人 PNG 匯出。

原始 HTML 只留在使用者既有的來源／目標檔案中，沒有複製到 fixture 或報告。兩份檔案 hash 均未改變，目標 `.gitignore` 已忽略該檔案與既有 `login_credential.txt`。新增 fixture 為完全手工合成的 `tests/fixtures/student-lecturer.html`，包含虛構課程、講師與先修表格。

## 測試與建置

| 檢查 | 結果 | 完整日誌 |
| --- | --- | --- |
| Typecheck、Oxlint、Vitest | 167 tests／27 files 全部通過 | `logs/course-table-final-check.log` |
| 新增 E2E 的 typecheck／lint | 通過 | `logs/course-table-ui-static-check.log` |
| Production Web build | 成功 | `logs/course-table-build-web.log` |
| Chromium／Firefox 的舊版與新版匯入、排課與合成 PNG | 4 passed | `logs/course-table-e2e-web-retry.log` |
| 新 Electron 安裝檔建置 | 成功，--publish never | `logs/course-table-package-electron.log` |
| Packaged Electron 舊版與新版 HTML 匯入／Lecture／Practical 顯示 | 2 passed | `logs/course-table-e2e-electron.log` |
| 新 Tauri 安裝檔建置 | 成功 | `logs/course-table-package-tauri.log` |
| Release Tauri 的 Survey 頁擷取、課程匯入／時段顯示 | 1 passed | `logs/course-table-e2e-tauri.log` |

本輪共 **7 個針對課程表的跨平台 E2E**，沒有宣稱重跑完整 Web／Electron／Tauri suite。Rust 原始碼未變更；本輪未重跑 Rust unit suite。兩個桌面 runtime 的測試使用合成官方頁／檔案；真實原檔操作證據來自上述離線 Web production build。

修正前先觀察合成測試失敗，完整輸出在 `logs/course-table-red.log` 與 `logs/course-table-empty-red.log`；已在動手修復前展示。最初 Web focused 命令因 Windows／npm 引號轉送找不到測試，日誌在 `logs/course-table-e2e-web.log`；改用等義、無空格的 regex 後四個案例全部執行通過，未修改測試判斷以取得通過。

## 本機產物

版本仍是 `0.5.1-beta.1`，以下 hash 是本次課程表修正後的本機產物。既有 GitHub Release 沒有上傳／覆寫；之後公開發佈需另外選擇新版本／tag。

| 產物 | Bytes | SHA-256 |
| --- | ---: | --- |
| `src-tauri/target/release/youtar_ttap_tauri.exe` | 4,393,472 | `d2f44c1eb5d1211f8c21447fde986b5ed8c3c1aec8a9177307ca2651b6362547` |
| `src-tauri/target/release/bundle/nsis/youtar_ttap (Tauri)_0.5.1-beta.1_x64-setup.exe` | 2,246,128 | `c1d500bcb4331dcd4f6ee5ae537fe805c280f465b0d0ed9ab576bec32b712b09` |
| `release/youtar_ttap-Setup-0.5.1-beta.1-x64.exe` | 114,051,313 | `a51a5f8c878bdb75041574ae2bc28b77d735220a3691d5348ce8877295f00389` |

`release/SHA256SUMS.txt` 與 Tauri bundle 中的 checksum 檔已更新。既有安裝目錄不會因本機 build 自動更新；需安裝上列新安裝檔或執行專案中重新建置的程式。專案 `Start-youtar_ttap.cmd` 使用更新的 Electron unpacked 產物。

## 使用／重現

- 桌面版：更新後登入官方 UTAR、開啟 Course Timetable Preview，按「Preview courses from this page」。
- 手動重現這份 `.txt`：開啟其內容，於 Add slots manually → Paste HTML 貼上再 Preview import；既有選檔功能仍只接受 `.html`／`.htm`，沒有修改原始 `.txt` 的副檔名或內容。
- Web：`dist-web/` 已更新；本機使用 `npm run preview:web`。現有公開網站仍需另外授權部署；內嵌登入的 HTTP redirect 限制仍是暫停中的代理工作，與本次解析修正分開。

## 來源與 Git

原始來源的 479 檔 hash 仍是 `cac0ea9b583ee3125f5c59b2cd32ac631e86d8e65ca9ddf62b948c5b7a8591b8`；加上使用者既有 preview 檔的 480 檔 digest 仍為 `a8498306a0a354414b0dcaf20a03e77b38abe67ac6273d31f146a7abdb447409`。來源全程唯讀，未刪改 preview、其他來源檔案或 upstream。

`codex/tauri-windows` 的 HEAD 仍為 `2102eda631918306ac5bf3ece7d3e63681380f16`，staged diff 空白。沒有 git add／commit／push／remote add，沒有 VPS、DNS 或網站部署操作。
