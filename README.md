# youtar_ttap

由 ruisa87not-star 獨立開發與維護的 UTAR 排課工具，同時提供 **Web 版**與 **Windows x64 Electron 版**。兩個版本共用介面、HTML 匯入、排課核心、衝突檢查及 PNG 選課指引。

本應用包含移植及改寫自 [Wong Jia Hau 的 TTAP](https://github.com/wongjiahau/ttap-web) 的程式與測試資料；詳見 [UPSTREAM.md](UPSTREAM.md)。本應用由社群獨立維護，實際選課仍須在 UTAR 官方系統完成。

## 功能

- 可略過／重開的教學、內嵌官方 Course Registration 登入頁。
- 貼上 HTML 或匯入多個 HTML 檔，預覽後確認；手動匯入附合成資料示意圖。
- Demo 課程目錄與課表、選科、Lecture／Tutorial／Practical 分組、即時衝突檢查。
- 不相容課程停用並顯示 Course Clash；Clear 可取消所有選科及固定分組。
- 可收合課程 sidebar、Unavailable Time、即時課表候選比較。
- Mon–Sun 由上往下，08:00–18:00 時間軸橫向顯示；Unavailable Time 不延長範圍，實際課程超出時才延長。
- 匯出包含課表、課程／分組／地點／學分及選課步驟的 PNG。
- Windows 啟動時最大化；長清單在各自區域捲動，介面隨視窗調整。

## 使用 Web 版

公開託管網址尚未決定。開發者可用 dev:web，或以 preview:web 預覽 production build。Web 使用官方頁面的 iframe；初始緊湊登入畫面可切換完整頁面。UTAR 的 frame／第三方 cookie 政策可能阻擋登入，這時請用 Open official page，從官方 Course Timetable Preview 儲存 HTML，再於 Add slots manually 匯入。

跨來源限制使 Web 無法擷取登入欄位、錯誤訊息或課程 DOM；錯誤仍由官方表單顯示。

## 使用 Windows 版

正式發佈後，安裝檔將放在**此 repository 的 GitHub Releases**；遷移本身不建立 release 或上傳檔案。安裝檔命名為 youtar_ttap-Setup-版本-x64.exe。使用者安裝後從桌面／開始功能表啟動，無須 Node.js。

開發者完成本機打包後，也可雙擊 [Start-youtar_ttap.cmd](Start-youtar_ttap.cmd)。啟動器只讀取本專案的 release/win-unpacked/youtar_ttap.exe；不存在或舊於原始碼時，會以已安裝的 Node.js／依賴重新打包。建置失敗會停止，不開啟舊產物。

目前未配置程式簽章、自動更新或其他桌面平台。未簽章檔案可能有未知發行者／SmartScreen 提示。新應用身份與舊 TTAP 分開，不自動搬移舊 profile。

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

