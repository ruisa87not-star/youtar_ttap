# Windows Tauri 驗證報告

> 後續更新：2026-10-27 已修正真實登入轉址與新的 Survey 課程頁路徑，並重建本機安裝檔。本報告以下保留首次交付時的測試與 artifact hash；目前產物、登入證據及最新 hash 請見 [LOGIN_DIAGNOSIS.md](LOGIN_DIAGNOSIS.md)。

初次建置：2026-10-26；最終核對：2026-10-27（Asia/Kuala_Lumpur）。本輪僅本機實作、測試與打包，未 staging、commit、push、建立 Release 或觸發部署。

## 產物

| 項目 | Bytes | 十進位 MB |
| --- | ---: | ---: |
| release 主程式 youtar_ttap_tauri.exe | 4,387,328 | 4.39 |
| NSIS x64 安裝檔 | 2,243,862 | 2.24 |
| 解壓後 app＋授權 payload | 8,170,826 | 8.17 |
| 既有 Electron 主 exe 基線 | 249,846,784 | 249.85 |

Tauri 主 exe 低於設計的 100,000,000 bytes，約比 Electron 主 exe 小 98.2%。未使用 UPX，也未修改 Electron runtime。payload 數字不包含安裝時生成的 uninstaller、磁碟配置差異或系統共用 WebView2；不能視為完整系統占用。

本機位置（相對 repo 根）：

- `src-tauri/target/release/youtar_ttap_tauri.exe`
- `src-tauri/target/release/bundle/nsis/youtar_ttap (Tauri)_0.5.1-beta.1_x64-setup.exe`
- `src-tauri/target/release/bundle/nsis/SHA256SUMS.txt`

SHA-256：

~~~text
913100b3a0bf04e77a81074f5ac61b891a1eba80b2d945dc4d9344958055245f  youtar_ttap_tauri.exe
3cf4fbc2a653b9290d2e1aef435e1b9c0895f73bac51896581a41f8668dcc5f1  youtar_ttap (Tauri)_0.5.1-beta.1_x64-setup.exe
~~~

主程式 Authenticode 狀態為 NotSigned。安裝器採 currentUser NSIS，識別為 `com.ruisa87not-star.youtar-ttap.tauri`，與 Electron 分開。已用 7-Zip 解壓核對程式及所有授權資源；沒有在日常使用者帳戶執行安裝／解除安裝。

NSIS 內的主程式 SHA-256 為 `0f91b849cd414e3931d0fc2972bd9881986d3781fbb48d3b9e1307916813b890`。它與獨立 exe 僅有 bundle 類型標記的 3 bytes 不同（UNK → NSS）；已查核鎖定的 tauri-utils 2.10.2 `src/platform.rs` 所記載的建置時 patch，正規化該唯一標記後所有位元組完全相同。不是以忽略任意 binary 差異代替比對。

## 實作範圍

保留 Web／Electron，新增 Tauri-only bootstrap、DesktopBridge、Rust bounded I/O、原生開啟／儲存、未匯出關閉保護、隔離 UTAR 子 WebView，以及獨立 Vite／NSIS 設定。排課、HTML parser、PNG、教學與介面繼續共用。

UTAR 子 WebView 維持官方 HTTPS origin、InPrivate profile、compact CSS、同視窗呈現。原生 COM 會核實 InPrivate，不支援時顯示錯誤。拒絕其他 origin、下載、裝置權限；課程表只由固定 script 讀取，限制 10 MiB 並檢查 navigation generation。HTTP／連線與登入錯誤可見。

只有 planner label 的本機 WebView 得到 AppManifest／capability 權限；每個 Rust handler 另核對 label／URL。沒有新增任意 path、URL、eval 或 shell IPC。正式設定不開 devtools 或 CDP；整合測試只在專用程序的環境啟用 ephemeral CDP。

## 驗證結果

完整本機日誌位於被 Git 忽略的 `logs/tauri-*.log`，包含命令、開始／結束 UTC、stdout／stderr 與 exitCode。

