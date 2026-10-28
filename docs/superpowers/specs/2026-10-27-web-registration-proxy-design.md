# Web UTAR 隔離登入代理設計

日期：2026-10-27。狀態：**已依使用者「繼續未完成計畫」恢復本機實作與合成驗證；尚未部署，真實 Web 登入仍待正式環境人工驗收**。執行中裁決與證據見 docs/WEB_PROXY_VERIFICATION.md，包含 strict-origin 及 frameset 正規化的必要調整。

## 使用者已確認的需求

- Web 版也必須在應用內完整登入，不能只用 HTML 匯入作為解決方案。
- 採用獨立 HTTPS 代理方向，接受新增代轉 UTAR 帳密及短期登入工作階段的服務，先準備設計與驗證。
- 有可執行 Node.js／Docker 的 VPS／伺服器；已確認能新增並管理同主網域子網域的 DNS／TLS。實際使用的 hostname、OS、TLS／反向代理設定仍留待部署前確認。
- 保留 Web、Electron、Tauri、排課核心、教學、手動匯入及 PNG 匯出。來源 `ttap_utar_fork` 唯讀；不 staging／commit／push，不自動部署或啟用 CI。

## 成功條件與範圍

訪客打開已配置的 Web 版即可看到內嵌登入頁，人工輸入 CAPTCHA；錯誤可見，成功後可瀏覽課程預覽，按「Preview courses from this page」匯入課程並使用現有排課器。保留緊湊登入視窗、進入課程頁後的完整檢視及固定 viewport。

本服務只支援登入及課程預覽需要的最小導覽／讀取流程，**不代理選課提交／加退選／繳費／帳號變更**。不代解 CAPTCHA，不自動註冊、不做 SSO、不把帳密或課表存進 PocketBase。不把 UTAR 整頁 DOM 放入主站 origin。

在真實部署環境與手動 CAPTCHA 尚未驗證前，只能宣稱「合成驗證通過」，不能宣稱網頁真實登入完成。

## 選擇的方向與替代方案

已選：在自行控制的 VPS 運行單一實例的隔離代理，保留官方 UTAR 表單和腳本。伺服器代轉請求並將已知 HTTP redirect 升級 HTTPS。

其他方向：等待 UTAR 修正轉址／HSTS 不在本專案控制內；瀏覽器擴充套件需要安裝且簡單 upgradeScheme 原型已失敗；手動 HTML 匯入不滿足本次完整登入要求。詳見 `docs/WEB_LOGIN_OPTIONS.md`。

自行重建登入表單不是本次選擇：會重複維護官方 hidden fields、CAPTCHA 和錯誤行為。隔離的官方頁面能先保留這些行為；不相容的動態導覽必須實測修正或明確回報，不能改用廣泛 open proxy。

## 執行環境與部署邊界

- Node.js 24 LTS，TypeScript 只使用 Node 可直接移除的型別語法，獨立 `server/registration-proxy/`。共用根目錄的唯一 package-lock；不加入框架或新 package manager。
- server 採 Node module resolution／erasableSyntaxOnly 的獨立 typecheck 設定，加入既有 typecheck／lint／Vitest gates；server 不被 Web、Electron 或 Tauri frontend bundle 引入。
- 預計只新增 `parse5`（HTML 解析／重寫）及 `tough-cookie`（每 session 的 RFC cookie jar）。實作時先查官方套件相容性／audit，鎖定精確版本；不得手寫 cookie 標準或用 regex 取代 HTML parser。
- 一個 Docker 容器／Node 行程。沒有多副本、共享儲存、資料庫或 Redis。部署草案必須明確禁止在未加入共享 session／限流設計前多副本執行。
- production proxy 必須為**不同 origin、同 site**的專用 HTTPS hostname；例如主站 `https://planner.example.test`、代理 `https://registration.example.test`。這是示例，不建立 DNS。使用 `__Host-`、Secure、HttpOnly、SameSite=Strict cookie；不以 SameSite=None 規避跨站部署。
- 部署 gate 必須稽核主站／登入後回應的敏感 cookie：不可用會傳給 proxy hostname 的父層 Domain scope；改成 host-only／__Host- 後才能公開代理。已讀取的主站 frontend auth 使用 localStorage，但這不代替檢查實際伺服器 Set-Cookie。代理端也不允許 upstream cookie 直接進入瀏覽器。
- 建議 TLS 在自行控制的反向代理終止，proxy hostname 使用 DNS-only 方式，避免額外 CDN/WAF 取得登入 body；最終網路路徑／TLS 設定須在部署前確認。實作只提供設定範本，不修改現有伺服器或 DNS。
- 固定公開 proxy origin 及允許嵌入的 planner origin 必須配置並驗證；不從任意 Host／X-Forwarded-Host 推導。Node bind loopback／容器內介面，只有受信的本機反向代理能提供 forwarded 資訊。
- 上游固定為 `https://unitreg.utar.edu.my:443`，啟用正常 TLS 驗證。Windows Node 曾需系統 CA 才能完成該站的鏈驗證，因此 production Linux／Docker 的憑證鏈驗證是獨立 gate；不預設它可行，也不使用 ignoreHTTPSErrors／NODE_TLS_REJECT_UNAUTHORIZED=0。

