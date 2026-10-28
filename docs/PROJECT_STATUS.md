# 專案狀態與尚未完成項目

更新：2026-10-28（Asia/Kuala_Lumpur），Web 隔離代理本機實作／獨立審閱修正完成。代理證據見 [WEB_PROXY_VERIFICATION.md](WEB_PROXY_VERIFICATION.md)；使用者確認的網域與 Ubuntu x64／Docker／Cloudflare 部署交接見 [SERVER_AGENT_DEPLOYMENT.md](SERVER_AGENT_DEPLOYMENT.md)。此處未部署。

## 本輪已完成：Course Clash 排序

- 使用目前有效的 availability 結果；已確認衝突、尚未選取的課程移至清單底部。
- 可加入的課程與已選課程留在上方；各組保留原始課程順序，不另按代碼／名稱排序。
- 選課、分組或時間限制更新後，重新依最新結果排序。解除衝突／Clear 後，可加入的課程依原始相對順序回到上方。
- 尚在檢查的課程不會被當成已確認衝突。搜尋仍可使用，已選課程仍能取消。
- 排序只作用於顯示用的副本，未改動 project.courses、課程顏色、選取資料或排課演算法。

產品變更集中在 `src/renderer/planner/CourseList.tsx`。新增 component／Planner 整合測試，並在 Chromium、Firefox、packaged Electron、release Tauri 驗證實際 DOM 順序與解除衝突後的恢復。

## 本輪驗證

| 檢查 | 結果 | 完整日誌 |
| --- | --- | --- |
| Typecheck、Oxlint、Vitest | 171 tests／27 files 通過 | `logs/course-order-check.log` |
| Production Web build | 成功 | 同上 |
| Chromium／Firefox 排序、解除衝突、分組視窗與窄畫面 | 2 passed | `logs/course-order-e2e-web.log` |
| 新增 native E2E 的 typecheck／lint、Electron NSIS | 成功，未發佈 | `logs/course-order-package-electron.log` |
| Tauri NSIS | 成功，未發佈 | `logs/course-order-package-tauri.log` |
| Packaged Electron 排序／Clear／重新選課 | 1 passed | `logs/course-order-e2e-electron.log` |
| Release Tauri 排序／Clear／重新選課 | 1 passed | `logs/course-order-e2e-tauri.log` |
| 啟動器 CheckOnly | `package: Current` | 本輪終端檢查 |

四個新增 unit／integration 回歸測試先在舊實作失敗，再修正成通過；完整 RED 輸出見 `logs/course-order-red.log`，已在修改產品程式前展示。本輪 E2E 是四個針對排序的案例，不是重新執行所有 E2E／Rust 測試。

## 最新本機產物

本機版本號仍為 `0.5.1-beta.1`，與先前 Release 同名但內容已更新。沒有上傳或覆寫 GitHub Release；公開發佈前需另定新版本／tag。

| 產物 | Bytes | SHA-256 |
| --- | ---: | --- |
| `src-tauri/target/release/youtar_ttap_tauri.exe` | 4,395,008 | `3b370ec7e87468561187c9752d709c98f97070255a787e11d75f5b2d17d405c1` |
| `src-tauri/target/release/bundle/nsis/youtar_ttap (Tauri)_0.5.1-beta.1_x64-setup.exe` | 2,246,000 | `956dfc9944cc5bdfa9168284bbd376f3e682be48bc92e8a5ad6738d5b1ff603a` |
| `release/youtar_ttap-Setup-0.5.1-beta.1-x64.exe` | 114,051,205 | `82f00f8f41d90e2572a2bc9dd29470a78e5c6643bd2887ba0d94e86f8f0eb2dc` |

Web 產物在 `dist-web/`；Electron unpacked／Tauri release exe 已更新以驗證代理整合不影響原生功能。本輪未重建 NSIS：表中兩份 installer 與 checksum 仍是之前排序完成的版本；不要當作含本輪變更的新 Release。既有 Windows 安裝目錄不會因 build 自動更新。

## 尚未完成：實作

