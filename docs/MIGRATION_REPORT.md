# youtar_ttap 獨立專案遷移報告

日期：2026-10-23（Asia/Kuala_Lumpur）

## 1. 結果與授權範圍

Phase 2–4 已依使用者批准完成。本地新專案同時保留 Web 與 Windows Electron，已在新位置安裝依賴、檢查、測試及打包。尚未提交、設定遠端、推送或發佈；接下來須先由使用者審閱成果。

| 項目 | 實際結果 |
|---|---|
| 唯讀來源 | `C:/Users/DarylWong/Documents/ChatGPT/ttap_utar_fork` |
| 獨立目標 | `C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap` |
| 未連接的未來 repo | `https://github.com/ruisa87not-star/youtar_ttap.git`，僅寫入套件文字 metadata |
| 名稱／appId／作者 | `youtar_ttap`／`youtar_ttap`／`ruisa87not-star` |
| 版本 | 保留 `0.5.1-beta.1` |
| 封閉複製清單 | 103 個既有檔案；來源及最初複製內容逐檔 SHA-256 核對 |
| 整理後檔案 | 103 個複製檔案＋7 個批准新增檔案＝110 個非生成檔案；其中27個複製檔案經修改 |
| Git | 全新 `.git`；分支 `codex/independent-migration`；無 HEAD／提交／index entries／remotes |
| Web 託管 | 未決定；沒有 CNAME／部署 workflow／託管平台設定 |
| Windows 發佈 | 已產生本地 NSIS 安裝檔，未建立 GitHub Release、未上傳 |
| Logo | 沿用使用者確認可公開散布的 `fork-logo.png`；圖中 TTAP 字樣仍保留 |

使用者另批准以 **Oxlint 1.89.0／.oxlintrc.json** 取代原計畫的 ESLint，保留 TypeScript 7。驗證失敗的完整日誌已先呈現，再按授權只修復目標內問題。來源從未用於 npm 安裝、測試或打包，也未執行其發佈腳本。

## 2. 目錄與跨目錄依賴

~~~text
youtar_ttap/
  package.json / package-lock.json
  index.html / tsconfig.json
  vite.config.ts / electron.vite.config.ts / electron-builder.yml
  vitest.config.ts / playwright*.config.ts / .oxlintrc.json
  .gitignore / .gitattributes
  Start-youtar_ttap.cmd
  LICENSE / THIRD_PARTY_NOTICES.txt / UPSTREAM.md / README.md
  scripts/      啟動、Playwright、合成教學圖與 Web 授權複製
  src/          Web/Electron 共用介面、parser、排課核心、平台 adapters
  tests/        單元、跨平台 E2E、合成及匿名化 fixtures
  docs/MIGRATION_REPORT.md
  dist-web/     Web 產物，忽略
  out/          Electron bundle，忽略
  release/      unpacked exe／NSIS，忽略
  logs/         本次完整日誌及隔離測試 profile，忽略
~~~

`app/` 內容提升至根目錄；使用單一 package 與 lockfile。267 個 import 的 Phase 1 檢查未發現新版程式依賴舊根 `src/`。遷移後再次檢查相對 import，沒有越過新目標邊界。

實際跨目錄依賴已處理：

- parser 測試由 `../testData/student-2020-Sept.html` 改讀新 repo 的 `tests/fixtures/student-2020-sept-anonymized.html`。
- 啟動器由 `app/scripts/start-ttap.ps1` 改讀根 `scripts/start-youtar_ttap.ps1`，只啟動本專案 `release/win-unpacked/youtar_ttap.exe`；建置失敗不開舊產物。
- README 重寫根目錄指令；UPSTREAM 的舊相對來源連結改成固定上游 commit 的公開追溯連結。
- `src/renderer/App.tsx`、E2E 的 package.json 相對關係及合成教學圖腳本均隨 app 內容一起提升，無須引用來源資料夾。

## 3. 實際複製清單

下表來源路徑相對唯讀來源；目標路徑相對新 repo。只複製這 103 個既有檔案，未複製 `.git`。修改狀態以最初來源 SHA-256 與整理後目標內容比較。

