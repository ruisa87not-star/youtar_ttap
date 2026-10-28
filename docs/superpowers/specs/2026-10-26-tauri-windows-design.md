# youtar_ttap Windows Tauri 版設計

日期：2026-10-26（Asia/Kuala_Lumpur）。狀態：使用者已於 2026-10-26 批准，2026-10-27 完成本機實作與驗證；詳見 docs/TAURI_VERIFICATION.md。

## 目標與範圍

使用者在 Electron 體積檢查後要求「製作一個 tauri 版」。目前官方 Electron 主 exe 為249846784bytes，應用程式與素材的 app.asar 只有3007956bytes。新版本以 Tauri2／Windows WebView2 移除每份應用都附帶 Chromium／Node 的固定成本，目標是**release主exe小於100000000bytes**，以實際產物量測為準。

在獨立repo `C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap` 增加 Tauri Windows x64 版，共用現有 React／TypeScript 介面、HTMLparser、solver與PNG繪製。Web與Electron仍可建置及使用。`C:/Users/DarylWong/Documents/ChatGPT/ttap_utar_fork`全程唯讀。現有GitHub的Electron beta下載不可覆寫。

這次完成可使用的版本，不只建立空白殼。介面與排課行為沿用目前產品：教學／Skip、直接顯示UTAR內嵌登入、compact登入框、返回、手動HTML匯入floating視窗及指南、Demo、course/group選擇與即時clash、Clear、UnavailableTime、收合sidebar、週一到週日縱向／時間橫向課表、PNG選課指引及未輸出關閉保護。

不增加UI重設計、教學週篩選、專案存檔按鈕、雲端同步、自動選課、Mac/Linux、網站部署或自動更新。既有隱藏FilePort專案讀寫契約保留，不因此增加產品UI。

## 方法選擇

使用者已在先前 Electron／UPX／自編runtime／Tauri 比較後指定 Tauri。

1. **採用：Tauri2＋獨立子WebView顯示UTAR**。同一主視窗同時有本機planner WebView與遠端registration WebView，可保留現有compact嵌入及從課程頁擷取表格。多WebView的Rust API在目前官方2.12.5文件仍要求`unstable`feature；鎖定實際採用的2.x版本、保存Cargo.lock並驗證邊界。
2. Tauri＋跨來源iframe：較簡單，但不能讀取UTAR課程DOM、無法等效呈現登入錯誤，仍受frame政策限制；不能替代目前桌面行為，故不採用。
3. Tauri另開登入視窗：可減少child-view整合，但改變使用者已明確要求的同頁內嵌流程，故不採用。

WebView2使用Evergreen系統runtime。安裝器檢查缺少時下載bootstrapper，不把完整WebView2離線引擎塞進安裝檔。體積報告須分開列exe、安裝檔及系統共用runtime依賴，不能以省略依賴來宣稱總占用等於exe大小。

## 架構

- 保留根package與npm lockfile，新增`src-tauri/`Rust入口、Cargo.toml/Cargo.lock、tauri.conf.json、capabilities、必要app permissions及打包圖示。
- 新增獨立Tauri renderer build輸出，例如`dist-tauri/`，避免Web建置與Tauri bridge混用；Tauri CLI Rust target、工具鏈cache、bundles均忽略，不能提交。
- renderer啟動前安裝Tauri DesktopBridge，再render App；Web/Electron分支不載入Tauri橋接功能。延用`window.ttap`／FilePort介面，避免讓整套planner依賴桌面框架。
- Rust負責原生選檔／儲存、限定內容的檔案I/O、主視窗關閉控制，以及UTAR子view生命週期／位置／狀態。原生操作結果維持`ok/cancelled/error`三態。
- 新npm scripts提供`dev:tauri`、`build:tauri`、`package:tauri`及適合的檢查／整合測試指令；不改掉現有Web/Electron命令。
- Tauri產品識別與Electron分開，建議顯示名稱`youtar_ttap (Tauri)`、binary名稱`youtar_ttap_tauri`、identifier `com.ruisa87not-star.youtar-ttap.tauri`。這是實作者的提案，避免兩版安裝或解除安裝互相覆蓋；不搬移或刪除舊版profile。
- 沿用現有版本號0.5.1-beta.1進行本機開發驗證，產物名稱明確包含Tauri。不覆寫v0.5.1-beta.1的Electron資產；後續公開新版本的tag／版本號另行依最終待提交內容決定。

## UTAR子view與安全邊界

- 主視窗啟動即最大化；子view依現有RegistrationScreen的slot傳入logical座標，native再次檢查finite值、視窗範圍及最小頂部邊界。resize、隱藏頁面、modal、返回及錯誤時均正確隱藏／重測，不能蓋住教學或匯入視窗。
- 子view使用獨立profile與incognito／非持久session；不得分享planner的儲存或持久化UTAR登入帳密。最低WebView2版本須支持採用的incognito行為，不可靜默退回持久登入。
- 只允許`https://unitreg.utar.edu.my`，拒絕URL帳密、其他origin、非HTTPS、非預期popup；同站popup導向原view。不關閉TLS／web security，不自行代填或提交帳密／CAPTCHA。
- planner本機view才可使用native commands。capability必須按**webview label**限制，不能只授權整個window，否則UTAR子view可能一併得到權限。自訂commands用AppManifest列舉並分配許可；每個command再次檢查caller label與本機origin。
- 不提供任意path讀寫、任意eval、shell或任意URL導覽IPC。遠端view不獲得FilePort／應用capabilities；拒絕裝置權限與下載。
- 登入CSS沿用Electron現有compact規則，保留官方form、scripts、CAPTCHA與錯誤；以無帳密fixture驗證。登入錯誤偵測沿用共享邏輯或由共享script產物提供，不靠複製兩份維護。
- `Preview courses from this page`只在指定UTAR CourseTimetablePreview路徑執行固定的原生eval_with_callback，拒絕登入form，只傳回`#overviewSector table`與必要容器，不讀取或傳回帳號頁首／cookies／password。結果上限10MiB，附navigation generation檢查與timeout，避免切頁或關閉後套用舊結果。
- 連線／HTTP／導覽錯誤需顯示實際可取得的資訊，登入錯誤保持可見。若子view或擷取失敗，顯示錯誤並可Reload／手動HTML匯入；不得把不支援的整合功能假裝成通過。
- 主view使用本機資產CSP，Release不開devtools或debugging listener。測試用fixture／CDP設定只可由測試啟動環境提供，不放進release app設定。

