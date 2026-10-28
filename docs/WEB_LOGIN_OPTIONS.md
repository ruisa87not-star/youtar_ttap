# 網頁版完整登入：可行性評估

日期：2026-10-27。狀態：使用者已批准隔離 HTTPS 代理的書面設計，並確認有 Node.js／Docker VPS；依最新指示暫停代理，優先修正課程表。代理尚未實作或部署。

## 已確認的問題

以使用者授權的真實登入與手動 CAPTCHA 確認，UTAR 在 HTTPS `loginProSurvey.jsp` 回應 HTTP 302，目的地為同主機的 HTTP `indexSurvey.jsp`，帶有敏感的 `passid` 參數。診斷在跟隨前攔截；參數值沒有記錄。修正後 Tauri 已由使用者確認成功登入，並觀察到 HTTPS 的登入後課程頁。

現有 Web 版是在外部網站中嵌入官方 UTAR iframe。實際發佈入口是 `/apps/ttap/`，外層網站是 Vite／React，另有 PocketBase；檢查到的設定沒有 UTAR 代理。網站及應用 CSP 都只允許 HTTPS UTAR frame。瀏覽器亦會阻擋 HTTPS iframe 降級為 HTTP。

Cloudflare beacon 的 CSP 錯誤屬於另一個腳本載入問題；沒有證據顯示它導致本次登入轉址失敗。官方公開登入頁目前沒有回傳 CSP 或 X-Frame-Options。公開頁面的驗證腳本 hash 與使用者貼出的被擋 inline script hash 不同；不能據此放寬應用的 `script-src`。

## 已做的合成實驗

| 實驗 | Chromium | Firefox |
| --- | --- | --- |
| 外層 CSP 加入 upgrade-insecure-requests | 轉址仍被擋 | 轉址仍被擋 |
| 登入文件也加入該 directive | 轉址仍被擋 | 轉址仍被擋 |
| 合成外層 frame-src 額外列出 HTTP，同時使用升級 directive | mixed content 仍被擋 | 未成功載入目的頁 |

所有 HTTP 實驗請求均設為直接中止，沒有用真實帳密測試不安全連線。另測試了 Chrome 最小 declarativeNetRequest `upgradeScheme` 擴充套件；在目前 HTTPS-only frame-src 下，轉址在升級規則前被 CSP 阻擋。這個簡單擴充套件原型不能當作完成方案。

因此，沒有把實驗中的 HTTP allowlist 或無效 directive 加入正式設定，也沒有關閉 CSP、mixed-content 或 TLS 檢查。

## 可採方向

| 方向 | 訪客體驗 | 需要什麼 | 限制／資料流 |
| --- | --- | --- | --- |
| UTAR 修正官方轉址／部署正確 HSTS | 維持直接內嵌官方頁面 | UTAR 管理者配合 | 我們無法修改其伺服器，也沒有完成時程 |
| **自行託管、獨立 origin 的 HTTPS 代理** | **最符合免安裝、在網站內完整登入的目標** | 獨立 HTTPS hostname、可執行後端的主機、持續維護 | 帳密與登入工作階段會經過該服務；需要明確接受這個資料流，不能只改前端 |
| 瀏覽器擴充套件／桌面輔助 | 需安裝額外軟體 | 對 Chrome／Firefox 分別驗證、散布及維護 | 簡單升級規則已失敗；完整方案仍須研究，不等同目前網頁可直接使用 |

建議：若要求所有訪客免安裝使用，先評估隔離代理；若不接受伺服器代轉帳密，優先等待 UTAR 修正。尚未宣稱代理已可與真實 UTAR 完整相容。

## 隔離代理的建議邊界（尚未批准的候選方案）

1. 使用與主網站不同的 origin。UTAR 的舊式腳本只能在該隔離 origin 執行，無法讀取主站的帳號、儲存空間或 DOM。保留主應用嚴格 CSP；僅為 frame-src 增加最後選定的代理 origin。
2. 只連線到 `https://unitreg.utar.edu.my` 標準 HTTPS 連接埠；固定路由 allowlist、重新驗證每次 redirect，拒絕任意 URL、其他主機和內網目的地。已知官方 HTTP 目的地先升級 HTTPS，再向上游請求；永不把帳密或 passid 送上 HTTP。
3. 每位訪客有各自的短期工作階段／cookie jar；不共用 UTAR cookies。瀏覽器只持有 opaque、HttpOnly、Secure 的代理 session cookie。工作階段有逾時、登出及清除路徑，不進 PocketBase、資料庫、備份或分析服務。
4. 帳密只為當次登入轉送，不寫入磁碟。伺服器、反向代理、CDN/WAF、例外追蹤都必須避免記錄 body、cookie、Authorization、完整 query／Location。回應禁用快取與 analytics。
5. 保留官方 CAPTCHA，由使用者手動輸入。限制登入／session 建立頻率、請求大小、同時連線及 upstream timeout；部署多實例時不可僅依賴各自記憶體限流。
6. 驗證表單來源與 CSRF，限制 CORS／frame-ancestors／導覽／下載。重寫 Location、HTML 表單／資源 URL、必要 cookie scope；不把原始 UTAR 網址中的登入 token 傳給外層主站。
7. 先確認登入與讀取課程所需的最小路由及方法；不加入自動註冊、代選課或其他帳號操作。課程資料僅由使用者要求匯入時傳回排課器。

## 原型的驗收條件

- 合成登入：HTTPS POST → 上游 HTTP 302 → 代理升級 HTTPS → 隔離頁面顯示成功，全程無 HTTP 外送。
- CAPTCHA 錯誤、密碼錯誤、逾時、重新登入都能顯示；不略過官方驗證。
- 兩個獨立瀏覽器 session 無法讀取彼此的 UTAR 資料；登出與逾時確實銷毀 session。
- 惡意目的 URL、跨主機 redirect、跨站 POST、超量／超大請求被拒絕。
- 日誌／cache／錯誤回報中沒有合成憑證、session cookie 或 passid canary。
- 在實際部署位置驗證 Chromium／Firefox 的 iframe、cookie、CSP，再由使用者手動完成真實 CAPTCHA，驗證登入與課程匯入。不得只靠合成測試宣稱完成。

## 決策與待確認項目

- 已確認：使用自行控制的隔離代理，有 Node.js／Docker VPS，並能配置同主網域子網域的 DNS／TLS。
- 待部署前確認：實際作業系統、獨立 HTTPS hostname 及 TLS/CDN 的控制權。現有網站透過 Cloudflare 回應，不足以推論代理會走相同的 TLS 終止路徑。
- 真實 UTAR 是否對代理來源 IP、cookie、CAPTCHA 或部分資源有額外限制，需要原型實測。

這份文件是方案評估，並非啟用服務或部署授權。尚未新增 auth server、secrets、部署 workflow 或代理依賴。

候選書面設計：`docs/superpowers/specs/2026-10-27-web-registration-proxy-design.md`。

## 參考

- [Electron webContents 導覽事件](https://www.electronjs.org/docs/latest/api/web-contents)
- [Tauri WebviewBuilder on_navigation](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewBuilder.html)
- [MDN upgrade-insecure-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests)
- [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [MDN BlockingResponse](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/BlockingResponse)

以上是 API／瀏覽器行為的背景；本次可行性結論以實際合成實驗及真實 UTAR 轉址觀察為依據。
