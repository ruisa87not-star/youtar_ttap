# 給伺服器 agent：youtar_ttap Web／登入代理部署交接

日期：2026-10-28。**這是交接步驟，尚未在伺服器執行。** 使用者會在部署時把本文件與已驗證的來源包交給伺服器 agent；本機不操作 SSH、DNS、Cloudflare 或既有網站。

## 已確認設定

| 項目 | 值 |
| --- | --- |
| 主站／planner origin | `https://youtarconfession.paaartir.my` |
| 登入代理 origin | `https://ttap.youtarconfession.paaartir.my` |
| 主機 | 使用者管理的 Ubuntu、x64 |
| 既有工具 | Docker、Cloudflare |
| 應用 | Web、Electron、Tauri 保留；本次只部署 Web 與獨立代理 |

舊紀錄中的 Web 入口為 `/apps/ttap/`，**先確認現有網站的實際入口與靜態資源目錄，不要把 TTAP 蓋到網站根目錄**。無論使用哪個 path，PLANNER_ORIGIN 都只填上表 origin，不含 path。

## 可直接貼給伺服器 agent 的任務

> 請依本文件處理 youtar_ttap：先唯讀盤點現有 Docker／HTTPS 入口／Cloudflare Tunnel／主站路徑與 cookie scope，提交具體差異與回滾點，再依我在此伺服器對話的部署授權執行。只使用交付來源包中已通過獨立審閱的版本，核對 SHA256SUMS.txt；不要從 GitHub 的舊 HEAD 假定取得最新程式。本次新增 `https://ttap.youtarconfession.paaartir.my` 隔離代理，更新原 TTAP Web 入口，保留主站與 PocketBase／其他服務。選用既有反向代理，單一 Node 代理容器，不公開 backend port，不加入其他登入方式或放寬 upstream allowlist／TLS／Origin／CSRF／主站 script CSP。不自動選課、不解 CAPTCHA、不讀取使用者登入 credential 檔。所有登入 body、cookie、token、query 與帳號均不得記錄；失敗先提供去除秘密的完整錯誤，再修復。Docker／DNS／TLS／cookie／CSP 驗證完成後，由使用者自行輸入真實帳密與 CAPTCHA，驗證 Preview／匯入／排課／PNG。最後交付實際設定差異、image digest、驗證／回滾報告；不 git add／commit／push／remote add，不發布 Windows Release，不刪除舊版備份。

本輪本機結果與最終審閱狀態見 `docs/WEB_PROXY_VERIFICATION.md`。若其中仍有未完成的重要修正，先停止公開部署。

