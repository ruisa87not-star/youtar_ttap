# Web 登入代理驗證報告

日期：2026-10-27（Asia/Kuala_Lumpur）。本輪恢復已批准的代理實作計畫；範圍是獨立 youtar_ttap repo 的本機程式／合成驗證與部署草案。**未部署、未使用真實帳密／CAPTCHA、未 staging／commit／push／建立 remote 或公開 Release。**

目前狀態：2026-10-28 已完成獨立審閱，兩項 Important findings 先重現再修正；全專案223 tests及代理雙瀏覽器10 tests通過。使用者確認 Ubuntu x64／Docker／Cloudflare、主站 youtarconfession.paaartir.my、代理 ttap.youtarconfession.paaartir.my，要求交給伺服器 agent 執行；尚未部署。見 [審閱修正](WEB_PROXY_REVIEW.md) 與 [伺服器交接](SERVER_AGENT_DEPLOYMENT.md)。

## 變更範圍

- 新增 server/registration-proxy/：嚴格 production config、精確路由／HTTPS/DNS policy、獨立 cookie/session/passid、CSRF／限流、HTML/CSS/redirect rewrite、HTTPS transport、Node HTTP service 及入口。
- 新增 shared table sanitizer／frame protocol、固定 proxyBridge、ProxyRegistrationFrame；App／RegistrationScreen 只在 Web 且配置時選用代理，桌面保留原生行為。
- Vite 同一經驗證的 origin 產生 frame-src 與 App 配置，production 拒絕 HTTP／同 origin／跨 site。未配置仍有官方 iframe 與手動匯入，並顯示登入限制。
- 新增單元／HTTP 整合／Chromium／Firefox 合成測試、bridge build／proxy start／e2e scripts、server typecheck／lint。
- 新增 public .env.example、Docker context 白名單、Node/Docker/Caddy 草案及操作／回滾文件。沒有 workflow、secrets、DNS 或服務變更。

沒有複製／更動原始 ttap_utar_fork，未移植私人 HTML 或 credential 至測試。排課、Course Clash 排序、分組、Clear、PNG 匯出與三個版本都保留。

## 依賴與授權

單一根 lockfile 新增精確 production dependencies：parse5 8.0.1（MIT）與 tough-cookie 6.0.2（BSD-3-Clause），安裝使用 --ignore-scripts。原本根 LICENSE／上游版權與 notices 保留。Docker 包含根授權及 npm production packages 各自完整的 LICENSE；server 依賴未進入 Web／Electron／Tauri frontend bundle，也未加入桌面安裝檔。

## 已驗證結果

| 項目 | 結果 | 完整日誌 |
| --- | --- | --- |
| 修改前基線 | typecheck/lint + 171 tests | logs/proxy-baseline.log |
| Proxy policy/config/session/jar/rate/transport/app/rewrite + parent protocol/CLI | 40 tests 通過；型別/lint 通過 | logs/proxy-frameset-green.log |
| 審閱修正後全專案 typecheck/lint/Vitest | 223 tests／36 files 通過 | logs/proxy-reviewed-complete.log |
| 預設 Web build、npm audit | 成功、0 vulnerabilities | 同上 |
| 正式 proxy-configured build | HTTP 配置預期拒絕；精確 CSP/config一致、主站 script policy保留、private env canary未進bundle | logs/proxy-config-build.log |
| 審閱修正後合成代理 Chromium/Firefox | 10 passed；含分段 token canary | logs/proxy-reviewed-complete.log |
| 既有 Web Chromium/Firefox | 40 passed | logs/proxy-web-regression.log |
| 最新 Electron unpacked／Tauri release build | 成功（未產生或發布新 installer） | logs/proxy-native-retry.log |
| Electron／Tauri regression | 11 + 6 passed | logs/proxy-native-regression.log |

瀏覽器驗證涵蓋合成 CAPTCHA 錯誤後重試、POST→舊 HTTP Location 的 HTTPS 升級、frameset→主要註冊頁→課程預覽、明確 Preview／確認匯入／選課／PNG、已取消表單／頁內 anchor、相同 URL reload 舊回應、兩位使用者 token 隔離、登出／到期、登出被拒絕、緊湊／完整切換與窄畫面。