| 驗證 | 結果 | 日誌 |
| --- | --- | --- |
| 乾淨 npm ci，固定 lockfile | 通過；467 audited，0 vulnerabilities | tauri-37-clean-install.log |
| TypeScript 7 typecheck＋Oxlint＋單元測試 | 通過；27 files，155 tests | tauri-57-final-check-green.log |
| Rust fmt --check | 通過 | tauri-59-final-rust-suite.log |
| Clippy --all-targets -- -D warnings | 通過 | tauri-59-final-rust-suite.log |
| Cargo test | 通過；10 單元測試，binary／doc tests 0 | tauri-59-final-rust-suite.log |
| Vite Web production build | 通過 | tauri-32-web-build.log |
| electron-vite＋electron-builder --dir | 通過 | tauri-33-electron-build.log |
| 原有 Web Chromium／Firefox＋Electron E2E | 46／46 通過 | tauri-40-web-electron-e2e.log |
| 真實 Tauri debug 整合 | 3／3 通過 | tauri-28-native-retry.log |
| 真實 Tauri release 整合，含遠端子 frame／同網址讀取競態 | 4／4 通過 | tauri-58-final-native-suite.log |
| NSIS 實際解出的主程式 | 同一組 4／4 通過 | tauri-60-installer-payload.log |
| Tauri optimized release＋NSIS | 通過 | tauri-56-final-package.log |
| 開發模式／React Refresh／原生 IPC／console | 通過；console errors 0，CLI 正常結束 | tauri-44-dev-resume.log、tauri-47-dev-ui-green.log |

Tauri 整合測試實際啟動 exe 與兩個獨立 WebView2 browser environments，沒有替換 native command handler。UTAR 網路頁以合成 fixture 攔截，驗證 compact 登入、全部 12 個 app commands 從遠端被拒、子 frame 呼叫被拒、跨站阻擋、HTTP 503、連線失敗、登入錯誤、指定課程頁擷取與匯入、Demo／分組／Clear／時間軸及無畫面外溢。

新增競態測試以 CDP function breakpoint 暫停真正的 readCourseTable 呼叫，開始同網址 reload 並暫緩新 response，確認 native loading 事件已發生。舊讀取必須回傳 The page changed，且沒有出現匯入視窗；放行新 response 後可正常匯入。測試沒有修改產品讀取腳本或增加原生測試開關。原生 overlay 隱藏／OS resize 的自動斷言仍有限，另有前述真實 GUI 操作證據，列為小項限制。

Rust 單元測試涵蓋錯誤 origin、非授權 caller、座標、嚴格 UTF-8、多檔合計大小、PNG 格式與尺寸、原子替換失敗保留原檔、dirty／ack sequence、navigation generation 與過期 completion。TS 測試另驗證延遲 listen cleanup、大型 UTF-8 表格在回傳前拒絕、PNG／project 驗證及取消結果。

### 真實原生操作 smoke

使用 Windows Computer Use 操作實際對話框，與 mocks 區分：

1. Choose HTML files 開啟合成 student-v2.html，得到 2 courses／5 classes。
2. Export image 使用原生 Save，寫出 `.cache/tauri-native-smoke.png`；267,984 bytes，1600×1784，PNG signature 與課表／選課指引內容已檢查。
3. 變更選科後取消原生 Save；Export image 恢復可用，Image not exported 保留。
4. 隱藏的 FilePort project adapter 經原生 Save／Open，讀回相同 schemaVersion 1 合成專案；沒有增加產品專案操作列。
5. 原生關閉未輸出課表會顯示既有 Keep your changes?；Cancel 保留應用。
6. 在 release exe 的專用測試程序暫停 JavaScript，點擊主視窗 Close；約 3 秒後顯示原生 not responding／Discard and close／Keep open。選 Keep open 後應用保留，除錯器自動恢復。
7. 已看到正式版啟動最大化（Windows Restore 按鈕），官方真實登入表單亦曾正常緊湊呈現；未輸入或送出任何真實帳密／CAPTCHA。

PNG SHA-256：`d62fd0e7ac5f4280d9ff45d1bcce03b738333c9dffd13ddfc7d08879cfacad67`。

### 曾失敗的檢查與修正

所有錯誤先顯示完整日誌後，才修正目標內容。測試斷言與時間上限沒有為了通過而降低。

