# youtar_ttap

由 ruisa87not-star 獨立開發與維護的 UTAR 排課工具，提供 **Web 版**、**Windows x64 Electron 版**及 **Windows x64 Tauri 版**。三個版本共用介面、HTML 匯入、排課核心、衝突檢查及 PNG 選課指引。

本應用包含移植及改寫自 [Wong Jia Hau 的 TTAP](https://github.com/wongjiahau/ttap-web) 的程式與測試資料；詳見 [UPSTREAM.md](UPSTREAM.md)。本應用由社群獨立維護，實際選課仍須在 UTAR 官方系統完成。

## 功能

- 可略過／重開的教學、內嵌官方 Course Registration 登入頁。
- 貼上 HTML 或匯入多個 HTML 檔，預覽後確認；手動匯入附合成資料示意圖。
- Demo 課程目錄與課表、選科、Lecture／Tutorial／Practical 分組、即時衝突檢查。
- 不相容課程停用、顯示 Course Clash 並自動排至清單底部，可加入的課程優先顯示；Clear 可取消所有選科及固定分組。
- 可收合課程 sidebar、Unavailable Time、即時課表候選比較。
- Mon–Sun 由上往下，08:00–18:00 時間軸橫向顯示；Unavailable Time 不延長範圍，實際課程超出時才延長。
- 匯出包含課表、課程／分組／地點／學分及選課步驟的 PNG。
- Windows 啟動時最大化；長清單在各自區域捲動，介面隨視窗調整。

## 使用 Web 版

開發者可用 dev:web，或以 preview:web 預覽 production build。已新增可選的獨立 HTTPS UTAR 登入代理：配置後直接顯示內嵌登入、錯誤提示與課程 Preview，確認匯入後排課。代理需要自行管理的 VPS、同 site 獨立 hostname 與 TLS；目前只完成本機合成驗證，尚未部署或驗證真實 Web 登入。

未配置代理時，保留官方 iframe；UTAR 的 HTTP redirect 仍可能被瀏覽器擋下，可從官方 Course Timetable Preview 儲存 HTML，再於 Add slots manually 匯入。完整設定、安全邊界、Node／Docker 草案及回滾見 [Web 隔離登入代理](docs/WEB_REGISTRATION_PROXY.md)。

## 使用 Windows 版

Electron beta 安裝檔已在[此 repository 的 GitHub Releases](https://github.com/ruisa87not-star/youtar_ttap/releases)提供，檔名為 youtar_ttap-Setup-版本-x64.exe。Tauri 本輪先產出本機安裝檔，尚未公開發佈。使用者安裝後從開始功能表啟動，無須 Node.js。

開發者完成本機打包後，也可雙擊 [Start-youtar_ttap.cmd](Start-youtar_ttap.cmd)。啟動器只讀取本專案的 release/win-unpacked/youtar_ttap.exe；不存在或舊於原始碼時，會以已安裝的 Node.js／依賴重新打包。建置失敗會停止，不開啟舊產物。

目前未配置程式簽章、自動更新或其他桌面平台。未簽章檔案可能有未知發行者／SmartScreen 提示。新應用身份與舊 TTAP 分開，不自動搬移舊 profile。

## Windows Tauri 版

Tauri 版顯示名稱為 **youtar_ttap (Tauri)**，使用獨立的應用程式識別與安裝目錄，可與 Electron 版並存。介面及排課流程相同，UTAR 在同一視窗的隔離 InPrivate 子 WebView 中顯示；遠端頁面沒有原生讀寫檔案或關閉應用的權限。應用不代填帳密或驗證碼。

Tauri 使用系統共用的 Microsoft Edge WebView2 Evergreen，無須在每份應用內附帶 Electron 的 Chromium／Node。主 exe、安裝檔大小與測試證據見 [docs/TAURI_VERIFICATION.md](docs/TAURI_VERIFICATION.md)。WebView2 至少須為 120.0.2210.91；安裝器會在需要時下載 runtime，首次安裝可能需要網路。應用檔案大小不包含系統共用 runtime 的占用。

開發需要 Windows x64、Node.js、Rust MSVC stable、Visual Studio 2022 或更新版本的 C++ Build Tools 與 Windows SDK。依[官方前置需求](https://v2.tauri.app/start/prerequisites/)安裝工具鏈；本專案的 scripts/tauri.mjs 亦可使用 .cache/cargo／.cache/rustup 中的專案工具鏈，並在子程序內選取完整的 MSVC 安裝，不修改使用者 PATH。

~~~sh
npm ci
npm run dev:tauri
npm run test:tauri:rust
npm run fmt:tauri
npm run lint:tauri
npm run build:tauri
npm run test:e2e:tauri
npm run package:tauri
~~~

build:tauri 建立正式 exe；package:tauri 額外建立目前使用者的 NSIS 安裝檔，位於 **src-tauri/target/release/bundle/nsis/**，不自動上傳。Tauri 前端單獨輸出到 dist-tauri/，不覆蓋 Web／Electron 產物。Playwright 的 Tauri 測試預設使用已建好的 debug exe；要驗證正式 exe，可在 PowerShell 設定 `$env:TTAP_TAURI_EXE='src-tauri/target/release/youtar_ttap_tauri.exe'` 再執行 test:e2e:tauri。測試啟動環境才啟用暫時 CDP endpoint，正式組態不設定除錯連接埠。

同視窗子 WebView 使用 Tauri 2.12.5 的 unstable API，已固定版本與 Cargo.lock。升級前應重跑原生整合測試。Rust 建置會整理鎖定的 Windows 依賴與標準函式庫授權到 licenses/tauri/ 並隨安裝檔附帶；授權覆補檔的來源記錄在 licenses/tauri-overrides/SOURCES.json。

## 開發

Windows x64、Node.js **24.15.0 或以上**、npm 11。從本 README 所在根目錄執行：

~~~sh
npm ci
npm run dev:web
~~~

或選擇桌面開發模式：

~~~sh
npm run dev:desktop
~~~

Electron 45 採按需下載 runtime；dev:desktop 與 build:desktop 會先執行官方 install-electron，確保新位置不依賴舊專案的 dist。

一次選一種開發模式。Web 預設綁定 127.0.0.1。Electron 官方登入頁使用隔離的記憶體 session，沒有應用 preload bridge 或 Node.js 權限。

## 檢查與測試

~~~sh
npm run typecheck
npm run lint
npm test
~~~

lint 使用固定版本 Oxlint 檢查 TS／TSX／JavaScript；TypeScript 7 與獨立 typecheck 保留，不以 lint 取代型別檢查。

~~~sh
npm run install:browsers
npm run build:web
npm run test:e2e:web
npm run test:e2e:proxy
npm run package:win
npm run test:e2e:desktop
~~~

Playwright 瀏覽器安裝在專案 node_modules。Web 測試使用 production preview，涵蓋 Chromium／Firefox。桌面 E2E 啟動 unpacked exe、替換 dialog 回傳值並執行真實檔案 I/O；不等同操作原生對話框視窗的人工測試。登入測試使用合成頁面，不代表真實帳號或目前學期課程已驗證。

可選的 npm run test:installer 會安裝／解除安裝、建立捷徑與檢查登錄資料，應在隔離 Windows 測試帳戶執行，不是一般測試的一部分。

## Web 建置與部署

~~~sh
npm run build:web
npm run preview:web -- --host 127.0.0.1 --port 4173 --strictPort
~~~

產物為 **dist-web/**，包含 LICENSE、THIRD_PARTY_NOTICES.txt、UPSTREAM.md。部署時須上傳完整目錄。

Vite base 為 './'。選定 host 後需驗證實際根／子路徑、HTTPS、UTAR iframe 行為。目前沒有啟用 Pages、Surge、Firebase、CNAME 或部署 workflow。

## Windows 打包與發佈

產生可執行目錄：

~~~sh
npm run package:win
~~~

輸出在 **release/win-unpacked/**；命令先安裝／確認官方 Electron runtime，再依序執行 electron-vite build 與 electron-builder --win --dir --publish never。

產生 NSIS x64 安裝檔：

~~~sh
npm run release:win
~~~

輸出在 **release/**。命令明確使用 --publish never，不需要 GitHub token，也不自動建立 release。維護者驗證與計算 SHA-256 後，再經授權手動上傳新的 GitHub Releases。程式碼提交／推送須另外授權。

## 資料與限制

最新本機產物、驗證紀錄及尚未完成的 VPS／代理／公開發佈工作，見 [專案狀態與待辦](docs/PROJECT_STATUS.md)。

2026-10-27 課程表修正：支援新版 Lecturer/Tutor 欄、課程標題中的先修條件表格及官方 No Record Found 通知；保留舊格式與缺漏列檢查。最新本機產物與測試結果見 [課程表驗證報告](docs/COURSE_TABLE_VERIFICATION.md)。

2026-10-27 登入修正：Electron／Tauri 會攔截 UTAR 的同主機 HTTP 轉址並升級 HTTPS，保留其他導覽限制；支援 `masterSchedule.jsp` 與 `masterScheduleSurvey.jsp` 兩個課程頁。Tauri 真實登入已由使用者手動 CAPTCHA 驗證；Electron 已通過打包應用的合成登入測試。網頁版完整登入仍待隔離代理方案實作，詳見 [登入診斷](docs/LOGIN_DIAGNOSIS.md) 及 [網頁方案評估](docs/WEB_LOGIN_OPTIONS.md)。

- HTML 只解析為課程資料，script／frame／圖片不進入應用 DOM。
- HTML 多檔總輸入及 PNG payload 上限 10 MiB；課表最多保留 500 候選，找到第 501 個時標示截斷。
- Teaching-week 集合仍用於衝突判斷，沒有 Teaching Week 篩選介面。
- 使用者輸出為 PNG。重新整理／關閉不會恢復可編輯課表，沒有 Open／Export project 按鈕。底層保留 schemaVersion 1／.ttap.json 相容 adapters 及單元測試。
- 歷史 student HTML 與 solver 案例有 regression 覆蓋；目前真實登入後 UTAR 課程頁仍需另驗證。混學期 metadata／部分重複 rows 合併有限制，請勿混合不同學期。
- PNG 有大小／像素邊界，過大明細顯示錯誤，不靜默截斷。
- 不代為登入、不自動註冊課程、不上傳課表或做雲端同步。

## 授權與 Acknowledgements

感謝 Wong Jia Hau 的 [TTAP](https://github.com/wongjiahau/ttap-web) 提供原始實作及啟發。具體移植項目包含 student HTML parser、排課 partition／backtracking 邏輯、歷史測試資料，並改寫教學流程；詳見 [UPSTREAM.md](UPSTREAM.md)。

[LICENSE](LICENSE) 保留 Copyright (c) 2017 Wong Jia Hau 及 MIT 全文，加入 Copyright (c) 2026 ruisa87not-star。[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) 保留 React／ReactDOM／scheduler 聲明；Windows runtime 保留 Electron／Chromium 授權文件。

現有 TTAP logo 由使用者提供，使用者已確認可公開散布且同意本次保留。教學 PNG 使用合成課程資料；原始學生網頁、私人截圖、登入狀態與憑證不納入 repo。

本次遷移的實際檔案與驗證結果見 [docs/MIGRATION_REPORT.md](docs/MIGRATION_REPORT.md)。