本次交接已完成兩項 Important 修正及 223 項全專案測試、10 項代理雙瀏覽器驗收；詳見 `docs/WEB_PROXY_REVIEW.md`。來源包另附 **web-dist/**，已配置上述兩個 origin，可供正式 Web 路徑部署；它仍需宿主 CSP／TLS／cookie 與人工登入驗收，不代表伺服器已通過。

## 1. 先盤點，不改現有服務

取得 Ubuntu 版本、`uname -m`（預期 x86_64）、Docker／Compose 版本、可用記憶體／磁碟與 80／443／3000 的使用狀態。只列必要服務名稱與 port；不要直接輸出完整 docker inspect／compose config／env，因為既有服務可能含秘密。

確認：

- 目前 443 由主機 Nginx、Caddy、Docker 內的入口、Traefik／Nginx Proxy Manager，還是 cloudflared 提供；沿用現有入口，不另起會搶 80／443 的 Caddy。
- TTAP 的實際 public URL、部署目錄／container volume、主站 header CSP 由誰設定。備份這些設定及當前 TTAP 靜態目錄，記錄回復方式。
- 伺服器是否有可直接抵達的公開 HTTPS。若只有 Cloudflare Tunnel／私人 NAT、沒有對外 HTTPS 入口，本方案的 DNS-only 不能直接使用：先回報網路現況。不要自行改成讓 Cloudflare 代轉登入或隨意開放整台主機防火牆。
- 主站／登入後的敏感 cookie 有沒有 `Domain=youtarconfession.paaartir.my`、`.paaartir.my` 等會涵蓋 proxy 的 scope。只回報 cookie 名稱與屬性，值要隱藏；敏感 cookie 必須先改為 host-only／__Host-，不能因前端使用 localStorage 就跳過。

## 2. 取得正確來源並保留回滾版本

本機最新變更尚未推送到 GitHub；請先使用使用者交付的 **server-handoff 來源壓縮包**，或待使用者另行確認推送版本。不能直接 clone 舊 GitHub HEAD 後宣稱本輪功能已部署。

在新的獨立工作目錄解壓，核對包內 `SHA256SUMS.txt`。來源包只包含白名單 Web／proxy 原始碼、鎖定依賴／設定、合成測試與授權；不包含 credential、私人課表、.git、.env、node_modules、桌面執行檔或建置快取。不要把整個包當作可公開的靜態網站目錄。

以下命令均從解壓後的 package 根目錄執行。已安裝的來源／舊靜態目錄只供備份，不直接覆寫。

## 3. 選定 Node image 並建立代理

使用官方 Node 24 Debian bookworm-slim 的 linux/amd64 image，先 pull、取得 RepoDigest、檢查已知弱點，將確認的 digest 填入本地部署 env。不要長期以可變 `node:24-bookworm-slim` tag 作正式來源。

```sh
docker pull --platform linux/amd64 node:24-bookworm-slim
docker image inspect node:24-bookworm-slim --format '{{json .RepoDigests}}'
```

在主機新建獨立 Compose project，例如 `youtar_ttap_registration`；不要併入會影響主站啟停的 stack。`deploy/registration-proxy/compose.example.yml` 是起點，先複製成主機本地的 compose 檔並核對相對 build context。下面範例假設仍使用該檔、在 package 根目錄執行；使用者可以保留 `.example` 名稱，關鍵是明確 `-f`／`--env-file`。

部署 env（例如 package 根 `.env.registration`，不提交 Git）至少包含：

可先複製 `deploy/registration-proxy/youtar.env.example` 成 `.env.registration`，再替換兩項 REPLACE。

```dotenv
PLANNER_ORIGIN=https://youtarconfession.paaartir.my
PROXY_PUBLIC_ORIGIN=https://ttap.youtarconfession.paaartir.my
VITE_REGISTRATION_PROXY_ORIGIN=https://ttap.youtarconfession.paaartir.my
PROXY_TRUSTED_IP=REPLACE_WITH_VERIFIED_INGRESS_PEER_IP
REGISTRATION_HOST=ttap.youtarconfession.paaartir.my
NODE_IMAGE=node@sha256:REPLACE_WITH_VERIFIED_DIGEST
```

兩項 REPLACE 必須換成真實驗證值。`PROXY_TRUSTED_IP` 是 Node 容器看見的**直接反向代理 peer**，不是使用者 IP、不是 Cloudflare IP 清單，也不一定是 127.0.0.1；填錯會令 rate limit 全部集中到一位訪客或產生拒絕。

拓撲選擇：

- 若 HTTPS 入口在主機上，範本的 `127.0.0.1:3000:3000` 可作 backend，前提是 host port 未占用；被占用時只調整 host port 與 ingress upstream，容器內仍是 3000，不能終止其他服務。
- 若入口在另一個 Docker 容器中，`127.0.0.1` 是入口容器自己，不能照抄主機版 upstream。由 agent 連到受控的私有 Docker network，用服務名連到 `registration-proxy:3000`、移除 public port，確認／固定可信入口 peer 的配置。不要把 3000 改為 0.0.0.0 公開發布。
- 透過 network metadata 與只在本機進行的診斷確認 peer；不要為找 peer 開啟一般訪客 request logs。正式入口必須覆寫單一 X-Forwarded-For，不接受客戶端提供的值或 comma-separated chain。

先驗證及 build，不接 public ingress：

```sh
docker compose --project-name youtar_ttap_registration --env-file .env.registration -f deploy/registration-proxy/compose.example.yml config --quiet
docker compose --project-name youtar_ttap_registration --env-file .env.registration -f deploy/registration-proxy/compose.example.yml build registration-proxy
docker compose --project-name youtar_ttap_registration --env-file .env.registration -f deploy/registration-proxy/compose.example.yml up -d --no-deps registration-proxy
```

核對非 root、唯讀 root filesystem、無持久登入 volume、resource limits、單副本與 `healthy`。如果 build、image scan、CA 或 healthcheck 失敗，先回報固定錯誤／去密日誌；不能刪掉保護或使用舊容器假裝成功。

## 4. 從同一 runtime 驗證官方 TLS

使用剛建好的 image 做一次不含帳密的 official login GET：必須走正式 `httpsTransport`、正常憑證驗證與 15 秒 timeout。只輸出成功／失敗與 HTTP status，不輸出 body、headers、cookies 或 Location。可以由 agent 以一次性 `docker compose run --rm --no-deps --entrypoint node ...` 執行以下程式：

```js
import {httpsTransport} from './server/registration-proxy/transport.ts';
try {
  const response = await httpsTransport({
    url: new URL('https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp'),
    method: 'GET', headers: {}
  }, AbortSignal.timeout(15000));
  await response.body?.cancel();
  console.log(JSON.stringify({event:'upstream_tls_smoke',status:response.status}));
  if (response.status !== 200) process.exitCode = 1;
} catch {
  console.error('{"event":"upstream_tls_smoke","result":"failed"}');
  process.exitCode = 1;
}
```

Node flags 為 `--use-system-ca --input-type=module`，以 stdin 或本地暫存 script 傳入，不把帳密放在 command line。TLS／DNS／來源 IP 若不通，停止並回報；不使用 curl -k、NODE_TLS_REJECT_UNAUTHORIZED=0、任意 upstream override 或放行 private DNS。

## 5. Cloudflare DNS 與 HTTPS 入口

僅為 **ttap.youtarconfession.paaartir.my** 新增／調整指向正確公開 origin 的記錄，選 **DNS only（灰雲）**；主站 Cloudflare 設定保持既有用途。A／AAAA／CNAME 的每個目標都必須能正常抵達，不保留無法工作的 AAAA。DNS-only 讓訪客直接連到 origin，所以先確認公開入口與現有防火牆策略能安全支持，不能只照做 DNS 後猜它會通。[Cloudflare 官方 Proxy status](https://developers.cloudflare.com/dns/proxy-status/)

不要把灰雲 CNAME 指向仍受 Cloudflare 代理的主站或 Tunnel，就當作已直連 origin；核對最終 DNS／實際網路路徑。

先確認 Cloudflare 的實際 zone：若 zone 是 `paaartir.my`，記錄名稱通常是 `ttap.youtarconfession`；若 zone 是 `youtarconfession.paaartir.my`，才是 `ttap`。以最終完整 hostname 核對，避免建錯 DNS。

由現有入口取得瀏覽器信任、**覆蓋精確 ttap hostname** 的 TLS 憑證；主站憑證／Cloudflare Origin CA／一層 wildcard 不可當作它已覆蓋此深層 hostname 的證據。DNS-only 的瀏覽器會直接驗證 origin 憑證。憑證／ACME challenge 配合既有工具設定，不搶占運行中的 port。

入口要求：只限此 hostname、保留 Host、清除／覆寫 visitor forwarding header、禁止 request/access/error logs 洩漏敏感資料；不 cache 登入回應、不加 analytics、Access challenge 或 body capture。保留 upstream 的 CSP、Set-Cookie、strict-origin、no-store；不能加 `X-Frame-Options: DENY/SAMEORIGIN` 或全域 `frame-ancestors 'self'` 擋掉主站 iframe。

主機 Nginx 的 dedicated TLS server 可參考以下 location，certificate／listen／server_name 依已驗證的既有入口補齊；不要原樣覆蓋主站：

```nginx
# Dedicated server_name ttap.youtarconfession.paaartir.my only.
access_log off;
error_log /dev/null crit;
client_max_body_size 16k;
client_body_buffer_size 32k;

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host ttap.youtarconfession.paaartir.my;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Host "";
    proxy_set_header Connection "";
    proxy_request_buffering off;
    proxy_buffering off;
    proxy_max_temp_file_size 0;
    proxy_cache off;
    proxy_connect_timeout 5s;
    proxy_read_timeout 20s;
    proxy_send_timeout 20s;
}
```

這些關閉 buffering 的設定避免把登入請求／回應落至 proxy 暫存檔。agent 必須檢查所有上層／旁路日誌與安全產品，不能只確認 access_log off。若需要可觀察性，只記錄已去除 URL／query／header／body 的固定事件／status／duration。[Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

如果既有 Nginx 使用 Cloudflare real_ip 設定，還須確認信任範圍沒有讓任意來訪者偽造 `$remote_addr`；此 hostname 的 X-Forwarded-For 必須代表經正確信任鏈確認的真實來訪 IP。

Caddy 用既有專用 site 作 reverse_proxy，參考包內 Caddyfile.example；**不要把其 global `log default { output discard }` 蓋到共用 Caddy**。先審查 request/error log 如何去敏，不能留下含原始 request 的 error logger。任何入口都先 validate config，再按現有 reload 方式套用，不直接重啟整個 stack。[Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

檢查：`https://ttap.youtarconfession.paaartir.my/__ttap/health` 為 200／ok，TLS 驗證正常、Host forwarding 正確、後端埠無 public reachability、回應 no-store。另以受控無效 X-Forwarded-For、未知 token／off-route synthetic request 驗證入口覆寫與拒絕；報告只包含固定狀態／錯誤碼。

## 6. 建立 Web 靜態檔並接回現有入口

**可先使用包內 web-dist/**：這是本機針對上述正式 origins 建立、包含授權的完整靜態產物，已核對 bundle／meta CSP。先校驗 checksum，再部署到新版本的 TTAP 靜態目錄。如果網址／程式有變或需要在主機重建，使用下面的步驟；不要修改 minified JS 來換網域。

在來源包的新工作目錄，使用 Node 24.15+ 與鎖定依賴。若不希望在 Ubuntu 安裝 Node，使用上述已固定 digest 的 Node image 作一次性 build container，bind mount 僅限新的 package 工作目錄，使用適當 uid/gid 與可寫暫存 npm cache；不要 mount 舊網站、TLS keys 或其他服務 env。設定以下兩個公開 build env：

```dotenv
PLANNER_ORIGIN=https://youtarconfession.paaartir.my
VITE_REGISTRATION_PROXY_ORIGIN=https://ttap.youtarconfession.paaartir.my
```

在該 build 環境內執行：

```sh
npm ci --ignore-scripts
npx vitest run tests/proxy tests/planner/ProxyTable.test.ts
npm run build:web
```

產物為 **dist-web/**，不是 out/ 或 dist-tauri/。檢查 index.html 的 frame-src 包含精確 HTTPS proxy origin、bundle 中 public origins 正確，且無 secrets。確認網站自己的 env、PocketBase 或其他服務 key 未注入這個 build。根 LICENSE／THIRD_PARTY_NOTICES.txt／UPSTREAM.md 隨靜態產物保留。

將完整 dist-web 放入新的版本目錄，先本地／受控入口測試，再使用網站現有機制切換 TTAP path；保留舊版本供回復。不能把網站根頁／其他 apps 蓋掉，也不能只替換 index.html 而遺失 hash assets。

**CSP 的兩層都要處理**：Vite 已產生 TTAP document 的 meta frame-src；主站／嵌入 TTAP document 若另有 response-header CSP，也要在既有 frame-src 補入 `https://ttap.youtarconfession.paaartir.my`。每一條生效 CSP 都需相容，不能整條覆寫或只改 meta。主站 script-src 繼續限制，不能新增 unsafe-inline／HTTP／wildcard。CSP 如由 Cloudflare Transform Rules 或網站容器管理，從其真正來源修改。

檢查預覽入口若非正式 planner origin，App 會按設計拒絕代理。要測真實 origins 請使用正式 hostname 的受控部署／resolve 測試，不將 PLANNER_ORIGIN 改成任意測試 origin 後忘記恢復。

## 7. 正式驗收與回滾

先在 Chromium／Firefox確認：登入表單與 CAPTCHA 可見、cookie 是 proxy 的 __Host-／Secure／HttpOnly／SameSite=Strict，沒有 upstream cookie 傳到主站；錯誤有提示、Reload 可恢復；未知 route／加退選 POST 被拒。不要把 devtools 的 cookie／token／完整 request 匯出到報告。

最後由使用者本人輸入帳密與 CAPTCHA：登入→Course Timetable Preview→Preview→確認匯入→選課／分組／Course Clash 排序→Export image。再測 Log out、兩個獨立 browser profiles 的隔離、到期及窄畫面。agent 不要求把帳密傳給它，也不代解驗證碼。

若失敗，保持主站可用，回復舊 TTAP 靜態版本與其原 CSP，停止**本次**獨立 proxy project；不要 docker compose down 主站 stack 或 prune 全機 Docker。先保留必要的固定錯誤與版本證據，不刪舊 image／備份，不放寬安全限制。暫時停代理會清除其登入 session；不觸發 UTAR 選課。

最後回報：實際 Web URL／proxy hostname、ingress／network 拓撲、image digest、來源包 checksum、非秘密 env、DNS/TLS／cookie／CSP／登入／匯入結果、未通過項目、還原位置與命令。**只有真實正式環境及人工 CAPTCHA 通過，才可說 Web 完整登入已完成。**

Compose env 及檔案路徑請始終用明確 -f／--env-file；參考 [Docker Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)。本文件中的命令是交接，不表示本機已驗證 Docker／Nginx／Caddy runtime。