| 來源 | 目標 | 整理後 |
|---|---|---|
| app/electron-builder.yml | electron-builder.yml | 已修改 |
| app/electron.vite.config.ts | electron.vite.config.ts | 內容不變 |
| app/index.html | index.html | 已修改 |
| app/LICENSE | LICENSE | 已修改 |
| app/package-lock.json | package-lock.json | 已修改 |
| app/package.json | package.json | 已修改 |
| app/playwright.config.ts | playwright.config.ts | 內容不變 |
| app/playwright.installer.config.ts | playwright.installer.config.ts | 內容不變 |
| app/THIRD_PARTY_NOTICES.txt | THIRD_PARTY_NOTICES.txt | 已修改 |
| app/tsconfig.json | tsconfig.json | 內容不變 |
| app/UPSTREAM.md | UPSTREAM.md | 已修改 |
| app/vite.config.ts | vite.config.ts | 內容不變 |
| app/vitest.config.ts | vitest.config.ts | 內容不變 |
| app/scripts/capture-import-guide.mjs | scripts/capture-import-guide.mjs | 內容不變 |
| app/scripts/playwright.mjs | scripts/playwright.mjs | 內容不變 |
| app/scripts/start-ttap.ps1 | scripts/start-youtar_ttap.ps1 | 已修改 |
| app/src/assets.d.ts | src/assets.d.ts | 內容不變 |
| app/src/assets/fork-logo.png | src/assets/fork-logo.png | 內容不變 |
| app/src/core/clashes.ts | src/core/clashes.ts | 內容不變 |
| app/src/core/courseAvailability.ts | src/core/courseAvailability.ts | 內容不變 |
| app/src/core/solveTimetables.ts | src/core/solveTimetables.ts | 內容不變 |
| app/src/env.d.ts | src/env.d.ts | 內容不變 |
| app/src/main/close.ts | src/main/close.ts | 內容不變 |
| app/src/main/files.ts | src/main/files.ts | 內容不變 |
| app/src/main/index.ts | src/main/index.ts | 已修改 |
| app/src/main/ipc.ts | src/main/ipc.ts | 已修改 |
| app/src/main/registration.ts | src/main/registration.ts | 內容不變 |
| app/src/main/windowBounds.ts | src/main/windowBounds.ts | 內容不變 |
| app/src/platform/browser.ts | src/platform/browser.ts | 內容不變 |
| app/src/platform/browserFiles.ts | src/platform/browserFiles.ts | 內容不變 |
| app/src/platform/electron.ts | src/platform/electron.ts | 內容不變 |
| app/src/platform/files.ts | src/platform/files.ts | 內容不變 |
| app/src/preload/index.ts | src/preload/index.ts | 內容不變 |
| app/src/renderer/App.tsx | src/renderer/App.tsx | 已修改 |
| app/src/renderer/help/images/page-source.png | src/renderer/help/images/page-source.png | 內容不變 |
| app/src/renderer/help/images/timetable-preview.png | src/renderer/help/images/timetable-preview.png | 內容不變 |
| app/src/renderer/help/ManualImportGuide.tsx | src/renderer/help/ManualImportGuide.tsx | 已修改 |
| app/src/renderer/help/Tutorial.tsx | src/renderer/help/Tutorial.tsx | 已修改 |
| app/src/renderer/import/demo.html | src/renderer/import/demo.html | 內容不變 |
| app/src/renderer/import/demoProject.ts | src/renderer/import/demoProject.ts | 內容不變 |
| app/src/renderer/import/ImportPanel.tsx | src/renderer/import/ImportPanel.tsx | 內容不變 |
| app/src/renderer/import/parseUtarHtml.ts | src/renderer/import/parseUtarHtml.ts | 已修改 |
| app/src/renderer/main.tsx | src/renderer/main.tsx | 內容不變 |
| app/src/renderer/planner/ConstraintsPanel.tsx | src/renderer/planner/ConstraintsPanel.tsx | 內容不變 |
| app/src/renderer/planner/CourseList.tsx | src/renderer/planner/CourseList.tsx | 內容不變 |
| app/src/renderer/planner/CourseSummary.tsx | src/renderer/planner/CourseSummary.tsx | 內容不變 |
| app/src/renderer/planner/meetingLayout.ts | src/renderer/planner/meetingLayout.ts | 內容不變 |
| app/src/renderer/planner/Planner.tsx | src/renderer/planner/Planner.tsx | 已修改 |
| app/src/renderer/planner/registrationImage.ts | src/renderer/planner/registrationImage.ts | 已修改 |
| app/src/renderer/planner/TimeConstraintsDialog.tsx | src/renderer/planner/TimeConstraintsDialog.tsx | 內容不變 |
| app/src/renderer/planner/TimetableView.tsx | src/renderer/planner/TimetableView.tsx | 內容不變 |
| app/src/renderer/ProjectActions.tsx | src/renderer/ProjectActions.tsx | 內容不變 |
| app/src/renderer/registration/RegistrationScreen.tsx | src/renderer/registration/RegistrationScreen.tsx | 已修改 |
| app/src/renderer/registration/WebRegistrationFrame.tsx | src/renderer/registration/WebRegistrationFrame.tsx | 內容不變 |
| app/src/renderer/styles.css | src/renderer/styles.css | 內容不變 |
| app/src/shared/bridge.ts | src/shared/bridge.ts | 內容不變 |
| app/src/shared/loginError.ts | src/shared/loginError.ts | 內容不變 |
| app/src/shared/model.ts | src/shared/model.ts | 內容不變 |
| app/src/shared/png.ts | src/shared/png.ts | 內容不變 |
| app/src/shared/project.ts | src/shared/project.ts | 已修改 |
| app/src/shared/registration.ts | src/shared/registration.ts | 內容不變 |
| app/src/workers/solver.worker.ts | src/workers/solver.worker.ts | 內容不變 |
| app/src/workers/SolverClient.ts | src/workers/SolverClient.ts | 內容不變 |
| app/tests/core/courseAvailability.test.ts | tests/core/courseAvailability.test.ts | 內容不變 |
| app/tests/core/solveTimetables.test.ts | tests/core/solveTimetables.test.ts | 內容不變 |
| app/tests/core/upstreamParity.test.ts | tests/core/upstreamParity.test.ts | 內容不變 |
| app/tests/e2e/electron.spec.ts | tests/e2e/electron.spec.ts | 已修改 |
| app/tests/e2e/helpers.ts | tests/e2e/helpers.ts | 已修改 |
| app/tests/e2e/installer.spec.ts | tests/e2e/installer.spec.ts | 已修改 |
| app/tests/e2e/web.spec.ts | tests/e2e/web.spec.ts | 已修改 |
| app/tests/fixtures/paginated.html | tests/fixtures/paginated.html | 內容不變 |
| app/tests/fixtures/projects.ts | tests/fixtures/projects.ts | 內容不變 |
| app/tests/fixtures/registration-login.html | tests/fixtures/registration-login.html | 內容不變 |
| app/tests/fixtures/registration-web-login.html | tests/fixtures/registration-web-login.html | 內容不變 |
| app/tests/fixtures/solver.ts | tests/fixtures/solver.ts | 內容不變 |
| app/tests/fixtures/student-td-mode.html | tests/fixtures/student-td-mode.html | 內容不變 |
| app/tests/fixtures/student-v1.html | tests/fixtures/student-v1.html | 內容不變 |
| app/tests/fixtures/student-v2.html | tests/fixtures/student-v2.html | 內容不變 |
| app/tests/fixtures/upstream-cases.json | tests/fixtures/upstream-cases.json | 內容不變 |
| app/tests/import/demoProject.test.ts | tests/import/demoProject.test.ts | 內容不變 |
| app/tests/import/ImportPanel.test.tsx | tests/import/ImportPanel.test.tsx | 內容不變 |
| app/tests/import/parseUtarHtml.test.ts | tests/import/parseUtarHtml.test.ts | 已修改 |
| app/tests/launcher.test.ts | tests/launcher.test.ts | 已修改 |
| app/tests/main/close.test.ts | tests/main/close.test.ts | 內容不變 |
| app/tests/main/files.test.ts | tests/main/files.test.ts | 內容不變 |
| app/tests/main/ipc.test.ts | tests/main/ipc.test.ts | 內容不變 |
| app/tests/main/registration.test.ts | tests/main/registration.test.ts | 內容不變 |
| app/tests/planner/CloseActions.test.tsx | tests/planner/CloseActions.test.tsx | 內容不變 |
| app/tests/planner/CourseList.test.tsx | tests/planner/CourseList.test.tsx | 內容不變 |
| app/tests/planner/CourseSummary.test.tsx | tests/planner/CourseSummary.test.tsx | 內容不變 |
| app/tests/planner/Guidance.test.tsx | tests/planner/Guidance.test.tsx | 已修改 |
| app/tests/planner/LoginErrors.test.ts | tests/planner/LoginErrors.test.ts | 內容不變 |
| app/tests/planner/Planner.test.tsx | tests/planner/Planner.test.tsx | 內容不變 |
| app/tests/planner/ProjectActions.test.tsx | tests/planner/ProjectActions.test.tsx | 已修改 |
| app/tests/planner/RegistrationImage.test.ts | tests/planner/RegistrationImage.test.ts | 內容不變 |
| app/tests/planner/RegistrationScreen.test.tsx | tests/planner/RegistrationScreen.test.tsx | 內容不變 |
| app/tests/planner/TimetableView.test.tsx | tests/planner/TimetableView.test.tsx | 內容不變 |
| app/tests/platform/browser.test.ts | tests/platform/browser.test.ts | 內容不變 |
| app/tests/platform/electron.test.ts | tests/platform/electron.test.ts | 內容不變 |
| app/tests/setup.ts | tests/setup.ts | 內容不變 |
| app/tests/shared/project.test.ts | tests/shared/project.test.ts | 內容不變 |
| app/tests/workers/SolverClient.test.ts | tests/workers/SolverClient.test.ts | 內容不變 |
| Start-TTAP.cmd | Start-youtar_ttap.cmd | 已修改 |

新增檔案（7）：