- tauri-02／09：新增模組尚未實作的預期 RED；其後 bridge／共享 script 測試通過。
- tauri-11／15／16／19：純函式、狀態、close ack、caller 的實際斷言 RED，實作後通過。
- tauri-01：舊 powershell.exe bootstrap 無 Get-FileHash；改用 .NET SHA-256，官方下載 hash 驗證後安裝專案工具鏈。
- tauri-08／10：Rust 自動選到缺少 CRT 的 VS2026，且 cmd quoting 失敗；wrapper 選取完整 VS2022 並以 windowsVerbatimArguments 載入其環境。沒有改系統 PATH／安裝 Visual Studio。
- tauri-05：jsdom 測試誤依賴 canvas 影像解碼；使用既有有效 PNG fixture 測 bridge，產品未變。
- tauri-07：冷啟並行建置時既有 launcher 測試 timeout；未放寬限制，最終乾淨完整 155 tests 通過。
- tauri-21：巨型字串失敗 diff 阻塞輸出，停止該測試程序；改比較 kind，tauri-22 得到明確 `expected table to be too-large` RED。加入回傳前 UTF-8 大小檢查後通過。
- tauri-25：真實整合找出跨站錯誤被後續事件清掉、HTTP503 被誤報為一般連線失敗。tauri-26 重現後修正狀態持續性與 HTTP 優先序，tauri-28／41 全過。
- tauri-30：Clippy 報 2 個測試內不必要的 clone；改用 slice::from_ref，嚴格檢查通過。
- 手動取消 smoke 曾等待超過 helper 的 120 秒，因視窗操作協調未完成；實際取消後另行驗證按鈕與 dirty 通過，未修改產品。
- tauri-45／46：開發探針先誤用舊版 React Refresh marker／export；查閱安裝的 plugin-react 6 原始碼後改驗證 injectIntoGlobalHook、$RefreshReg$、$RefreshSig$。同時完整 console 記錄顯示共用 Web HTML 的 CSP 擋住 IPC fetch，雖然 postMessage 備援仍成功。Tauri Vite serve 現在從 tauri.conf.json 套用 devCsp；tauri-47 的 native invoke 成功且 console errors 0。正式／Web 的 CSP 沒有因此放寬。
- tauri-48～52：CDP 接線前原生頁的首個真實請求與 fixture 初始化互相干擾，尚未執行競態本身。harness 現在先停止未受控載入、明確載入 fixture 並核對標題，再測 native Reload；保留原 10 秒斷言。tauri-53 另觀察到 WebView2 在 reload 時會自行 resume 舊腳本，測試按實際 resumed 事件控制。
- tauri-55：嚴格 lint 拒絕測試中的 debugger statement，改為 CDP 原生 function breakpoint；沒有停用 lint 規則。tauri-57 完整檢查、tauri-58 原生 4 tests 全部通過。
- 最後加上的 binary 相等檢查先因 Tauri bundle 類型 patch 失敗；完整逐位比較顯示只有上述 3 bytes。核對原始碼後，驗證器只正規化唯一的固定標記，要求其他位元組全等，並另對 NSIS 解出的 exe 跑 4 項整合測試通過。

## 授權與來源保護

原 MIT LICENSE、Wong Jia Hau 版權、ruisa87not-star 版權與既有 THIRD_PARTY_NOTICES／UPSTREAM 全部保留。Tauri 打包包含 251 個鎖定 Windows runtime／build dependencies 的聲明與完整 Rust standard library notices。少數 crates 缺少 license 檔的來源以固定 commit／crates.io archive 記錄；MPL 項目提供精確原始碼取得網址與全文。來源依據：[Mozilla MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)。

唯讀來源 ttap_utar_fork 的 479 個受審查檔案，完整 digest 仍為：

~~~text
cac0ea9b583ee3125f5c59b2cd32ac631e86d8e65ca9ddf62b948c5b7a8591b8
~~~

103 檔原複製白名單的來源 hashes 亦未變。Git HEAD 仍為 2102eda631918306ac5bf3ece7d3e63681380f16，工作分支 codex/tauri-windows，staged 清單為空。沒有連接／修改 upstream，沒有公開發佈新安裝檔。

## 工程決策與限制