## 檔案與關閉行為

- HTML在native選檔後才讀取；只接受regular HTML/HTM、嚴格UTF-8，多檔合計10MiB，使用bounded read防止檔案變大超限。返回basename與文字，不暴露選定完整path至renderer。
- PNG輸出維持既有data URL、base64及PNG header／尺寸／像素／10MiB限制，Rust邊界也驗證。只寫入使用者native Save對話框選定的位置，採同目錄暫存與原子替換；失敗不能破壞原檔，取消不得清除dirty。
- 內部project adapters維持既有schemaVersion1及選檔／內容上限，不增加UI。encode/validate沿用共享TS契約，native只處理受限且使用者選定的I/O。
- dirty由主planner傳給Rust。CloseRequested先阻擋並觸發既有「Keep your changes?」流程；只有明確confirmClose或乾淨狀態才關閉。renderer無回應時須有native保留／放棄確認路徑，不能直接丟棄。

## 環境與產物

目前已找到VS2022 C++ BuildTools及WindowsSDK10.0.26100.0；PATH及預設cargo/bin未找到Rust。實作前補齊Rust MSVC工具鏈，優先用專案內被忽略的cache與process環境，不修改來源專案、不改系統安全設定。

交付Windows x64 release exe及NSIS installer、SHA-256、建置命令與README三版本說明。使用者端不需Node或Rust；WebView2缺少時需網路安裝。沿用logo與MIT原版權／新貢獻者版權，包裝包含THIRD_PARTY_NOTICES與Tauri/Rust依賴授權追溯。

本輪先完成本機實作與驗證。依使用者既有要求，commit前展示gitstatus與待提交清單；不能把先前針對Electron版本的release授權當成覆寫既有資產的許可。新Tauri版本公開發佈須以可審閱的新產物進行。

## 驗證與完成條件

1. Web／Electron既有typecheck、Oxlint、145項單元及46項E2E保持通過；有新增測試則報告新總數，不降低規則或刪除斷言。
2. Tauri bridge Vitest驗證成功／取消／錯誤、event cleanup、dirty／close、位置與native API呼叫。Rust單元測試驗證URL／路徑、size、UTF-8、PNG及原子寫入失敗不破壞原檔。
3. `cargo fmt --check`、`cargo clippy --all-targets -- -D warnings`、`cargo test`及release build／NSIS成功。新增套件版本及Cargo.lock固定且只有Windows所需依賴。
4. 真實Windows Tauri整合測試驗證最大化、教學／Skip、compact child-view、mock官方login／HTTP／connection錯誤、reload、同站及跨站導覽、擷取課程表／navigation競態、手動HTML、Demo、選科／clash／groups、PNG儲存及dirty取消。
5. 實際嘗試由remoteview及非授權frame呼叫檔案／關閉commands必須被拒絕；匯入HTML中的script／iframe／外部資源不得執行或請求。
6. 至少一次實際native開啟HTML與儲存PNG smoke；比對產出PNG內容及signature。UTAR合成頁測試不等於已驗證真實帳號登入，須明載限制作為交付資料。
7. release主exe實測小於100000000bytes；記錄installer及解壓總大小與Electron基線對照。若未達目標，先提供實測及原因，不能宣稱已達成。
8. 原來源仍唯讀；Web／Electron可繼續使用；沒有覆寫或刪除既有Release／installer／profile。新增Tauri失敗可停止使用此target，既有兩版不受影響。

## 留給實作者的選擇

精確Tauri2.x／CLI／Rust stable版本在安裝前核實並鎖定；Rust模組分檔、boundedfile helper與原生對話框crate選擇可依最小依賴決定。桌面自動化優先延用現有Playwright測試工具並以測試啟動環境啟用WebView2CDP；若平台限制則採官方tauri-driver／WebDriver，測試須明確區分mock與真實nativeI/O。不得為測試放寬production ACL。

## 官方資料

- https://docs.rs/tauri/latest/tauri/webview/struct.WebviewBuilder.html — child-view API、unstable feature及Windows async建議。
- https://docs.rs/tauri/latest/tauri/webview/struct.Webview.html#method.eval_with_callback — 回傳JSON的固定script讀取。
- https://v2.tauri.app/security/capabilities/ — webview授權及AppManifest commands預設行為。
- https://v2.tauri.app/start/prerequisites/ — Windows Rust/MSVC/WebView2。
- https://v2.tauri.app/distribute/windows-installer/ — NSIS及WebView2bootstrapper。
