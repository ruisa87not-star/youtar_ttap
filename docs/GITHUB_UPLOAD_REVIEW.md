# GitHub 上傳前清單

日期：2026-10-28。Repository: https://github.com/ruisa87not-star/youtar_ttap

現有本機分支：codex/tauri-windows。遠端只有main，HEAD為2102eda631918306ac5bf3ece7d3e63681380f16。以下是待提交的完整檔案清單，尚未 staging／commit／push。

## 內容

- 保留 Web、Electron，新增 Tauri Windows 與授權／工具鏈設定。
- 登入HTTPS轉址、課程表新版格式、Course Clash排序與相應測試。
- 隔離Web代理、資料最小化、獨立審閱修正與Ubuntu/Docker/Cloudflare交接文件。
- 不提交帳密、私人課表、.env、憑證、node_modules、快取、建置產物、安裝檔或交接ZIP；不建立Release、workflow或部署。

## 檢查

候選共104檔；新增／修改來源及文件，沒有刪除檔案。GitHub token／AWS key／私鑰格式掃描未發現命中；這是限定格式掃描，並非所有敏感資料的形式化證明。原始個人credential／課表仍Git ignored，未讀入掃描。原有LICENSE／版權保留。所有檔案小於GitHub單檔限制。

## git status（產生清單前）

```text
 M .gitignore
 M README.md
 M package-lock.json
 M package.json
 M src/main/registration.ts
 M src/renderer/App.tsx
 M src/renderer/import/parseUtarHtml.ts
 M src/renderer/main.tsx
 M src/renderer/planner/CourseList.tsx
 M src/renderer/registration/RegistrationScreen.tsx
 M src/renderer/styles.css
 M tests/e2e/electron.spec.ts
 M tests/e2e/helpers.ts
 M tests/e2e/web.spec.ts
 M tests/import/parseUtarHtml.test.ts
 M tests/main/registration.test.ts
 M tests/planner/CourseList.test.tsx
 M tests/planner/Planner.test.tsx
 M tests/planner/RegistrationScreen.test.tsx
 M vite.config.ts
?? .dockerignore
?? .env.example
?? deploy/
?? docs/COURSE_TABLE_VERIFICATION.md
?? docs/LOGIN_DIAGNOSIS.md
?? docs/PROJECT_STATUS.md
?? docs/SERVER_AGENT_DEPLOYMENT.md
?? docs/TAURI_VERIFICATION.md
?? docs/WEB_LOGIN_OPTIONS.md
?? docs/WEB_PROXY_REVIEW.md
?? docs/WEB_PROXY_VERIFICATION.md
?? docs/WEB_REGISTRATION_PROXY.md
?? docs/superpowers/
?? licenses/
?? playwright.proxy.config.ts
?? playwright.tauri.config.ts
?? scripts/build-proxy.mjs
?? scripts/proxy-fixture.ts
?? scripts/tauri-notices.mjs
?? scripts/tauri.mjs
?? server/
?? src-tauri/
?? src/platform/tauri.ts
?? src/renderer/registration/ProxyRegistrationFrame.tsx
?? src/renderer/registration/proxyBridge.ts
?? src/renderer/registration/proxyConfig.ts
?? src/shared/proxyTable.ts
?? src/shared/registrationProxy.ts
?? src/shared/registrationScripts.ts
?? tests/fixtures/student-lecturer.html
?? tests/planner/ProxyTable.test.ts
?? tests/planner/RegistrationScripts.test.ts
?? tests/platform/tauri.test.ts
?? tests/proxy-browser/
?? tests/proxy/
?? tests/tauri/
?? tsconfig.proxy.json
?? vite.tauri.config.ts
```

## 完整待提交檔案