- `.gitattributes`
- `.gitignore`
- `.oxlintrc.json`
- `README.md`
- `scripts/copy-web-notices.mjs`
- `tests/fixtures/student-2020-sept-anonymized.html`
- `docs/MIGRATION_REPORT.md`

## 4. 排除清單與理由

以下排除規則依批准的 Phase 1 清單執行。未列入103檔白名單的其他來源檔案均未複製。

| 來源／模式 | 排除理由 |
|---|---|
| .git/，含 hooks、config、refs、objects、歷史 | 使用全新歷史，避免帶入 remotes／認證／原版 git 關係；完全不複製 |
| app/node_modules/，任何 node_modules/ | 含 native modules、Electron、瀏覽器與機器相關資料；新目標以 npm ci 重建 |
| app/out/、app/dist-web/、任何 build/、dist/、coverage/ | 生成物與舊產品名稱／版本；重新建置，避免舊版混入 |
| app/release/ 整個目錄 | 舊 exe／安裝檔、blockmap、builder 設定輸出、runtime、測試 profiles、下載核對副本；新名稱須重新打包，不能沿用舊 installer hash |
| app/release/github-release.ps1 | 位於生成目錄但能使用認證並操作舊 GitHub repo；不複製、不執行 |
| app/test-results/、app/test-results-installer/、playwright-report/、log／trace／快取／暫存 | 測試生成物可能含本機路徑、表單、session 或畫面；不能當原始碼上傳 |
| app/docs/ 全部既有 PNG 與 releases/v0.5.1-beta.1.md | 歷史截圖／舊下載 repo／舊安裝檔與驗證資訊，不是 runtime 所需；新 README 先不引用它們 |
| app/VERIFICATION.md、REVIEW.md、DECISIONS.md | 原 repo 的執行歷史、commit、舊範圍與測試結果；有效技術限制另摘要寫入新 README，不冒充新驗證 |
| app/README.md | 必須重寫，不直接帶入舊 repo／下載／app 子目錄指令 |
| app/src/renderer/help/RegistrationLink.tsx | 未被任何新版程式或測試引用的舊外部登入連結元件，現況由 RegistrationScreen 處理 |
| 根 src/ 全部，含 modified_node_modules/react-grid-layout/ | 原版 CRA／Redux／MUI／permutator 與 vendored library；新版已移植必要 parser／solver，沒有 runtime import 指向此處 |
| 根 public/ 全部 | 原版 favicon、React icon、CDN／Google Calendar OAuth 與老頁面，沒有新版引用；新版必要 logo 位於 app/src/assets/ |
| 根 package.json、package.ori.json、package-lock.json | 原版 CRA 依賴與 gh-pages 腳本／作者 metadata，不適用新套件 |
| 根 tsconfig.json、tslint.json、jest.config.js、parseFile.js | 原版工具鏈，新版有自己的 TypeScript／Vitest／Vite 設定 |
| 根 scripts/ 全部，含 build、publish、launch-ttap.bat 等 | 原版 build／Surge／舊 Chrome 啟動器；新腳本全在 app/scripts/，只複製明列的 3 個 |
| .github/workflows/action.yml、.travis.yml | 指向原作者 Surge、舊 Node／actions／部署 secrets 與通知；不能移入或觸發 |
| .firebaserc、firebase.json、database.rules.json | Firebase 專案 ttap-web 及 hosting/database 舊設定，不屬新架構 |
| 根 .gitignore、.prettierignore、.prettierrc.json、.jsbeautifyrc | 原版路徑與格式化範圍；新 .gitignore 另建，不帶入無實際用途的工具設定 |
| .vscode/、.superpowers/、docs/superpowers/、suggestion/ | 工作站／代理狀態、討論與計畫，不是應用運行／測試所需 |
| 根 testData/ 全部原始 HTML | 完整學生／教職員頁可能含個資與網站狀態；只允許在新目標產生去識別化課程 fixture |
| tutorials/、tutorials_archive/、HowToAddSlotManually.md | 原版教學依賴已改寫成本機 TSX 與合成圖片；來源追溯留在 UPSTREAM.md |
| 根 course_registration.png、original_01.png、original_02.png、original_03.png | 使用者參考圖，非正式依賴；可能含原版網站或個資，不直接公開 |
| 根 fork_logo.png | 與 app/src/assets/fork-logo.png SHA-256 相同；只保留正式引用的一份 |
| 根 LICENSE | 與 app/LICENSE 完全相同；從 app/LICENSE 保留全文至新根，並非刪除原作者授權 |
| 根 README.md、API_PROPOSAL.md、benchmark-report.md、CreateReactAppTutorial.md、TODO.md、TOSPP.md、source_analysis/ | 原版說明、提案、舊基準／服務政策／空分析頁，不可替代新產品文件 |
| 任何 .env、credentials、tokens 檔、.pem／.key／.pfx／.p12／keystore／簽章檔 | 即使將來出現也不納入；目前白名單沒有這類檔案 |
| 其他未列於第 5 節的檔案 | 白名單原則，不因「可能有用」追加複製 |

建置後目標內新產生的 `node_modules/`、`dist-web/`、`out/`、`release/`、測試輸出及 `logs/` 不算複製來源產物，均由新位置重建且被忽略。本次沒有將來源檔案刪除。

## 5. 修改的設定及程式

| 範圍 | 變更與目的 |
|---|---|
| package.json／lockfile | 名稱／描述／author／repository／bugs 改成新應用；homepage 暫不填。新增 Oxlint 固定版本及 lint/check scripts。既有 lockfile 套件版本零變更，新增20個Oxlint相關套件項目 |
| electron-builder.yml | appId、productName、copyright、exe、NSIS artifact／捷徑名稱更新。Web／Electron 使用同一根 package；runtime 指向新 repo 自己的 node_modules/electron/dist，無 publish 設定 |
| dev/build desktop scripts | Electron 45 按需安裝 runtime；`install-electron && electron-vite ...`，解決乾淨 npm ci 後 dist 不存在的問題 |
| package/release scripts | 明確 `--publish never`，不能因一般打包指令觸發發佈 |
| Vite／index／UI／PNG | base 保持 `./`；document/window 標題、教學、選課指引圖片文字改為 youtar_ttap；共用來源及資產路徑維持 repo 內部 |
| .gitignore | 忽略依賴、build/dist-web/out/release、Playwright報告／測試輸出、logs／暫存、.env、credentials/tokens、憑證、OS／編輯器及代理工作檔。抽樣16個忽略路徑全數通過 git check-ignore |
| .gitattributes | 文字預設LF；cmd/ps1採CRLF；PNG為binary |
| .oxlintrc.json | correctness為error、TypeScript/React plugins；lint使用 --deny-warnings。沒有停用失敗規則或放寬斷言 |
| React生命週期 | 新lint指出 render期間ref寫入／同步effect setState／solver callback依賴問題。ref同步改用layout effect；忙碌狀態及solver/availability工作延後至microtask，保留世代編號、取消與卸載失效檢查 |
| 測試與fixtures | 移除未用import、Playwright使用合法fixture參數；更新品牌／exe／啟動器斷言。匿名fixture保留多列／Mode／span回歸，原斷言未刪減 |
| 授權與文件 | README、UPSTREAM、THIRD_PARTY_NOTICES、LICENSE更新；新增 scripts/copy-web-notices.mjs，Web build自動攜帶三份授權／來源文件 |

