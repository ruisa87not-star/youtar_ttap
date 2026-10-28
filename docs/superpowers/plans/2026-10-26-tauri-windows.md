# Windows Tauri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a feature-equivalent Windows x64 Tauri app with release exe below100000000bytes, preserving Web/Electron.
**Architecture:** A Tauri-specific bootstrap implements the existing DesktopBridge. Rust owns native dialogs/files, close protection and an isolated child WebView; shared TS retains planner/parser/image and login presentation logic.
**Tech Stack:** Tauri2.12.5 (exact Rust version, unstable child-view feature), Rust MSVC stable, current React/TS/Vite/Vitest/Playwright; WebView2 Evergreen; native dialogs in Rust.
**Spec:** docs/superpowers/specs/2026-10-26-tauri-windows-design.md (approved2026-10-26).

## Global Constraints

- Source ttap_utar_fork is read-only. Work in youtar_ttap, preserve Web/Electron and existing Release.
- release main exe <100000000bytes; actual installed/installer/runtime sizes reported separately.
- Preserve full current UI/flows,10MiB file limits,PNG limits,dirty-close,cancellation and origin isolation.
- Only local planner WebView may invoke native commands; remote UTAR child receives no capabilities.
- User selected direct inline completion: write plan then implement without another plan-approval stop. No git add/commit/push/release until final status/list is reviewed under prior user rule.

## Review Focus

1. Navigation changes while a course table is being read must discard stale content (Task3 integration).
2. Async Tauri listen resolves after React cleanup; it must unsubscribe and never invoke stale close callbacks (Task1).
3. Unselected/cancelled Save must preserve dirty state and an existing destination after I/O failure (Tasks2/4).
4. Child WebView must hide for overlays and reject remote/subframe native invocation even within the same OS window (Tasks3/5).
5. Windows scaling/resize and maximization must retain compact child bounds and08–18 timetable orientation (Task5).

## File Map

- src/platform/tauri.ts: injected invoke/listen bridge + installer entry; src/renderer/main.tsx: Tauri-only bootstrap.
- vite.tauri.config.ts: separate minified frontend and generated shared registration script asset.
- src/shared/registrationScripts.ts: shared compact CSS/status/table-read scripts; src/main/registration.ts imports this instead of duplicate definitions.
- src-tauri/Cargo.toml,Cargo.lock,build.rs,tauri.conf.json,permissions/,capabilities/,icons/: pinned app setup and local-view ACL.
- src-tauri/src/{main,lib,policy,files,registration,commands,close}.rs: entry/appwindow, pure policy, bounded/atomicI/O, remote child, scopedcommands,closeguard.
- scripts/tauri.mjs: project-scoped Rust env/CLI wrapper, frontend preparation and verification dispatch.
- tests/platform/tauri.test.ts,tests/tauri/desktop.spec.ts + own Playwright config: bridge and real Windows app verification.
- README.md,.gitignore,package*.json,docs/TAURI_VERIFICATION.md: commands,notice/ignore/artifactproof.

### Task1: Toolchain and renderer bridge

**Consumes:** DesktopBridge/FilePort types and existing TS encodeProject/decodePng.
**Produces:** createTauriBridge(invoke:InvokePort,listen:ListenPort):DesktopBridge and async installTauriBridge():Promise<void>.
- [x] Create tests for pickHtml/exportImage ok/cancel/error, project validation, reject malformed PNG before invoking native, async listener cleanup, rejected one-waycalls and monotonic dirty/bounds sequence.
- [x] Run focused Vitest and observe missing module/behavior failure.
- [x] Install project-local Rust MSVC minimal toolchain without editing userPATH; npm exact CLI/API dependencies. Record resolved versions. Preserve prior locked application versions.
- [x] Implement bridge and mode-only bootstrap; distinct minified Vite build with legal copies. Do not change Web/Electron entry behavior.
- [x] Run focused bridge tests, typecheck/Oxlint; build Web and Tauri frontend. Expected all pass and Tauri-only asset bundle separate.

### Task2: Rust bounded files and policy