Fake Transport 每次只接受精確官方 HTTPS URL；沒有實際官方請求。parent messages／DOM 不包含合成帳密、jar、passid、帳號區塊；匯入內容只含 sanitized table。Node integration 覆蓋未知／跨 session token、逾時、超限／解壓、redirect loop、私人 DNS 混入、偽造 forwarding headers、CSRF／Origin／method／body 限制；production CLI 無 insecure override。

## 測試中發現並修正

完整失敗日誌先顯示，才依既有授權修正目標內問題。RED 記錄包括 policy/session/rewrite/app/frame 測試的缺少實作、非 ASCII CSRF 錯誤分類、Reload 未觸發逾時、瀏覽器 null Origin、取消事件順序、frameset、logout 非 2xx及完整登入樣式切換。測試 fixture 的欄位計數、APIRequestContext header、舊訊息攔截順序與缺少 banner 也已依具體證據修正，未放寬產品防護或移除 gate。

Electron 首次原生打包圖示工具回報 WebAssembly.Memory could not allocate memory（logs/proxy-native-builds.log）；沒有改程式或 logo，待其他測試結束後單獨重跑即成功。Tauri release exe 更新為4,395,008 bytes／SHA256 3b370ec7e87468561187c9752d709c98f97070255a787e11d75f5b2d17d405c1；本輪未重建 NSIS，既有安裝檔仍是排序後、代理前的版本。

## 執行中的設計裁決與代價

1. 沿用使用者明示的獨立目標／既有 feature branch，保留先前未提交成果；不另建會漏掉未提交基礎的 worktree。代價：隔離依賴外部 baseline snapshot。
2. 既有設計／本機實作批准與「繼續」授權足夠，沒有重複批准；外部部署／發佈仍需審核。代價：只限可逆本機變更。
3. Windows mirror/sync、ignored ledger 與外部 baseline 代替 POSIX／commit checkpoint；不刪 scratch。代價：未提交前須保留這些復原檔。
4. 用原生 https.request 驗證全部 DNS 後 pin IP，保留 TLS servername 及憑證驗證，取代 fetch。代價：額外的解壓／串流實作，已有測試。
5. 本機無 Docker CLI，先交付 Node/browser 證據與部署範本。代價：container／Caddy runtime 問題可能需 VPS 階段處理。
6. Proxy response 改 strict-origin，移除 upstream referrer meta；outer iframe仍no-referrer、Origin＋CSRF仍嚴格拒絕。代價：可能傳出裸 proxy origin，無 path/query/token；原因與來源見操作文件。
7. Frameset 正規化至允許的主要 registration 文件，優先 studentRegistrationSurvey，不建立通用多 frame relay。代價：若實際官方流程不同，需窄範圍相容調整；真實人工驗收仍是 gate。
8. Docker Node 24官方tag先作草案，正式前解析／掃描／固定digest。代價：草案image可能變動，不能跳過正式build／CA檢查。
9. 短數字 session token 與課程值歧義時，停止 Preview transfer而非忽略秘密或改壞課程數字。代價：該類罕見token仍可登入，但需使用saved HTML import；一般數字／分組保留。

## 尚未完成的正式驗收

實際 hostnames、Ubuntu x64／Docker／Cloudflare 已由使用者確認；Docker／現有 ingress config/runtime、固定 image digest、可信 peer、防火牆／Tunnel拓撲、主站 cookie scope、DNS/TLS／官方 CA、宿主 header CSP、正式 Chromium/Firefox cookie／iframe，以及使用者人工 CAPTCHA／真實課程匯入仍未驗收。沒有這些證據不能宣稱 Web 真實登入已完成。

詳細部署／回滾與限制：[WEB_REGISTRATION_PROXY.md](WEB_REGISTRATION_PROXY.md)。尚未公開推送或更新網站；新的 GitHub Release／版本號、乾淨 Windows VM／WebView2／DPI 與 Electron 真實登入仍見 PROJECT_STATUS.md。

## 來源與 Git 保護

本輪來源唯讀稽核仍是480檔 digest a8498306a0a354414b0dcaf20a03e77b38abe67ac6273d31f146a7abdb447409；原有479檔 digest cac0ea9b583ee3125f5c59b2cd32ac631e86d8e65ca9ddf62b948c5b7a8591b8 未變。額外一檔為使用者原先提供的 private preview，沒有讀取其內容作本輪 fixture。Credential與私人 preview仍排除。最終 Git 狀態／獨立審閱結果在交付前更新。