內部 `ttap://`、IPC 名稱、既有 `.ttap.json` schema 與測試用 adapters 保留相容性，不連接原作者的部署。原版 CRA 的 homepage／gh-pages、Firebase、Surge、OAuth/analytics 設定及CI均未移入。新 runtime 沒有發現GA、Sentry等遙測設定。沒有建立或啟用 workflow／secrets 檔案。

27個修改過的複製檔案：

- `electron-builder.yml`
- `index.html`
- `LICENSE`
- `package-lock.json`
- `package.json`
- `THIRD_PARTY_NOTICES.txt`
- `UPSTREAM.md`
- `scripts/start-youtar_ttap.ps1`
- `src/main/index.ts`
- `src/main/ipc.ts`
- `src/renderer/App.tsx`
- `src/renderer/help/ManualImportGuide.tsx`
- `src/renderer/help/Tutorial.tsx`
- `src/renderer/import/parseUtarHtml.ts`
- `src/renderer/planner/Planner.tsx`
- `src/renderer/planner/registrationImage.ts`
- `src/renderer/registration/RegistrationScreen.tsx`
- `src/shared/project.ts`
- `tests/e2e/electron.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/installer.spec.ts`
- `tests/e2e/web.spec.ts`
- `tests/import/parseUtarHtml.test.ts`
- `tests/launcher.test.ts`
- `tests/planner/Guidance.test.tsx`
- `tests/planner/ProjectActions.test.tsx`
- `Start-youtar_ttap.cmd`

## 6. License及資料處理

已讀本機保存的上游 commit `becbba38d9986b3e624c3ed0bd6eac2171d30244` 的 LICENSE 全文。新 LICENSE 完整保留 **Copyright (c) 2017 Wong Jia Hau** 及 MIT 授權文字，加入 **Copyright (c) 2026 ruisa87not-star**。移除新增版權行後，與來源原授權文字逐字核對一致。

保留授權聲明的移植範圍包括 student HTML parser、排課 partition/backtracking 邏輯、歷史 solver案例／匿名課表資料，以及受原教學啟發而改寫的流程。新repo雖採全新Git歷史，仍保留這些著作來源與授權。`UPSTREAM.md`提供固定commit的路徑與修改說明；README的Acknowledgements保留對Wong Jia Hau的感謝。

React／ReactDOM／scheduler的MIT聲明全文保留在THIRD_PARTY_NOTICES；沒有搬入舊CRA的vendored程式。Web的 `LICENSE`、`THIRD_PARTY_NOTICES.txt`、`UPSTREAM.md` 與根檔案SHA-256一致；Electron的同三份文件存在 `resources/app.asar` 且內容一致。Windows runtime的 `LICENSE.electron.txt` 及 `LICENSES.chromium.html` 與官方runtime原檔內容一致。

匿名化fixture只含課程table、文字、必要span及合成ID：**175列、34個合成subRow continuation ID**。原始學生頁面的姓名／學號／account header、form/input、script、URL/session狀態未搬入。舊class ID被去除，延續列用合成ID保留parser結構。MPU3113、OTL及多列Lecture的原回歸斷言通過。

教學PNG使用既有合成資料。正式logo只保留被程式引用的一份；使用者已明確確認可公開散布。參考截圖及完整學生HTML未納入repo。

## 7. 驗證結果

環境：Windows x64、Node.js v24.20.0、npm 11；套件版本見lockfile。所有安裝、建置與測試均在新目標執行，沒有借用來源node_modules／產物。最初先用`--package-lock-only --ignore-scripts`加入批准的lint依賴，再從沒有node_modules的目標執行npm ci。

| 檢查 | 結果與證據 |
|---|---|
| 乾淨 npm ci | 成功；新增453、audited454；該次npm audit報告0 vulnerabilities。原有transitive deprecation警告保留，見下文 |
| typecheck／Oxlint／單元 | 最終 `npm run check` exit0；**25個test files、145/145 tests** |
| Web build | `npm run build:web` exit0；dist-web產物及三份授權文件存在 |
| Web production preview | Playwright由vite preview啟動production build；**38/38**，含Chromium／Firefox |
| Electron build與--dir | `npm run package:win` exit0；electron-vite main/preload/renderer全建置；win-unpacked可啟動 |
| 全部E2E | `npm run test:e2e` **46/46**＝38 Web＋8 Electron；最後收緊桌面新品牌link斷言後，focused再跑 **1/1** |
| 原生檔案視窗 | 未mock對話框；真實Windows選檔器讀student-v2.html，確認匯入、選TEST1013，再以真實儲存視窗輸出有效PNG，exit0 |
| NSIS | `npm run release:win` exit0；x64、per-user、可選安裝目錄；--publish never |
| 授權包裝／排除／依賴 | Web與ASAR授權文件hash一致；runtime notices保留；未發現ASAR夾帶tests／testData／logs／node_modules／.env／.git。相對import無越界，程式／設定無舊資料夾依賴 |
| 敏感內容掃描 | 正式文字檔掃描GitHub/AWS/Slack token、private key、JWT模式，無命中；無禁止的憑證／.env／tokens檔案。模式掃描不等同完整安全保證 |
| 獨立審閱 | 新context、唯讀review：沒有可行動的問題；確認生命週期取消／stale-result保護、白名單、授權與匿名fixture。reviewer本身未重跑測試或真實UTAR登入 |

Web核心測試涵蓋HTML匯入、手動指南、demo、選科／分組／即時clash、時間限制、Clear、sidebar位置、responsive課表、PNG下載及取消保護。Electron測試另驗證啟動最大化、內嵌隔離／尺寸／錯誤、IPC／protocol邊界、原生adapter檔案I/O。

使用者後續要求的產品介面是 **HTML輸入＋PNG選課指引輸出**，沒有Open／Export project按鈕。因此未新增專案存檔介面；schemaVersion1讀寫adapter由既有單元測試覆蓋。瀏覽器重新整理／關閉後，不會自動恢復可編輯課表。

原生視窗測試使用隔離profile `logs/native-profile`，UTAR遠端回應替換為本地合成login fixture，沒有輸入真實憑證。HTML輸入與PNG輸出均由Windows原生視窗操作，未mock；成功後只關閉本次測試的應用。

原生測試輸出：

- [PNG選課指引](../logs/native-smoke/real-dialog-guide.png)：1600×1556，212169 bytes；已直接檢視，星期縱向、08–18時間橫向、課程／分組與步驟可讀。
- [原生測試結果JSON](../logs/native-smoke/result.json)及[完整日誌](../logs/18-native-smoke.log)。JSON的maximized=false是啟動早期、ready-to-show前的快照；桌面E2E在ready後輪詢isMaximized=true，8個桌面測試的beforeEach均通過。
- PNG SHA-256：`bee1db34b625d4923206387235a84e8576272e981ed0134467355f39fba8e6e9`。