## 資料流與隔離

1. 主應用 iframe 指向配置的代理登入入口；該 frame 的 origin 與主站不同。畫面清楚註明「透過自行託管的 UTAR 登入代理」。
2. 代理建立隨機 256-bit opaque session ID，瀏覽器只持有代理 cookie。每 session 在記憶體中持有自己的 cookie jar、CSRF token、已觀察到的 passid 及有限導覽狀態。
3. 登入表單、hidden fields、CAPTCHA 與提交仍遵循官方頁面。代理只為本站登入 POST 加入並驗證自身 CSRF field，送往上游前移除該 field；不解析／解碼 CAPTCHA 答案或 hidden CAPTCHA 值。
4. 帳號、密碼與 CAPTCHA 僅在當次請求轉送。不得寫入 session、檔案、資料庫、cache 或日誌；請求生命週期結束後不保留引用。這不等同能保證 JavaScript 記憶體立即清零。
5. 上游 cookie 不以 Set-Cookie 直接送給訪客，僅保留在所屬 jar。上游 passid 可以存在隔離頁面需要的 URL／hidden fields 中；不得傳到外層主站、日誌或分析系統。代理只接受該 session 從可信上游回應觀察到的 passid，拒絕未知或其他 session 的值；登出／到期後全部失效。
6. 原始 UTAR HTML／腳本只在隔離 origin 執行，無主站 cookie、storage、DOM 或原生 IPC 存取權。iframe 禁止 top navigation、popup、下載及檔案權限。
7. 只有使用者按 Preview 時，固定橋接腳本才將 `#overviewSector table` 的有限 HTML 傳回 planner，由既有 parser 解析；不傳整頁、表單、帳號區塊、cookie 或 URL query。

## 上游請求 policy

- `fetch` 使用 manual redirect，**每一跳**先驗證 URL。只接受精確 hostname、無 URL 帳密、標準連接埠；已知同主機 HTTP 先升級 HTTPS，不發出 HTTP。拒絕其他 scheme、host、IP、port 與超過 8 跳的循環。
- 初始 document GET allowlist：`/portal/courseRegStu/login.jsp`、`indexSurvey.jsp`、`registration/studentRegistrationSurvey.jsp`、`schedule/masterSchedule.jsp`、`schedule/masterScheduleSurvey.jsp`。每個都是精確路徑，不開放整個 portal prefix。
- 初始唯一上游 POST：`/portal/courseRegStu/loginProSurvey.jsp`，僅支援受限的 `application/x-www-form-urlencoded` 登入。其他 POST／PUT／DELETE／帳號操作回應清楚錯誤。303 改 GET；301／302 依 browser form redirect 語義處理；307／308 保留 method/body，但仍須通過目標方法 allowlist。
- 公開頁已觀察到 `/portal/Kaptcha.jpg`、`/portal/courseRegStu/skin/main.css`、`skin/print.css`。只為實際需要的同站 static asset 補精確路徑或受限靜態副檔名目錄；禁止 dot traversal、encoded slash／反斜線歧義。省略非必要 PDF、外站 header banner、mail／footer 導覽。
- 不允許呼叫者傳入任意 upstream URL。以解析後的 pathname/method allowlist 判斷，再以固定 origin 重建請求；只有已驗證的 query／form 欄位能轉送。Header 採 allowlist，不轉送訪客 Host、Cookie、Authorization 或 forwarded headers；Referer／Origin 僅依官方流程固定重建，不來自外部輸入。
- 請求 body 上限 16 KiB；HTML 解壓後上限 10 MiB，其他 asset 上限 2 MiB；單次上游 timeout 15 秒，登入流程最多 60 秒。串流讀取時計量，不依賴 Content-Length。上游錯誤訊息去掉私密 URL／stack。
- CSP 在隔離頁面只允許 self 資源、self form、self connect、self 子 frame；legacy inline script／style 僅在此隔離 origin 放行，不放寬主站。明確限制 frame-ancestors 為實際 planner origin；頁面含 nested frame 時也涵蓋該 proxy origin。禁止 object、base、外站導覽能力。

