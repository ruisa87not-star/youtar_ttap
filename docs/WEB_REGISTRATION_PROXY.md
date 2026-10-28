# Web 隔離登入代理：本機成果與部署草案

2026-10-27。本文件只交付可審閱的程式、設定與操作步驟；沒有啟動 VPS、修改 DNS、部署網站或推送 GitHub。真實 Web 登入仍待正式環境與使用者人工 CAPTCHA 驗收。

2026-10-28：獨立審閱的重要問題已修正，交接環境確認為 Ubuntu x64、Docker／Cloudflare；實際網域與伺服器 agent 的逐步操作見 [SERVER_AGENT_DEPLOYMENT.md](SERVER_AGENT_DEPLOYMENT.md)。

## 使用方式與邊界

Web 在編譯時配置代理後，直接顯示隔離的官方登入頁；可切換緊湊／完整畫面。登入後開啟 Course Timetable Preview，按 Preview courses from this page，確認課程清單後開始排課與 PNG 匯出。Electron／Tauri 保持原生隔離登入；代理是獨立伺服器，不打包進桌面應用。

代理會代轉當次帳密與 CAPTCHA，因此管理該伺服器等同承擔登入處理責任。它只支援登入及已允許的唯讀課程頁，不支援加退選提交、帳號變更或自動解 CAPTCHA。Log out 結束代理記憶體工作階段；UTAR 本身的工作階段另依官方機制逾時。

## 本機開發與合成驗證

從本專案根目錄執行：

```sh
npm ci --ignore-scripts
npm run check
npm run build:proxy
npm run test:e2e:proxy
```

瀏覽器未安裝時先執行 npm run install:browsers。代理測試使用兩個 loopback origin：4177 為排課器、4187 為合成代理。scripts/proxy-fixture.ts 注入假的 UTAR Transport；不接觸官方登入或本機 credential 檔。測試可注入時鐘、HTTP fixture cookie 和可信測試 peer；正式 main.ts 不能透過環境變數啟用這些能力。test-only HTML／控制路由不在 Web production bundle 或 Docker 白名單內。

## 正式 Node 啟動草案

需要 Node 24.15+、正常系統 CA、同 site 的不同 HTTPS hostname。以下皆為部署審核後才執行的步驟，不是本輪已執行的部署：

1. 在獨立 proxy 主機安裝鎖定依賴，執行 npm run build:proxy。
2. 依 .env.example 建立本機 .env，只填公開 origins／listener／可信反向代理 peer IP。不要放 UTAR 帳密或私鑰。
3. TLS 由受控 Caddy 終止，Node 只綁定 loopback；必要時用防火牆限制後端埠。啟動命令為：

```sh
node --env-file=.env --use-system-ca server/registration-proxy/main.ts
```

npm run start:proxy 適用於已由 service manager 注入環境的啟動方式。單一 Node 行程；重啟會清除所有 session。不要使用 PM2 cluster／多副本／sticky-session 作為共享記憶體的替代方案。

## Docker／Caddy 草案

檔案位於 deploy/registration-proxy/，全部仍是範本，未執行 Docker/Caddy 驗證：

- Dockerfile：兩階段建立固定 bridge；runtime 為非 root，只有 production deps、server、必要 shared 模組與授權。無測試 fixture、credential、Git、桌面產物。
- compose.example.yml：單實例、唯讀根檔案系統、無 volume、drop capabilities、資源上限，3000 僅發布至主機 loopback。Caddy 在主機上管理 TLS，不把私鑰放進 Node 容器。
- Caddyfile.example：不同專用 hostname；覆寫 X-Forwarded-For，保留正確 Host，拒絕超大 request body；關閉 access 與可能含 request 的 runtime logs。這個 global logging 設定只適合獨立入口；若與現有網站共用 Caddy，先另行審查記錄過濾。

PROXY_TRUSTED_IP 必須是 Node socket 實際看到的 Caddy peer；Docker 通常是 bridge gateway，不能直接沿用 .env.example 的 127.0.0.1。未確認前不要公開服務。Node 不信任其他 peer 的 X-Forwarded-For。後端埠必須只供受控 Caddy 存取。

Docker base 暫用官方 node:24-bookworm-slim 作為草案 tag。正式建立前必須解析、掃描及固定 image digest，檢查 system CA 與弱點。此機沒有 Docker CLI，所以不宣稱 image build、compose config 或 Caddy validate 已通過。Caddy 與 Node 的日誌都禁止 raw URL/query、Cookie、Location、IP、body、帳號或密碼；也不得開 CDN/WAF body 收集或 analytics。

## Web build 與宿主 CSP 草案

Web build 使用兩項公開設定：