本次沒有執行可選的installer安裝／解除安裝E2E，因其會修改一般使用者帳戶的捷徑／登錄項目；安裝器的clean VM實測仍待後續安排。沒有用真實帳號驗證目前學期的UTAR課程頁。

### 完整執行紀錄索引

每份日誌保留命令、完整stdout/stderr、時間及exit code。`logs/`為本機驗證證據，受gitignore排除，GitHub上不會自動出現；請在本機審閱或另行選擇可公開的證據。下列失敗日誌也完整收錄於報告附錄，沒有隱藏先前失敗。

| 日誌 | 命令 | Exit |
|---|---|---:|
| [01-lockfile](../logs/01-lockfile.log) | `npm.cmd install --package-lock-only --ignore-scripts --save-dev --save-exact oxlint@1.89.0 --no-fund` | 0 |
| [02-npm-ci](../logs/02-npm-ci.log) | `npm.cmd ci` | 0 |
| [03-typecheck](../logs/03-typecheck.log) | `npm.cmd run typecheck` | 0 |
| [04-lint](../logs/04-lint.log) | `npm.cmd run lint` | 1 |
| [05-unit-baseline](../logs/05-unit-baseline.log) | `npm.cmd test` | 1 |
| [06-typecheck-fixed](../logs/06-typecheck-fixed.log) | `npm.cmd run typecheck` | 0 |
| [07-lint-fixed](../logs/07-lint-fixed.log) | `npm.cmd run lint` | 0 |
| [08-unit-fixed](../logs/08-unit-fixed.log) | `npm.cmd test` | 0 |
| [09-browsers](../logs/09-browsers.log) | `npm.cmd run install:browsers` | 0 |
| [10-web-build](../logs/10-web-build.log) | `npm.cmd run build:web` | 0 |
| [11-desktop-package](../logs/11-desktop-package.log) | `npm.cmd run package:win` | 1 |
| [12-web-e2e](../logs/12-web-e2e.log) | `npm.cmd run test:e2e:web` | 1 |
| [13-desktop-package-fixed](../logs/13-desktop-package-fixed.log) | `npm.cmd run package:win` | 0 |
| [14-e2e-all](../logs/14-e2e-all.log) | `npm.cmd run test:e2e` | 0 |
| [15-desktop-title](../logs/15-desktop-title.log) | `node scripts/playwright.mjs test --project=desktop --grep "primary action remains visible"` | 1 |
| [16-desktop-title-fixed](../logs/16-desktop-title-fixed.log) | `node scripts/playwright.mjs test --project=desktop --grep=primary` | 0 |
| [17-windows-installer](../logs/17-windows-installer.log) | `npm.cmd run release:win` | 0 |
| [18-native-smoke](../logs/18-native-smoke.log) | `node C:\Users\DarylWong\.codex\visualizations\2026\10\21\01a15d37-88ad-7073-b9c7-0d10e1fe3d30\youtar_ttap-migration\native-smoke.cjs` | 0 |
| [19-final-check](../logs/19-final-check.log) | `npm.cmd run check` | 0 |

### 失敗、原因與修正

1. **首次lint（17項）**：未使用import、空fixture參數、React ref/effect/callback規則。完整日誌先呈現，再修復目標程式；保留全部規則與回歸測試。最終lint exit0。
2. **匿名fixture的1項單元失敗**：移除原continuation ID後，parser無法把延續列連到同一class。只在匿名fixture補34個合成subRow ID，保留原course/mode/multi-meeting斷言；145項全通過。
3. **首次Windows打包**：Electron45的按需runtime尚未下載，electronDist不存在。先呈現完整stack，才把官方install-electron加進dev/build，重跑--dir成功；NSIS也成功。
4. **Web E2E最初36過／2失敗**：兩個browser的教學heading locator仍是舊品牌。更新為新品牌並全跑46項通過，沒有刪除測試。
5. **focused桌面重跑首次No tests found**：外部日誌runner的含空白grep參數引用問題。改用`--grep=primary`，1項通過；與產品程式無關。
6. **原生視窗自動操作工具**：UIA快取曾回報element unavailable、CDP在受限node環境出現EACCES。以已授權的隔離Playwright renderer定位加Windows鍵盤輸入完成真實視窗測試，沒有更改產品程式。測試控制器close後讀已關閉page的錯誤只影響外部控制器；主測試確認成功並正常exit0。
7. **受限唯讀Git status查詢**：曾回報operation must be run in a work tree；在完整權限下唯讀重跑exit0並列出所有untracked檔案，core.bare一直為false，未修改Git設定。外部檢查工具也修正為嚴格檢查查詢exit code。
8. **外部產物檢查工具**：首次用LICENSE而非builder實際的LICENSE.electron.txt，修正後另遇工具語法錯誤；均未改應用或套件。最後Web／ASAR／runtime文件內容核對通過。PowerShell對rg的wildcard參數問題亦以直接檔案檢查取代。

npm保留inflight1.0.6、rimraf2.6.3、glob7.2.3、boolean3.2.0的既有間接套件棄用警告。npm ci當次audit為0漏洞，仍不表示未來永遠無漏洞；未擴大本次範圍強行升級既有依賴。Playwright日誌中的NO_COLOR/FORCE_COLOR警告來自執行環境，不影響結果。

## 8. 本機產物與未發佈狀態

| 產物 | 路徑 |
|---|---|
| Web | `dist-web/`；根目錄執行`npm run preview:web`可本地預覽 |
| 免安裝測試目錄 | `release/win-unpacked/youtar_ttap.exe`；須保留整個目錄 |
| 啟動器 | `Start-youtar_ttap.cmd` |
| NSIS安裝檔 | `release/youtar_ttap-Setup-0.5.1-beta.1-x64.exe` |

安裝檔大小 **114050868 bytes**；SHA-256：

~~~text
14829972f97c43da1027c4558bbf401cc76d78d606f68c94413e8a46f35aea44
~~~

`Get-AuthenticodeSignature`結果為 **NotSigned**。builder日誌出現signing階段不代表已配置有效憑證；未配置簽章／自動更新，未把任何憑證帶入repo。後續公開散布前仍需Windows隔離環境安裝檢查及發行者簽章決策。

## 9. 來源保全與Git狀態

Phase 1及完成後，來源479個非生成檔案的路徑＋內容雜湊集合一致：

~~~text
cac0ea9b583ee3125f5c59b2cd32ac631e86d8e65ca9ddf62b948c5b7a8591b8
~~~

103個原始複製檔案也再次逐檔核對來源hash未變。此hash基線排除.git／node_modules／生成物，並未聲稱逐一hash所有Git物件或第三方依賴。全程沒有執行任何來源寫入操作。

來源git status與基線相同，沒有tracked修改，原有六項untracked內容保留：

~~~text
?? course_registration.png
?? fork_logo.png
?? original_01.png
?? original_02.png
?? original_03.png
?? suggestion/
~~~

目標110個非生成檔案全為untracked；git index無項目。`git remote -v`無輸出；`git log --oneline`以exit128回覆尚無commits，屬空歷史的預期狀態；沒有複製來源.git或連接上游。沒有執行git add／commit／push／remote add，沒有觸發部署或建立GitHub Release。

