# Changelog

## 0.6.0-beta.1 — 2026-10-28

### Added

- Windows x64 Tauri 版：共用排課介面、原生開啟／儲存、隔離的 UTAR 內嵌登入及小型安裝檔；保留 Electron 與 Web。
- 可自行部署的 Node.js／Docker Web 登入代理、設定範本及伺服器 agent 部署指南。正式服務仍需自行部署及完成手動登入驗證。

### Changed

- 已確認 Course Clash 的未選課程排至底部；可加入的課程優先顯示，Clear 後恢復原始順序。

### Fixed

- 桌面內嵌登入將官方舊 HTTP 轉址安全升級至 HTTPS。
- Course Timetable Preview 的 Lecturer／Tutor 表格、巢狀先修條件及空資料相容性。
- Web 代理的導覽預算與分段／短工作階段標記的課程匯入清理。

## 0.5.1-beta.1

- 首次獨立 repository 的 Web／Windows Electron beta 版本。