## HTML／URL 重寫

parse5 解析後保留官方表單及 UI 結構，重寫 href/src/action、frame／iframe、CSS URL 和 Location／Refresh 等已觀察到的官方導覽為代理 origin 對應路徑。移除 base、外站可載入／導覽內容和不必要 footer；表單 target 統一限定 frame 內。

對 inline script 中固定的官方 absolute URL，只做明確字串常數替換；不 eval、執行或任意解譯上游 JS。相對 URL 依原文件官方 URL 解析。動態拼接未覆蓋時由 CSP／allowlist 擋下並顯示 unsupported-flow；先修窄例外，不能放寬全部網站／方法。

處理 HTTP header 與 HTML meta refresh；不同 charset 要以支援的編碼解碼並統一 UTF-8 回傳。無法安全處理的編碼／不支援內容類型回應明確錯誤。固定 bridge 與登入樣式由代理保留的 `/__ttap/` 路由提供，不能代理到同名上游路徑。

`parse5` 不是 JavaScript／CSS parser；實作時應先以收集到的公開資源及合成 redirect／frameset 流程確認最小 URL 重寫可用。若需要額外 parser 或實際流程超出以上精確路由，先展示具體證據與影響，再調整設計；不承諾任意 UTAR 頁面都支援。

## Web frame 協定與現有程式整合

- 只在 Web 且配置 proxy origin 時啟用；Electron／Tauri 繼續用原生隔離 view。不建立 window.ttap 假 bridge，也不開放 native API。
- `WebRegistrationFrame` 加入 proxy 模式：直接使用已注入緊湊 CSS 的登入頁，不再套原官方頁的固定偏移裁切；page-kind 通知在課程頁切回完整 frame，仍限制於現有 viewport。
- 使用固定 `postMessage` 協定 `ttap-registration-v1`。兩端驗證 `event.origin`、`event.source`、訊息 schema、長度、固定 command。planner 對 proxy 使用精確 targetOrigin；bridge 對已配置 planner origin 亦然，禁止 `*`。
- 每 document 產生隨機 documentId，每次 Preview 產生 requestId；主應用在 Reload／新 document ready／離開頁面時使舊 request 失效。只接受當前 documentId＋待處理 requestId，防止同 URL reload 後匯入舊表。
- 允許的訊息只有 ready/status（loading、頁型、有限 login error）、使用者要求的 preview request／response、session-expired／logout。status 不含原始 URL、tokens、表單或學生資料；preview 僅在兩個精確 timetable pathname、無 password input、有 table 時允許。
- UTF-8 匯入上限沿用 10 MiB，之後走目前 `onSource` 與 parser／preview confirmation 流程。錯誤／無表格／過大／timeout／reload race 都不匯入。
- Web build 以非秘密設定 `VITE_REGISTRATION_PROXY_ORIGIN` 配置來源；CSP 的 frame-src 必須由同一經驗證的設定產生。宿主網站 header 亦須加入同一 origin；提供整合草案，未經部署批准不改其實際伺服器或網站 checkout。
- 未配置時保留原有官方 iframe 與 HTML 匯入，但顯示已知 HTTP 轉址限制，不宣稱完整登入可用。部署驗收要求 proxy 已配置。

## Session、限流、日誌與停止條件