## 10. 未啟用的CI草案

目前不需要啟用CI即可使用本地Web／Electron。未來若批准，可採以下**只存於報告、不可直接使用的草案**；action SHA placeholders須另行核實，並先確認Windows runner有互動desktop／Electron測試條件。沒有建立`.github/workflows`或含secrets的檔案。

~~~yaml
name: local-quality-and-windows-build-draft
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  check-and-package:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@<PIN_REVIEWED_FULL_SHA>
      - uses: actions/setup-node@<PIN_REVIEWED_FULL_SHA>
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run install:browsers
      - run: npm run build:web
      - run: npm run package:win
      - run: npm run test:e2e
      - run: npm run release:win
      - uses: actions/upload-artifact@<PIN_REVIEWED_FULL_SHA>
        with:
          name: youtar_ttap-local-build
          path: |
            dist-web/**
            release/youtar_ttap-Setup-*.exe
~~~

此草案不含Pages、部署、Releases寫入權限或上傳到repo的步驟；安裝器安裝測試也未啟用。公開Web託管及手動Releases發布需另行確認。

## 11. 剩餘風險與交付界線

- 安裝檔未簽章，尚未完成clean VM安裝／解除安裝測試；本機打包成功及unpacked原生I/O已驗證。
- Web hosting未選定；實際host的根／子路徑、HTTPS、UTAR iframe與第三方cookie政策仍須部署前驗證。跨來源Web無法擷取官方login DOM／錯誤。
- 登入及課程測試使用合成頁面；不代表真實UTAR帳號／目前學期資料已驗證。資料不得混合不同學期，subset/partial重複rows合併仍有限制。
- 產品保留PNG輸出流程，沒有可編輯專案的存檔／重新開啟UI或自動恢復；底層schema/adapters維持測試覆蓋。Teaching-week集合仍用於clash正確性，沒有week篩選UI。
- 保留現有TTAP字樣logo是使用者的明確決定；未重畫品牌素材。
- 依賴棄用警告、unsigned build與模式掃描的限制如上；沒有以跳過測試或關閉規則掩蓋問題。
- 新repo尚未有commit或remote。使用者確認後，仍須先展示git status與待提交檔案清單，才能另行批准git add／commit／remote add／push；本次在此界線停止。

## 附錄：初次失敗的完整日誌

以下原樣保存五份失敗執行日誌（包含命令與exit code），供審核修正前的證據。成功執行的完整日誌請用第7節索引開啟。

### 04-lint

~~~text
COMMAND: npm.cmd run lint
CWD: C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap
START_UTC: 2026-10-23T08:55:23.868Z
NODE: v24.20.0


> youtar_ttap@0.5.1-beta.1 lint
> oxlint --deny-warnings src tests scripts *.config.ts

tests/e2e/electron.spec.ts:4:55: error eslint(no-unused-vars): Identifier 'importFixturePlan' is imported but never used. help: Consider removing this import.
tests/e2e/electron.spec.ts:4:73: error eslint(no-unused-vars): Identifier 'readProject' is imported but never used. help: Consider removing this import.
tests/e2e/electron.spec.ts:4:85: error eslint(no-unused-vars): Identifier 'expectCandidate' is imported but never used. help: Consider removing this import.
tests/e2e/electron.spec.ts:16:78: error eslint(no-empty-pattern): Empty object binding pattern help: Passing `null` or `undefined` will result in runtime error because `null` and `undefined` cannot be destructured.
tests/e2e/electron.spec.ts:28:94: error eslint(no-empty-pattern): Empty object binding pattern help: Passing `null` or `undefined` will result in runtime error because `null` and `undefined` cannot be destructured.
tests/e2e/electron.spec.ts:77:109: error eslint(no-empty-pattern): Empty object binding pattern help: Passing `null` or `undefined` will result in runtime error because `null` and `undefined` cannot be destructured.
tests/e2e/electron.spec.ts:95:101: error eslint(no-empty-pattern): Empty object binding pattern help: Passing `null` or `undefined` will result in runtime error because `null` and `undefined` cannot be destructured.
tests/planner/Guidance.test.tsx:5:9: error eslint(no-unused-vars): Identifier 'ImportPanel' is imported but never used. help: Consider removing this import.
tests/e2e/installer.spec.ts:8:107: error eslint(no-empty-pattern): Empty object binding pattern help: Passing `null` or `undefined` will result in runtime error because `null` and `undefined` cannot be destructured.
tests/e2e/web.spec.ts:3:9: error eslint(no-unused-vars): Identifier 'resolve' is imported but never used. help: Consider removing this import.
src/renderer/registration/RegistrationScreen.tsx:14:50: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.
src/renderer/App.tsx:35:41: error react(refs): Cannot access refs during render help: React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected
src/renderer/App.tsx:36:48: error react(refs): Cannot access refs during render help: React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected
src/renderer/planner/Planner.tsx:22:23: error react(immutability): Cannot access variable while it is being initialized help: `generate` is read while its declaration is still being initialized. Move the access after initialization. For a recursive callback, use a named function expression or restructure the callback so it does not capture itself during initialization
src/renderer/planner/Planner.tsx:24:34: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.
src/renderer/planner/Planner.tsx:22:48: error react-hooks(exhaustive-deps): The ref's value `.current` is accessed directly in the effect cleanup function. help: The ref value will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by react, copy it to a variable inside the effect and use that variable in the cleanup function.
src/renderer/planner/Planner.tsx:22:23: error react-hooks(exhaustive-deps): React Hook useEffect has a missing dependency: 'generate' help: Either include it or remove the dependency array.


RESULT: {"name":"04-lint","command":"npm.cmd run lint","log":"logs/04-lint.log","exitCode":1,"signal":null,"startUTC":"2026-10-23T08:55:23.868Z","endUTC":"2026-10-23T08:55:25.102Z"}

~~~

### 05-unit-baseline

~~~text
COMMAND: npm.cmd test
CWD: C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap
START_UTC: 2026-10-23T08:56:58.951Z
NODE: v24.20.0


> youtar_ttap@0.5.1-beta.1 test
> vitest run


 RUN  v5.0.5 C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap

 ❯ tests/import/parseUtarHtml.test.ts (24 tests | 1 failed) 669ms
   ❯ UTAR course pages (24)
     × imports the anonymized upstream 2020 course table with complete multi-row lectures 184ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/import/parseUtarHtml.test.ts > UTAR course pages > imports the anonymized upstream 2020 course table with complete multi-row lectures
AssertionError: expected undefined to be defined
 ❯ tests/import/parseUtarHtml.test.ts:19:71
     17|   it('imports the anonymized upstream 2020 course table with complete …
     18|     const r=parse(readFileSync('tests/fixtures/student-2020-sept-anony…
     19|     const course=r.courses.find(c=>c.code==='MPU3113');expect(course).…
       |                                                                       ^
     20|     expect(course!.classes.every(c=>c.classMode==='OTL' && c.meetings.…
     21|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 24 passed (25)
      Tests  1 failed | 144 passed (145)
   Start at  16:57:00
   Duration  11.20s (environment 50%, tests 31%, setup 13%, transform 4%, import 3%, worker 1%)

Environment  jsdom was created 25 times · 44.88s total, 50% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments



RESULT: {"name":"05-unit-baseline","command":"npm.cmd test","log":"logs/05-unit-baseline.log","exitCode":1,"signal":null,"startUTC":"2026-10-23T08:56:58.951Z","endUTC":"2026-10-23T08:57:12.038Z"}

~~~

### 11-desktop-package

~~~text
COMMAND: npm.cmd run package:win
CWD: C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap
START_UTC: 2026-10-23T09:03:56.420Z
NODE: v24.20.0


> youtar_ttap@0.5.1-beta.1 package:win
> npm run build:desktop && electron-builder --win --dir --publish never


> youtar_ttap@0.5.1-beta.1 build:desktop
> electron-vite build

vite v8.3.5 building ssr environment for production...
transforming...
✓ 11 modules transformed.
rendering chunks...
out/main/index.js  25.59 kB

✓ built in 171ms
vite v8.3.5 building ssr environment for production...
transforming...
✓ 2 modules transformed.
rendering chunks...
out/preload/index.cjs  1.23 kB

✓ built in 58ms
vite v8.3.5 building client environment for production...
transforming...
✓ 45 modules transformed.
rendering chunks...
out/renderer/index.html                                 0.78 kB
out/renderer/assets/solver.worker-CHCvfwQK.js           7.97 kB
out/renderer/assets/timetable-preview-CYYtdlWB.png     29.91 kB
out/renderer/assets/page-source-TGc1SX-t.png           37.99 kB
out/renderer/assets/fork-logo-CO4Do-az.png          1,095.37 kB
out/renderer/assets/index-DI-q_ZOl.css                 31.06 kB
out/renderer/assets/index-CT1dxfhQ.js                 668.86 kB

✓ built in 565ms
  • electron-builder  version=26.15.3 os=10.0.26300
  • loaded configuration  file=C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\electron-builder.yml
  • executing @electron/rebuild  electronVersion=45.0.0 arch=x64 buildFromSource=false workspaceRoot=C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap projectDir=./ appDir=./
  • installing native dependencies  arch=x64
  • completed installing native dependencies
  • packaging       platform=win32 arch=x64 electron=45.0.0 appOutDir=release\win-unpacked
  ⨯ The specified electronDist does not exist: C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\electron\dist. Please provide a valid path to the Electron zip file, cache directory, or electron build directory.  failedTask=build stackTrace=Error: The specified electronDist does not exist: C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\electron\dist. Please provide a valid path to the Electron zip file, cache directory, or electron build directory.
    at selectElectron (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\app-builder-lib\src\electron\ElectronFramework.ts:193:13)
    at ElectronFramework.prepareApplicationStageDirectory (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\app-builder-lib\src\electron\ElectronFramework.ts:152:27)
    at WinPackager.doPack (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\app-builder-lib\src\platformPackager.ts:257:5)
    at WinPackager.pack (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\app-builder-lib\src\platformPackager.ts:163:5)
    at Packager.doBuild (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\app-builder-lib\src\packager.ts:530:11)
    at executeFinally (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\builder-util\src\promise.ts:12:14)
    at Packager.build (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\app-builder-lib\src\packager.ts:450:31)
    at executeFinally (C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\node_modules\builder-util\src\promise.ts:12:14)


RESULT: {"name":"11-desktop-package","command":"npm.cmd run package:win","log":"logs/11-desktop-package.log","exitCode":1,"signal":null,"startUTC":"2026-10-23T09:03:56.420Z","endUTC":"2026-10-23T09:04:22.016Z"}

~~~

### 12-web-e2e

~~~text
COMMAND: npm.cmd run test:e2e:web
CWD: C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap
START_UTC: 2026-10-23T09:05:49.302Z
NODE: v24.20.0


> youtar_ttap@0.5.1-beta.1 test:e2e:web
> node scripts/playwright.mjs test --project=web-chromium --project=web-firefox

[WebServer] (node:27028) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 38 tests using 1 worker

(node:12320) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok  1 [web-chromium] › tests\e2e\web.spec.ts:7:1 › Monday–Sunday rows and horizontal 08:00–18:00 fit after resizing (4.3s)
  ok  2 [web-chromium] › tests\e2e\web.spec.ts:24:1 › skip directly reveals a compact embedded registration and a dismissible manual dialog (1.4s)
  ok  3 [web-chromium] › tests\e2e\web.spec.ts:36:1 › browser compact login hides the banner and announcements, keeps the real form and can reveal subsequent pages (2.2s)
  ok  4 [web-chromium] › tests\e2e\web.spec.ts:60:1 › demo opens a full catalog alongside the timetable, summary and visual constraints (1.8s)
  ok  5 [web-chromium] › tests\e2e\web.spec.ts:73:1 › the app frame fits short screens while long sections scroll internally (2.2s)
  ok  6 [web-chromium] › tests\e2e\web.spec.ts:89:1 › desktop collapse preserves an active narrow Courses panel when resizing (1.1s)
  ok  7 [web-chromium] › tests\e2e\web.spec.ts:97:1 › Clear removes filtered and fixed selections while full-day unavailable time keeps the 08:00–18:00 axis (1.9s)
  x   8 [web-chromium] › tests\e2e\web.spec.ts:114:1 › tutorial, manual import guide, sidebar and Back preserve the current plan (7.8s)
(node:27044) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok  9 [web-chromium] › tests\e2e\web.spec.ts:133:1 › primary timetable action stays in view on desktop and every narrow panel (2.8s)
  ok 10 [web-chromium] › tests\e2e\web.spec.ts:147:1 › course and timetable text remain readable at a laptop viewport (1.2s)
  ok 11 [web-chromium] › tests\e2e\web.spec.ts:155:1 › imports the archived td/Mode and spanned-Remark layout with both meetings (1.1s)
  ok 12 [web-chromium] › tests\e2e\web.spec.ts:162:1 › course edits check clashes immediately and export the selected option as a PNG guide (2.3s)
  ok 13 [web-chromium] › tests\e2e\web.spec.ts:173:1 › alternating-week meetings remain readable within a bounded calendar (2.0s)
  ok 14 [web-chromium] › tests\e2e\web.spec.ts:183:1 › imports multiple dropped HTML pages, without executing scripts or fetching their resources (971ms)
  ok 15 [web-chromium] › tests\e2e\web.spec.ts:191:1 › invalid HTML import preserves the current selection (1.5s)
  ok 16 [web-chromium] › tests\e2e\web.spec.ts:197:1 › time constraints immediately clear an impossible timetable and recover after removal (1.4s)
  ok 17 [web-chromium] › tests\e2e\web.spec.ts:203:1 › narrow layout supports keyboard course selection and panel changes (1.0s)
  ok 18 [web-chromium] › tests\e2e\web.spec.ts:209:1 › clashing courses are disabled in place and selected-course arrows open a bounded group flyout (1.6s)
  ok 19 [web-chromium] › tests\e2e\web.spec.ts:222:1 › long course group selectors stay inside the screen and can scroll to the final choice (1.4s)
(node:26620) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok 20 [web-firefox] › tests\e2e\web.spec.ts:7:1 › Monday–Sunday rows and horizontal 08:00–18:00 fit after resizing (10.3s)
  ok 21 [web-firefox] › tests\e2e\web.spec.ts:24:1 › skip directly reveals a compact embedded registration and a dismissible manual dialog (2.1s)
  ok 22 [web-firefox] › tests\e2e\web.spec.ts:36:1 › browser compact login hides the banner and announcements, keeps the real form and can reveal subsequent pages (4.2s)
  ok 23 [web-firefox] › tests\e2e\web.spec.ts:60:1 › demo opens a full catalog alongside the timetable, summary and visual constraints (3.1s)
  ok 24 [web-firefox] › tests\e2e\web.spec.ts:73:1 › the app frame fits short screens while long sections scroll internally (4.8s)
  ok 25 [web-firefox] › tests\e2e\web.spec.ts:89:1 › desktop collapse preserves an active narrow Courses panel when resizing (2.1s)
  ok 26 [web-firefox] › tests\e2e\web.spec.ts:97:1 › Clear removes filtered and fixed selections while full-day unavailable time keeps the 08:00–18:00 axis (3.3s)
  x  27 [web-firefox] › tests\e2e\web.spec.ts:114:1 › tutorial, manual import guide, sidebar and Back preserve the current plan (9.1s)
(node:20992) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok 28 [web-firefox] › tests\e2e\web.spec.ts:133:1 › primary timetable action stays in view on desktop and every narrow panel (5.9s)
  ok 29 [web-firefox] › tests\e2e\web.spec.ts:147:1 › course and timetable text remain readable at a laptop viewport (2.0s)
  ok 30 [web-firefox] › tests\e2e\web.spec.ts:155:1 › imports the archived td/Mode and spanned-Remark layout with both meetings (2.7s)
  ok 31 [web-firefox] › tests\e2e\web.spec.ts:162:1 › course edits check clashes immediately and export the selected option as a PNG guide (3.3s)
  ok 32 [web-firefox] › tests\e2e\web.spec.ts:173:1 › alternating-week meetings remain readable within a bounded calendar (3.5s)
  ok 33 [web-firefox] › tests\e2e\web.spec.ts:183:1 › imports multiple dropped HTML pages, without executing scripts or fetching their resources (1.6s)
  ok 34 [web-firefox] › tests\e2e\web.spec.ts:191:1 › invalid HTML import preserves the current selection (2.3s)
  ok 35 [web-firefox] › tests\e2e\web.spec.ts:197:1 › time constraints immediately clear an impossible timetable and recover after removal (2.5s)
  ok 36 [web-firefox] › tests\e2e\web.spec.ts:203:1 › narrow layout supports keyboard course selection and panel changes (1.9s)
  ok 37 [web-firefox] › tests\e2e\web.spec.ts:209:1 › clashing courses are disabled in place and selected-course arrows open a bounded group flyout (3.4s)
  ok 38 [web-firefox] › tests\e2e\web.spec.ts:222:1 › long course group selectors stay inside the screen and can scroll to the final choice (2.4s)


  1) [web-chromium] › tests\e2e\web.spec.ts:114:1 › tutorial, manual import guide, sidebar and Back preserve the current plan 

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('heading', { name: 'A quick tour of TTAP.' })
    Expected: visible
    Timeout: 7000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" getByRole('heading', { name: 'A quick tour of TTAP.' }) with timeout 7000ms
      - waiting for getByRole('heading', { name: 'A quick tour of TTAP.' })


      113 |
      114 | test('tutorial, manual import guide, sidebar and Back preserve the current plan',async({page},info)=>{
    > 115 |   await page.setViewportSize({width:1280,height:720});await page.reload();await expect(page.getByRole('heading',{name:'A quick tour of TTAP.'})).toBeVisible();
          |                                                                                                                                                  ^
      116 |   for(const width of [375,320]){
      117 |     await page.setViewportSize({width,height:900});await expect(page.getByRole('button',{name:'Skip tutorial'})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      118 |     await page.screenshot({path:info.outputPath(`tutorial-${width}.png`)});
        at C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\tests\e2e\web.spec.ts:115:146

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-chromium\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-chromium\error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-chromium\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [web-firefox] › tests\e2e\web.spec.ts:114:1 › tutorial, manual import guide, sidebar and Back preserve the current plan 

    Error: expect(locator).toBeVisible() failed

    Locator: getByRole('heading', { name: 'A quick tour of TTAP.' })
    Expected: visible
    Timeout: 7000ms
    Error: element(s) not found

    Call log:
      - Expect "toBeVisible" getByRole('heading', { name: 'A quick tour of TTAP.' }) with timeout 7000ms
      - waiting for getByRole('heading', { name: 'A quick tour of TTAP.' })


      113 |
      114 | test('tutorial, manual import guide, sidebar and Back preserve the current plan',async({page},info)=>{
    > 115 |   await page.setViewportSize({width:1280,height:720});await page.reload();await expect(page.getByRole('heading',{name:'A quick tour of TTAP.'})).toBeVisible();
          |                                                                                                                                                  ^
      116 |   for(const width of [375,320]){
      117 |     await page.setViewportSize({width,height:900});await expect(page.getByRole('button',{name:'Skip tutorial'})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      118 |     await page.screenshot({path:info.outputPath(`tutorial-${width}.png`)});
        at C:\Users\DarylWong\Documents\ChatGPT\youtar_ttap\tests\e2e\web.spec.ts:115:146

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-firefox\test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-firefox\error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-firefox\trace.zip
    Usage:

        npx playwright show-trace test-results\web-tutorial-manual-import-4a92d-k-preserve-the-current-plan-web-firefox\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [web-chromium] › tests\e2e\web.spec.ts:114:1 › tutorial, manual import guide, sidebar and Back preserve the current plan 
    [web-firefox] › tests\e2e\web.spec.ts:114:1 › tutorial, manual import guide, sidebar and Back preserve the current plan 
  36 passed (2.0m)


RESULT: {"name":"12-web-e2e","command":"npm.cmd run test:e2e:web","log":"logs/12-web-e2e.log","exitCode":1,"signal":null,"startUTC":"2026-10-23T09:05:49.302Z","endUTC":"2026-10-23T09:07:54.438Z"}

~~~

### 15-desktop-title

~~~text
COMMAND: node scripts/playwright.mjs test --project=desktop --grep "primary action remains visible"
CWD: C:/Users/DarylWong/Documents/ChatGPT/youtar_ttap
START_UTC: 2026-10-23T09:14:37.994Z
NODE: v24.20.0

[WebServer] (node:14256) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
Error: No tests found.
Make sure that arguments are regular expressions matching test files.
You may need to escape symbols like "$" or "*" and quote the arguments.



RESULT: {"name":"15-desktop-title","command":"node scripts/playwright.mjs test --project=desktop --grep \"primary action remains visible\"","log":"logs/15-desktop-title.log","exitCode":1,"signal":null,"startUTC":"2026-10-23T09:14:37.994Z","endUTC":"2026-10-23T09:14:41.427Z"}

~~~