### VPS／Web 隔離登入代理（本機已實作，正式部署未完成）

已完成 Node 隔離代理、Web 配置／iframe／Preview 匯入、合成測試及獨立審閱修正。223 項全專案測試、10 項代理 Chromium/Firefox 通過；先前既有 Web40／Electron11／Tauri6回歸亦通過。兩個 Important findings（asset重設導覽預算、分段／短token資料外洩）已RED→GREEN驗證；沒有未處理的Critical/Important或minor。真實網域的Web handoff build／CSP核對與audit0通過，尚未部署。

已確認主站 https://youtarconfession.paaartir.my、代理 https://ttap.youtarconfession.paaartir.my、Ubuntu x64、Docker／Cloudflare。使用者將交由伺服器 agent 執行；仍須現場確認 ingress／Tunnel／NAT、可信peer、cookie scope、image digest、DNS/TLS與官方CA。本機沒有Docker CLI，Docker／Nginx／Caddy runtime及真實登入均未驗證。

未配置代理的官方 iframe 仍有 HTTP downgrade 限制；本機代理的升級流程已合成驗證，但正式 Web 尚未部署，不能宣稱真實登入完成。正式環境需使用者手動 CAPTCHA 驗證登入及課程匯入；不會自動解驗證碼或提交選課。

## 尚未完成：提交與公開發佈

| 項目 | 目前狀態 | 下一步 |
| --- | --- | --- |
| 最新程式碼提交／推送 | Tauri、登入修正、課程表相容性及排序等本機變更尚未由本輪工作提交／推送 | 依原約定先顯示 git status 和待提交清單供確認，再授權 git add／commit／push |
| 新 Windows Release | 兩種新安裝檔已在本機完成；本輪沒有公開發佈 | 選定新的統一版本／tag、完成發佈驗證，再上傳 GitHub Releases；不覆寫既有版本 |
| 公開 Web 更新 | 本機 dist-web 已更新；既有網站副本尚未由本輪同步／部署 | 審核需同步的 Web 檔案及宿主設定，另行授權部署。部署解析／排序更新不會自動解決代理登入問題 |

## 尚未完成：正式環境驗證

這些是既有驗證缺口，不是本輪發現的新執行錯誤：

- 乾淨 Windows 環境的安裝／解除安裝，及缺少 WebView2 時的下載 bootstrap；先前解壓 installer payload 不等同乾淨 VM 安裝。
- 跨螢幕／不同 DPI、原生子 WebView overlay 與 restored／maximized／resize 的完整驗證；目前有本機人工觀察，原生自動化斷言仍有限。
- Electron 真實帳號登入及完整課程匯入仍需人工驗證。Tauri 真實登入已由使用者確認；原始課程檔已在離線 Web production build 驗證，桌面課程匯入則有合成整合測試。
- Web 代理在實際 VPS／hostname 上的 Chromium／Firefox、cookie、CSP、真實 CAPTCHA 和課程匯入，須等代理實作與部署後驗收。

## 已完成且保留的先前成果

- 登入後的官方 HTTP redirect：Electron／Tauri 只對精確官方主機升級 HTTPS，保留其他導覽限制。
- 新版 Lecturer/Tutor 欄、內嵌先修表格、No Record Found 的匯入相容性；提供的原檔可匯入 20 門課、40 班別，另有 5 門官方無班別提示。詳見 [課程表驗證](COURSE_TABLE_VERIFICATION.md)。
- 三個版本、原始授權、教學／Demo、選課衝突、分組、Clear、PNG 匯出及本機啟動器均保留。

## 來源與私密資料保護

來源 `ttap_utar_fork` 原本 479 檔 hash 仍相同；加上使用者既有 preview 檔的 480 檔 digest 亦未變。來源／upstream 沒有寫入操作，私人 preview 與 login_credential 都保持 Git ignored，沒有進入 fixture。

分支 `codex/tauri-windows`，HEAD `2102eda631918306ac5bf3ece7d3e63681380f16`；staged diff 空白。沒有 git add／commit／push／remote add，沒有 VPS／DNS／網站部署操作。