```text
VITE_REGISTRATION_PROXY_ORIGIN=https://registration.example.com
PLANNER_ORIGIN=https://planner.example.com
```

Vite 驗證 origins 為不同 HTTPS hostname、同 site、無特殊 port/path/query/帳密，並由同一配置產生 App 設定與 meta CSP frame-src。PLANNER_ORIGIN 是應用實際所在 origin，不含 /apps/ttap 等 path；renderer 發現部署 origin 不符時直接拒絕使用 proxy。沒有配置時保留舊官方 iframe 與 HTML 匯入，但官方 HTTP redirect 限制仍在。

宿主網站若另有 HTTP header CSP，必須保留既有政策，僅在 frame-src 加入同一精確 proxy origin。多層 CSP 取交集，所以只改 bundle 的 meta 不夠。不得加入 *、HTTP production frame、主站 unsafe-inline script 或停用 CSP；宿主 Cloudflare beacon 的 CSP 問題需分開處理。不要把 proxy server 掛在主站同 origin 的 path。

## 已實作的安全限制

上游只有精確 https://unitreg.utar.edu.my:443。已知官方 HTTP redirect 先升級 HTTPS；DNS 全部結果須為公開 IP，再 pin 其中一個 IP 並保留官方 TLS servername／正常憑證驗證。沒有任意 URL 或 upstream 環境開關。

每位訪客擁有獨立 Tough Cookie jar、256-bit session／CSRF、已觀察 passid；上游 Set-Cookie 不傳給瀏覽器。正式 cookie 為 __Host-ttap-registration、Secure、HttpOnly、SameSite=Strict。idle 15 分鐘、absolute 2 小時、max 200；到期與登出會取消請求並清除 jar/token。請求 16 KiB、解壓 HTML 10 MiB、assets 2 MiB、upstream 15 秒、redirect/refresh 8 跳／60 秒，並有建立／登入／併發限流。

parse5 不執行上游程式；只重寫已允許的 URL、form、資源與 refresh。舊式 frameset 僅導向已允許的主要 registration 文件，沒有通用 frameset 瀏覽器。未知流程失敗時保留限制，須以去參數的路徑證據補窄 allowlist，不能開整個 portal。

官方 legacy inline script 僅在隔離 proxy origin 放行。主站無原生 API；frame 禁止 top navigation、popup 與 download。Preview 只傳表格白名單元素／文字／有限 spans，移除 href、input、script、帳號區塊與已知 passid。兩端核對 origin/window/channel/document/request IDs；Reload／導覽使舊回應失效。

代理回應採 strict-origin Referrer-Policy，outer iframe 仍 no-referrer。這是本機瀏覽器測試後的設計修正：no-referrer 使一般表單 POST 的 Origin 變 null；strict-origin 保留嚴格 Origin＋CSRF 檢查，Referer 至多包含網域，沒有路徑／query／passid。上游 meta referrer 會移除。參見 [MDN Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)。

## 公開部署前尚需確認

1. 實際 planner/proxy hostnames、VPS OS、CPU 架構與 Node/Docker/Caddy 部署方式，及部署授權。
2. 主站實際 Set-Cookie 稽核：敏感 cookie 不能以父 Domain scope 傳給 proxy；須使用 host-only／__Host-。前端 localStorage 不代表伺服器 cookie 已安全。
3. DNS-only／TLS 終止位置、無額外 CDN/WAF body logging、可信 peer、防火牆、單實例、日誌與記憶體限制。
4. 正式 image digest、Docker/Caddy config 驗證、VPS 到官方站正常 TLS／DNS 連線。不能以忽略憑證或私有 IP allowlist 放行。
5. 宿主 header CSP 與新 Web bundle 的精確 origin；Chromium/Firefox 在正式 HTTPS cookie／iframe 環境驗證。
6. 使用者自行登入、人工 CAPTCHA、錯誤後重試、實際課程 Preview／確認匯入／PNG；未完成前只能說「合成驗證通過」。

## 回滾

移除 VITE_REGISTRATION_PROXY_ORIGIN，重新 build 並按核准程序回復舊 Web bundle／宿主 CSP；排課器、Demo、手動 HTML 匯入仍可用。停止 proxy 單實例會清除所有代理登入工作階段；撤掉 proxy ingress/DNS 需另行批准。回滾不會影響 Electron／Tauri，也不會執行 UTAR 加退選。

## 參考

[Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)、[Caddy logging](https://caddyserver.com/docs/caddyfile/directives/log)、[Caddy global options](https://caddyserver.com/docs/caddyfile/options)、[官方 Node image](https://hub.docker.com/_/node)。範本的實際 runtime 驗證仍是部署 gate。