- 直接在獨立 youtar_ttap checkout 的新分支工作；不再建立第二份 worktree。若選錯目錄會影響該 checkout，因此每次寫入明確指定目標並核對來源 digest。
- 執行 ledger／scratch 放在本機 visualization 目錄，不提交工具鏈、測試輸出或帳密。沒有依技能預設自動提交／清除；遵守使用者先審閱再 commit 的規則。
- 使用者批准直接完成，未再插入實作計畫批准停點。
- MSVC／Rust 僅在工具鏈 cache 與子程序環境設定；其他開發者仍須安裝官方前置工具，首次完整 Rust 編譯較久。
- 使用 Tauri 2.12.5 unstable child API 並鎖定；升級須重新驗證原生權限／layout。
- JSON escaping 可能放大表格文字，因此先在頁面檢查 UTF-8 10 MiB，再在 native 檢查已解碼文字；序列化回傳額外設有最壞 6 倍上限。
- 整合測試使用程序限定 CDP 與合成官方 origin。這不代表真實帳號登入、註冊期負載、CAPTCHA 或當期課程資料已驗證。
- 為保留完整授權，採保守的 Windows runtime＋build graph，而非猜測 linker 去掉哪些元件；增加約 3.8 MB 解壓授權資料。
- 未簽章，未做全新 Windows VM 的安裝／解除安裝及缺少 WebView2 的 bootstrap 實測；這些是公開發佈前尚需補做的驗收。多螢幕跨 DPI 切換亦未完整覆蓋。
- 最終重建後既有 Electron beta 安裝檔的 SHA-256 仍為 `14829972f97c43da1027c4558bbf401cc76d78d606f68c94413e8a46f35aea44`，與先前公開檔案相同。

## 獨立審閱

已完成一次 fresh-context 全變更審閱。前次嘗試因用量限制中斷，未取得結論；2026-10-27 的審閱完成後以一輪補強及測試閉合，沒有再要求第二次審閱。

- Critical：未發現明確執行錯誤或權限繞過。
- Important：缺少 navigation-during-read 原生整合證據。已新增上述同網址 reload／pending read 測試，tauri-58 正式 exe 4／4 通過；原本的 generation 防護未因補測而修改。
- Minor（保留）：native overlay 隱藏、視窗 restored／maximized／resize 的自動化斷言仍不足。已有實際 GUI 顯示與操作證據，但不把 React dialog 存在或單次 width 檢查當成完整原生 layout 驗證。

審閱未裁定項目的處理：真實 UTAR 帳號／CAPTCHA、全新 VM 安裝與 WebView2 bootstrap、跨螢幕 DPI 仍明確列為尚未驗證；完整授權法律解釋不屬於程式碼審閱，這次提供原文與來源追溯；開發啟動由主實作者另以 tauri-47 驗證成功。若這些外部條件不同，仍可能需要額外調整，因此本機完成不代表已核准公開發佈。

## 待審閱的檔案清單

以下是最終 git status --short --untracked-files=all；全部尚未 staging，沒有 commit／push。建置產物、工具鏈、測試瀏覽器與日誌均被 .gitignore 排除。

~~~text
 M .gitignore
 M README.md
 M package-lock.json
 M package.json
 M src/main/registration.ts
 M src/renderer/main.tsx
?? docs/TAURI_VERIFICATION.md
?? docs/superpowers/plans/2026-10-26-tauri-windows.md
?? docs/superpowers/specs/2026-10-26-tauri-windows-design.md
?? licenses/tauri-overrides/MPL-2.0.txt
?? licenses/tauri-overrides/SOURCES.json
?? licenses/tauri-overrides/alloc-stdlib-LICENSE.txt
?? licenses/tauri-overrides/webview2-LICENSE.txt
?? licenses/tauri/RUST-COPYRIGHT-library.html
?? licenses/tauri/THIRD_PARTY_NOTICES.txt
?? playwright.tauri.config.ts
?? scripts/tauri-notices.mjs
?? scripts/tauri.mjs
?? src-tauri/Cargo.lock
?? src-tauri/Cargo.toml
?? src-tauri/build.rs
?? src-tauri/capabilities/planner.json
?? src-tauri/icons/32x32.png
?? src-tauri/icons/icon.ico
?? src-tauri/permissions/planner.toml
?? src-tauri/src/close.rs
?? src-tauri/src/commands.rs
?? src-tauri/src/files.rs
?? src-tauri/src/lib.rs
?? src-tauri/src/main.rs
?? src-tauri/src/native_webview.rs
?? src-tauri/src/policy.rs
?? src-tauri/src/registration.rs
?? src-tauri/src/state.rs
?? src-tauri/tauri.conf.json
?? src/platform/tauri.ts
?? src/shared/registrationScripts.ts
?? tests/planner/RegistrationScripts.test.ts
?? tests/platform/tauri.test.ts
?? tests/tauri/desktop.spec.ts
?? tests/tauri/harness.ts
?? vite.tauri.config.ts
~~~
