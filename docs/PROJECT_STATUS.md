# 專案狀態與尚未完成項目

更新：2026-10-28（Asia/Kuala_Lumpur）。此文件為 Windows 0.6.0-beta.1 發佈前的驗證快照；實際公開版本以 [GitHub Releases](https://github.com/ruisa87not-star/youtar_ttap/releases) 為準。

## 已完成

- Web、Windows Electron 及 Windows Tauri 共用排課介面與核心。
- 桌面內嵌 UTAR 登入的精確官方 HTTP 轉址升級 HTTPS、連線／登入錯誤顯示。
- Course Timetable Preview 的 Lecturer／Tutor、巢狀先修表格及空資料相容性。
- 已確認衝突的未選課程移到底部；Clear 後恢復原始順序。
- 教學、Demo、選科／分組、固定時間軸、sidebar、PNG 選課指引及本機啟動器保留。
- Node.js／Docker Web 隔離代理完成本機實作、獨立審閱及兩個 Important 問題的回歸修正。詳見 [代理驗證](WEB_PROXY_VERIFICATION.md) 及 [審閱記錄](WEB_PROXY_REVIEW.md)。
- 上述成果已於提交 f79aabe 推送至 codex/tauri-windows；此次同步準備新的統一版本 0.6.0-beta.1，避免覆寫舊 Release。

## 本輪發佈驗證

- typecheck、Oxlint、223 項 Vitest 通過。
- Rust 格式、Clippy 及 11 項測試通過。
- Web Chromium／Firefox 40 項、packaged Electron 11 項、代理 Chromium／Firefox 10 項、從安裝檔解出的 release Tauri 6 項整合測試通過。
- Web production build、Electron NSIS、Tauri NSIS 成功；npm audit 0。
- Electron 安裝檔內 76 檔與已測試的 unpacked 產物逐檔雜湊一致；Tauri 僅有官方 NSIS bundle marker 的 3 bytes 差異，其餘相同，且直接測試安裝檔內的程式。授權資源比對通過。
- 安裝檔、SHA-256、完整日誌位置及待提交清單見 [0.6.0-beta.1 發佈說明](releases/v0.6.0-beta.1.md)。目前尚未執行本輪 stage／commit、合併 main、tag 或 Release 公開。

## 尚未完成：VPS／Web 正式部署

主站為 https://youtarconfession.paaartir.my，代理為 https://ttap.youtarconfession.paaartir.my；Ubuntu x64、Docker／Cloudflare，使用者將交由伺服器 agent 執行 [部署指南](SERVER_AGENT_DEPLOYMENT.md)。

現場仍須確認 ingress／Tunnel／NAT、可信 peer、主站 cookie scope、image digest、DNS／TLS 與官方 CA。本機沒有 Docker CLI，不能宣稱 Docker／Nginx／Caddy runtime 或真實 Web 代理登入已通過。部署後需使用者手動 CAPTCHA 驗證登入及課程匯入。桌面版直接連接 UTAR，不依賴該代理。

## 其餘驗證缺口與限制

- 乾淨 Windows 帳戶／VM 的完整安裝、解除安裝與缺少 WebView2 時的 runtime bootstrap；本機已存在使用者 Tauri 安裝，因此本輪採解壓 payload 比對與程式測試，不覆蓋現有安裝。
- 跨螢幕／不同 DPI 及原生子 WebView overlay 的完整驗證。
- Electron 真實帳號登入及完整課程匯入仍需人工驗證；先前 Tauri 真實登入已由使用者確認。本輪新 beta 使用合成頁面測試，不讀帳密或自動處理 CAPTCHA。
- 程式未簽章、沒有自動更新；Windows 可能顯示未知發行者／SmartScreen 提示。
- Tauri 使用固定版本的 unstable 子 WebView API，升級前須重跑原生整合測試。

## 來源與私密資料

此次所有寫入均在獨立 youtar_ttap 或外部驗證暫存目錄；ttap_utar_fork 與 upstream 未寫入。私人 preview、login_credential、.env、node_modules、建置產物及日誌均保持 Git ignored；安裝檔透過 Release 資產發佈，不加入來源 Git。