**Produces:** is_registration_url(&Url)->bool; is_schedule_url(&Url)->bool; validate_bounds(...)->Option<Bounds>; read_html_paths(&[PathBuf])->Result<Vec<HtmlSource>,String>; decode_png(&str)->Result<Vec<u8>,String>; write_atomically(&Path,&[u8])->Result<(),String>.
- [x] Create failing Rust unit tests for wrong origins/schemes/credentials,invalid/out-of-windowbounds,combined10MiB,nonUTF8,nonregularHTML,PNGheader/pixelboundaries and preservation on failed write.
- [x] Cargo test RED before implementations; build minimal pinned crate/config and assets needed by compiler.
- [x] Implement pure helpers, serde outcome shapes, tempfile-based same-dir atomic replacement and Rust native dialog commands; raw renderer paths are never command parameters.
- [x] Cargo fmt/clippy/test GREEN. Expected original destination retained and cancellation distinct from error.

### Task3: Scoped commands and native registration child

**Consumes:** Task1 command names/bridge shapes; Task2 file/policy helpers; shared RegistrationStatus/Bounds.
**Produces:** registered ttap_* commands, local planner label only; native remote label registration; generation-scoped status/extraction.
- [x] Extract shared compactCSS/readLoginError/table scripts preserving Electron behavior. Test URL/table/login marker extraction on syntheticfixture before hooking native.
- [x] Build maximized main window with local planner and initially hidden isolated child. Enable exact unstableTauri feature,create child in async command to avoid Windows synchronousdeadlock.
- [x] Add incognito supportedruntime check,strictUTARnavigation,newwindow/permission/download denial,HTTP/connection error reporting and generation/timeout handling. Read only fixed table script via eval_with_callback.
- [x] Add AppManifest listedcommands/permissions and capabilities restricted bywebviewlabel; independently verifycaller label+origin for every command. Do not allow arbitraryeval/path/url.
- [x] Run Rust unit/security tests and native fixture integration RED→GREEN for permitted local commands, denied remote/subframe,wrongURL/login/no table,stalenavigation anderrorstatus.

### Task4: Close protection and installer

**Consumes:** bridge setDirty(sequence),onCloseRequested(),confirmClose() and existing App modal.
- [x] Add tests for cancel-export dirty,delayedcloseeventcleanup,cleanclose,dirtyclose and unresponsive fallback.
- [x] Implement Rust close state with sequence ordering; targetedplanner event and timeout/nativefallback; do not close on cancelled save.
- [x] Build release exe and NSIS in distinct output/identity; Evergreen bootstrapper,legalnotices,logo and no auto-publish.
- [x] Verify exe name/product/version/size<100000000 and installer SHA256. Expected no Electron overwrite and no bundled fullWebView2.

### Task5: Full integration, regression and delivery

- [x] Real Tauri Windows test harness uses existing Playwright with test-process WebView2 CDP (no production config listener). If unavailable use tauri-driver without weakening ACL.
- [x] Exercise max/compactresize/overlayhide/tutorial/back/demo/manualimport/clash/group/time/PNG/dirty flows on synthetic UTAR pages; intercept in testprocess,not runtimecode.
- [x] Real native dialog HTML open/PNGsave smoke (distinct from mocked dialog selections) and inspect finalPNG.
- [x] npm check,Webbuild,Electronpackage,existing46E2E; cargo fmt/clippy/test; releaseTauri/NSIS. Show complete failure logs before targetrepairs per persistent user rule; save all logs.
- [x] Update README three-targetcommands and size/runtime caveats; THIRD_PARTY notices. Write docs/TAURI_VERIFICATION.md with exact evidence and limitations.
- [x] One fresh independent whole-change review; one focused RED→GREEN fix pass for substantive findings. Verify source digest unchanged,gitstatus/filelist/artifacts. Stop before commit/push/publication awaiting final user confirmation.

## Self-review

All approved spec areas map to Tasks1–5. Bridgecommand names/schema are defined in Task1 tests and consumed unchanged by Rust; pure I/Oinvariants Task2 are reused by commandhandlers. All five ReviewFocus inputs have explicit checks above. Final review covers native ACL and build/test separation.