- A .dockerignore
- A .env.example
- M .gitignore
- M README.md
- A deploy/registration-proxy/Caddyfile.example
- A deploy/registration-proxy/Dockerfile
- A deploy/registration-proxy/compose.example.yml
- A deploy/registration-proxy/youtar.env.example
- A docs/COURSE_TABLE_VERIFICATION.md
- A docs/GITHUB_UPLOAD_REVIEW.md
- A docs/LOGIN_DIAGNOSIS.md
- A docs/PROJECT_STATUS.md
- A docs/SERVER_AGENT_DEPLOYMENT.md
- A docs/TAURI_VERIFICATION.md
- A docs/WEB_LOGIN_OPTIONS.md
- A docs/WEB_PROXY_REVIEW.md
- A docs/WEB_PROXY_VERIFICATION.md
- A docs/WEB_REGISTRATION_PROXY.md
- A docs/superpowers/plans/2026-10-26-tauri-windows.md
- A docs/superpowers/plans/2026-10-27-web-registration-proxy.md
- A docs/superpowers/specs/2026-10-26-tauri-windows-design.md
- A docs/superpowers/specs/2026-10-27-web-registration-proxy-design.md
- A licenses/tauri-overrides/MPL-2.0.txt
- A licenses/tauri-overrides/SOURCES.json
- A licenses/tauri-overrides/alloc-stdlib-LICENSE.txt
- A licenses/tauri-overrides/webview2-LICENSE.txt
- A licenses/tauri/RUST-COPYRIGHT-library.html
- A licenses/tauri/THIRD_PARTY_NOTICES.txt
- M package-lock.json
- M package.json
- A playwright.proxy.config.ts
- A playwright.tauri.config.ts
- A scripts/build-proxy.mjs
- A scripts/proxy-fixture.ts
- A scripts/tauri-notices.mjs
- A scripts/tauri.mjs
- A server/registration-proxy/app.ts
- A server/registration-proxy/config.ts
- A server/registration-proxy/limits.ts
- A server/registration-proxy/main.ts
- A server/registration-proxy/policy.ts
- A server/registration-proxy/rewrite.ts
- A server/registration-proxy/sessions.ts
- A server/registration-proxy/transport.ts
- A server/registration-proxy/types.ts
- A src-tauri/Cargo.lock
- A src-tauri/Cargo.toml
- A src-tauri/build.rs
- A src-tauri/capabilities/planner.json
- A src-tauri/icons/32x32.png
- A src-tauri/icons/icon.ico
- A src-tauri/permissions/planner.toml
- A src-tauri/src/close.rs
- A src-tauri/src/commands.rs
- A src-tauri/src/files.rs
- A src-tauri/src/lib.rs
- A src-tauri/src/main.rs
- A src-tauri/src/native_webview.rs
- A src-tauri/src/policy.rs
- A src-tauri/src/registration.rs
- A src-tauri/src/state.rs
- A src-tauri/tauri.conf.json
- M src/main/registration.ts
- A src/platform/tauri.ts
- M src/renderer/App.tsx
- M src/renderer/import/parseUtarHtml.ts
- M src/renderer/main.tsx
- M src/renderer/planner/CourseList.tsx
- A src/renderer/registration/ProxyRegistrationFrame.tsx
- M src/renderer/registration/RegistrationScreen.tsx
- A src/renderer/registration/proxyBridge.ts
- A src/renderer/registration/proxyConfig.ts
- M src/renderer/styles.css
- A src/shared/proxyTable.ts
- A src/shared/registrationProxy.ts
- A src/shared/registrationScripts.ts
- M tests/e2e/electron.spec.ts
- M tests/e2e/helpers.ts
- M tests/e2e/web.spec.ts
- A tests/fixtures/student-lecturer.html
- M tests/import/parseUtarHtml.test.ts
- M tests/main/registration.test.ts
- M tests/planner/CourseList.test.tsx
- M tests/planner/Planner.test.tsx
- A tests/planner/ProxyTable.test.ts
- M tests/planner/RegistrationScreen.test.tsx
- A tests/planner/RegistrationScripts.test.ts
- A tests/platform/tauri.test.ts
- A tests/proxy-browser/index.html
- A tests/proxy-browser/main.tsx
- A tests/proxy-browser/proxy.spec.ts
- A tests/proxy/app.test.ts
- A tests/proxy/cli.test.ts
- A tests/proxy/frame.test.tsx
- A tests/proxy/limits.test.ts
- A tests/proxy/policy.test.ts
- A tests/proxy/rewrite.test.ts
- A tests/proxy/sessions.test.ts
- A tests/proxy/transport.test.ts
- A tests/tauri/desktop.spec.ts
- A tests/tauri/harness.ts
- A tsconfig.proxy.json
- M vite.config.ts
- A vite.tauri.config.ts

建議推送為新遠端分支codex/tauri-windows，保留main，讓伺服器agent明確選擇分支／commit。上傳路徑以使用者確認為準，不force push。