- 單實例記憶體 session：idle 15 分鐘、absolute 2 小時，最多 200 個；到期、登出、重啟均銷毀 cookie jar／passid／CSRF。伺服器設定可縮小，不可無上限。
- 初始限制：session 建立每 IP 每分鐘 10 次，登入每 session 每分鐘 5 次且每 IP 20 次；全域最多 40 個、每 session 最多 4 個並行 upstream 請求。IP 僅用於短期限流，無持久日誌。反向代理來源判斷需防止假 forwarded headers。
- 登出是受 CSRF／Origin 驗證的 local POST，立即銷毀代理 session。未知官方 logout endpoint 不自動呼叫；畫面說明這是結束代理工作階段，UTAR 端依其原有逾時失效。
- 所有動態／登入回應 `Cache-Control: no-store`、Referrer-Policy: no-referrer；登入 route 不使用 analytics、CDN cache 或錯誤 body 收集。Node／反向代理存取日誌只允許固定事件類型、狀態碼、耗時／計數，不含完整 URL、query、body、cookie、IP、Location 或帳號。
- 本機提供 `.env.example` 只含範例 origin／port 等非秘密值，真實 `.env` 保持 ignore；Docker 容器 non-root、唯讀 filesystem、無持久 volume。TLS 私鑰由部署環境管理，不放入 repo。

## 驗證與交付順序

1. 書面設計審核後才實作。先寫失敗測試：HTTPS POST → HTTP 302 → 安全目的頁，及目前 Survey table。
2. 本機合成 upstream 注入僅存在 test factory；正式啟動器固定官方 origin，沒有環境變數可把它變成任意 URL proxy。兩個 loopback port 作不同 origin、同 site 的 browser fixtures；HTTP transport 僅測試啟動器可用，禁止真實 upstream／真實帳密，正式模式一律 HTTPS／Secure cookie。
3. policy／cookie/session／HTML rewriting／body limits／CSRF／SSRF／跨 session passid／限流測試；canary 帳密／token 不得出現在 logs、cache、main DOM 或未要求的 messages。
4. Chromium＋Firefox E2E：緊湊登入、人工等價合成 CAPTCHA、錯誤後重試、完整課程頁、Preview、舊訊息／同 URL reload race、排課／PNG、session 到期／登出；確認沒有 HTTP egress。Electron／Tauri 原有 gates 保持通過。
5. 提供 Docker／Node 啟動說明、非秘密配置範本、宿主 CSP／Web bundle 整合草案及結果報告。沒有自動啟用 workflow、容器部署或 DNS。
6. 實際 production hostname／TLS／宿主整合經另行批准後，從該 VPS 先驗證官方 TLS，再由使用者手動完成真實 CAPTCHA，確認登入與課程匯入。最後才可公開宣稱完成；需有明確回滾至原 iframe／停用代理的步驟。

驗證失敗先展示完整且去除秘密的錯誤日誌，再按既有授權修復目標 repo。若官方 TLS、來源 IP、CAPTCHA／session 綁定或舊式腳本使方案不成立，保留證據與可回滾狀態，不能關閉保護以取得成功。

## Builder 可自行決定

小型模組拆分、測試 fixture 命名、錯誤碼名稱、Docker base image 的精確安全版本／digest、上述兩個套件的相容精確版本。需保持單一 lockfile、無額外 framework／持久儲存，並將新增依賴與審查結果列入交付報告。

## 獨立設計檢查

`web_proxy_design_check` 的只讀審閱提出一個重要問題：是否能控制同 site 的專用 HTTPS hostname，以及避免主站敏感 cookie 跨子網域共享。使用者已確認 DNS／TLS 管理能力；現有 frontend 使用 localStorage，另將實際回應 cookie 稽核列為部署硬性 gate。沒有其他需由使用者先決定才能規劃本機實作的重要問題。這不代表任何 production／真實代理登入測試已完成。

## 來源

- [Node.js 24 TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html)
- [parse5 HTML parser](https://parse5.js.org/)
- [tough-cookie](https://github.com/salesforce/tough-cookie)
- [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- 具體 UTAR 轉址與 CSP 實驗見 `docs/LOGIN_DIAGNOSIS.md`／`docs/WEB_LOGIN_OPTIONS.md`。
