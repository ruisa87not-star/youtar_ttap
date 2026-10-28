# 隔離代理：獨立審閱與修正紀錄

日期：2026-10-28。第一次審閱在使用者暫停時中止，未取得結論；恢復時該 reviewer 已不存在，因此以新的獨立只讀 reviewer 完成尚未完成的審閱，沒有要求第二意見或修正後重審。審閱依 pre-proxy working-tree baseline／48檔 candidate hashes，並未誤將所有既有未提交成果視為本輪代理變更。

Reviewer 結論：With fixes；0 Critical、2 Important、0 Minor。確切上游／DNS/TLS、session/CSRF、frame訊息隔離及 native 邊界受到肯定。以下兩項 Important 均已在單次修正階段完成 RED→GREEN，沒有再派 reviewer 重審。

## 1. 靜態資源重設導覽預算

原本 app.ts 會在非相同目標的 request／asset成功回應清除 navigation，CSS／image 可讓 refresh chain 繞過8跳／60秒。Reviewer 的非網路 handler probe 觀察12次 refresh＋12次 stylesheet、超過72秒仍全200。

已將 document/login POST 的導覽狀態與所有 asset 分開；asset不檢查／重設／更新 chain，包含延遲回應。新增 meta／HTTP Refresh 的跳數及時間回歸，共4案例，先觀察錯誤的200，再驗證超限502。

## 2. 分散文字與短 token 的外洩

原本逐 text node redaction 發生在 span 展平之前，synthetic-＋span(session-token)可在輸出重建完整已知 token；短於8字元亦被略過。

已在建立受限 DOM 後，對整體文字位置做 redaction，保留 br／table／rowspan，涵蓋分段 literal及URI encoding；檢查最後的文字與序列化 markup，殘留 token 不傳出。非數字短 token 也移除。短數字 token 若與課程值難以區分，Preview 安全停止並提供 saved HTML import 提示，不把分組／時間數字亂改。

新增 span／br分段、ABC123短token、數字1歧義等4案例；先重現洩漏，再驗證資料未傳出或已移除，並保留一般group=1、09:00等課程值。合成 browser fixture也嵌入分段 token，驗證真實 postMessage／Preview 沒有洩漏。

## 證據與目前狀態

- `logs/proxy-review-fixes-red.log`：8個新增案例失敗；完整輸出先展示。
- `logs/proxy-review-fixes-green.log`：18個相關案例、typecheck／lint通過。
- `logs/proxy-reviewed-complete.log`：全專案223 tests／36 files、typecheck／lint、Web build、Chromium／Firefox代理10 tests、audit0 全部通過。
- `logs/server-handoff-web.log`：主站／代理真實 origins 的 handoff Web build及CSP一致，授權檔附帶。

沒有未處理的 Critical／Important findings，沒有 Deferred minors。這是修正後測試證據，不是 reviewer 再次確認，也不代表真實部署已驗收。

## Reviewer 未判定事項與 executor 裁決

1. 真實 CAPTCHA／legacy腳本與frameset／實際課程匯入：保留人工正式環境 gate；代價是合成通過仍可能遇到官方相容差異。
2. Docker image/digest、Caddy／VPS TLS、主站cookie scope、Cloudflare網路：保留伺服器 agent 現場驗證；代價是尚不能宣稱容器／正式登入成功。
3. 既有 Tauri／parser／排序變更不屬於此 proxy delta：保留原有成果，審閱整合邊界並參考既有 Web40、Electron11、Tauri6 回歸；代價是這次審閱不是既有分支的全面重新稽核。

以上均是明示的後續驗收，不是本輪未修的 Important findings。部署交接見 `SERVER_AGENT_DEPLOYMENT.md`，執行前由伺服器 agent確認實際 ingress／Tunnel與變更授權。
