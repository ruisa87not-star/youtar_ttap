# 2026-10-27 登入診斷與桌面修正

> 後續更新：本輪課程表修正後已再次重建本機產物。以下保留登入修正時的證據與 hash；最新版本的產物／hash 與課程表驗證見 [COURSE_TABLE_VERIFICATION.md](COURSE_TABLE_VERIFICATION.md)。

## 結論

真實登入證實：UTAR 由 HTTPS `loginProSurvey.jsp` 回傳 HTTP 302，目的地是同主機的 HTTP `indexSurvey.jsp`，含敏感的 `passid`。原本 Electron／Tauri 的 HTTPS-only 導覽 guard 因此擋下登入。最初診斷在跟隨前便中止，沒有記錄參數值，也沒有把它送上 HTTP。

已修正兩個桌面版：只把 `http://unitreg.utar.edu.my` 標準連接埠、無 URL 帳密的導覽取消，再在同一個隔離 view 載入對應 HTTPS URL。保留原 path、query 和 fragment；其他 hostname、非標準連接埠、URL 帳密或其他 scheme 仍拒絕。不允許 HTTP 連線，不改 TLS、sandbox、webSecurity 或原生 IPC 權限。

2026-10-27，使用者在修正後 Tauri 應用自行完成 CAPTCHA，確認看到登入後頁面；診斷也觀察到 HTTPS 的 `registration/studentRegistrationSurvey.jsp` 及 `schedule/masterScheduleSurvey.jsp`。僅核對課程頁的結構：沒有 password input，存在 `#overviewSector table`；未記錄學生資料或課程內容。

隨後補上新課程頁的精確 allowlist。兩個允許的課程來源是 `schedule/masterSchedule.jsp` 與 `schedule/masterScheduleSurvey.jsp`；仍只讀取該表格，不匯入登入頁或整頁帳號資料。

## 變更

- `src/main/registration.ts`：Electron HTTPS 升級、popup 同樣處理、新課程頁 allowlist。
- `src-tauri/src/policy.rs`：精確安全升級 policy 與兩個課程頁 allowlist。
- `src-tauri/src/registration.rs`：取消 HTTP 導覽並非同步載入安全目的頁。
- `tests/main/registration.test.ts`：升級成功、拒絕惡意／非標準目的地、舊／新課程頁讀取及 bounds／大小／導覽 race 回歸。
- `tests/e2e/electron.spec.ts`、`tests/tauri/desktop.spec.ts`：真實 packaged runtime 的 POST → HTTP 302 → HTTPS 成功頁測試，斷言沒有 HTTP 請求；補 Survey 課程匯入。
- `.gitignore`：忽略使用者授權的本機 `login_credential.txt`；沒有複製、提交或記錄其內容。

## 最終驗證

| 項目 | 結果 | 完整日誌 |
| --- | --- | --- |
| TypeScript typecheck、Oxlint、Vitest | 全部通過，163 tests／27 files | `logs/login-final-check.log` |
| Rust unit tests、Clippy -D warnings、fmt --check | 全部通過，11 tests | 同上 |
| Electron NSIS 本機建置 | 成功，--publish never | `logs/login-final-package-electron.log` |
| Tauri NSIS 本機建置 | 成功 | `logs/login-final-package-tauri.log` |
| 最終 packaged Electron E2E | 9 passed | `logs/login-final-e2e-electron.log` |
| 最終 release Tauri E2E | 5 passed | `logs/login-final-e2e-tauri.log` |
| 真實 UTAR 登入 | Tauri 已由使用者確認成功；CAPTCHA 人工輸入 | 僅記錄去除 query 的路徑，未建立 auth trace／截圖 |

首次失敗日誌都已在修正前展示：`logs/login-red-electron.log`、`logs/login-red-rust.log`、`logs/login-red-survey.log`、`logs/login-red-survey-rust.log`。另有 `logs/login-e2e-electron.log` 記錄新測試初次因 Reload 過程暫無 webContents URL 而失敗；調整測試等待後再跑全套通過，未放寬產品 guard。

未將合成測試等同真實登入。Electron 真實帳號登入與真實課程解析尚未另外驗證；目前真實登入證據來自 Tauri。新課程頁 allowlist 的最終建置已通過合成讀取測試；未再次讀取／保存真實課程內容。

## 本機產物

版本仍為 `0.5.1-beta.1`；下列為**新的本機測試產物**，與現有 GitHub Release 同名檔案內容不同。未覆寫或上傳既有 Release；公開發佈前需指定新的版本／tag。

| 產物 | Bytes | SHA-256 |
| --- | ---: | --- |
| `src-tauri/target/release/youtar_ttap_tauri.exe` | 4,393,472 | `8ba2d2669f7924da6e823f958cb7f081edb7b9b87908299d35eea802837f3865` |
| `src-tauri/target/release/bundle/nsis/youtar_ttap (Tauri)_0.5.1-beta.1_x64-setup.exe` | 2,246,537 | `a6e68aa0e0f197d61a0647f77cdd0fb9f2e6ccd3f68db78e8a06358a3b5c4963` |
| `release/youtar_ttap-Setup-0.5.1-beta.1-x64.exe` | 114,051,014 | `79d23665fea63938c013532a17970bc7394f94c717992ed849d7e4dfcae211ea` |

## Web 版與後續

Web 版仍受 iframe 的 HTTP downgrade／mixed-content 限制。Chromium／Firefox 合成實驗確認只改外層 CSP 無效，沒有為消除 console 訊息而允許 HTTP、unsafe-inline 或停用 TLS。

使用者要求 Web 版也能完整登入，已選定自行託管的隔離 HTTPS 代理方向，並表示有 Node.js／Docker VPS。新的代理尚未實作／部署；方案、資料流及驗收條件見 [WEB_LOGIN_OPTIONS.md](WEB_LOGIN_OPTIONS.md)，書面設計另列。

## 來源與 Git 保護

來源全程沒有作任何寫入操作。本輪完整 digest 檢查發現根目錄額外有 `ttap_Course_Timetable_Preview.txt`（49,699 bytes，檔案時間 2026-10-27 05:53:22 UTC），所以目前 480 檔的 digest 與初始 479 檔不同。沒有刪除、修改或複製該新增檔到目標，也沒有解析其內容。

另行比對排除此**單一新增檔**後，原本 479 檔的 digest 仍精確等於 `cac0ea9b583ee3125f5c59b2cd32ac631e86d8e65ca9ddf62b948c5b7a8591b8`，103 份原始複製檔 hash 亦全數一致。保留完整樹不相同的診斷結果，不把新檔當成已刪除。

分支 `codex/tauri-windows`，HEAD 維持 `2102eda631918306ac5bf3ece7d3e63681380f16`，staged diff 空白。沒有 git add／commit／push／remote add，沒有更動 upstream、現有 GitHub Release 或網站部署。
