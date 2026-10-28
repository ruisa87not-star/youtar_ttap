# Web Registration Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. User selected inline execution, then an independent final review.

**Goal:** Implement the approved isolated UTAR login/course-preview proxy and prove its security and browser behavior locally without deployment or real credentials.

**Architecture:** A single Node.js 24 process serves only allowlisted UTAR routes on a separate same-site origin. Private in-memory sessions hold upstream cookies and observed passids; the browser receives rewritten official HTML with a fixed, narrowly scoped postMessage bridge. The planner reuses its existing inert importer; native Electron/Tauri paths remain unchanged.

**Tech Stack:** Node 24 native TypeScript/HTTPS, parse5 8.0.1, tough-cookie 6.0.2, existing React/Vite/Vitest/Playwright. One root package-lock; no new framework or database.

**Spec:** `docs/superpowers/specs/2026-10-27-web-registration-proxy-design.md`

## Global Constraints

- Source ttap_utar_fork is read-only. All product edits are in youtar_ttap; retain existing uncommitted Tauri/parser/sorting work.
- No git add/commit/push/remote add, deploy, DNS changes, real login/CAPTCHA, or credential-file reads. No CI activation.
- Production: exact HTTPS unitreg.utar.edu.my:443 only; distinct same-site HTTPS planner/proxy origins; __Host-, Secure, HttpOnly, SameSite=Strict proxy cookie.
- Only login POST; never course-registration/account mutation. 16 KiB request, 10 MiB HTML, 2 MiB assets, 15-second upstream timeout, 60-second navigation budget, 8 redirects.
- Sessions: idle 15 minutes, absolute 2 hours, max 200. Create 10/IP/min; login 5/session/min and 20/IP/min; concurrent 40 global/4 per session.
- No raw URLs/query/body/cookies/tokens/IP/user data in logs or analytics/cache. No TLS or browser-security bypass.
- HTML bridge transfers sanitized course table only on request; reject stale, wrong-origin/window/channel/document/request messages.
- Dependency installers use --ignore-scripts; package audit and fixed exact versions. Node production entry has no arbitrary upstream/test URL switch.
- Docker files are reviewable artifacts; local Docker is unavailable. Prove Node execution; defer actual Docker/VPS validation explicitly.

## Review Focus

1. A redirect after login downgrades to HTTP or changes host: no insecure/private request or credential replay; test Task 4.
2. Cookie/session/passid from visitor A is supplied by visitor B, including after logout: deny before egress; test Tasks 2/4/6.
3. Original tables contain token-bearing links/hidden fields, and stale replies arrive during same-URL reload: parent receives no secret or old table; test Tasks 3/5/6.
4. URL encodings, DNS resolving to private IP, compressed oversized bodies or stalled clients evade limits: fail closed without a socket to a private destination or resource leak; test Tasks 1/4.
5. Production rejects insecure/same-origin/cross-site configuration and forged proxy headers, while loopback fixture injection cannot be enabled in the production entry: test Tasks 1/4/6.

## Files and interfaces

- `server/registration-proxy/{types,config,policy,sessions,limits,rewrite,transport,app,main}.ts`: bounded HTTP service. Dependencies import with .ts; no enums/runtime namespaces/aliases.
- `src/shared/registrationProxy.ts`: public frame protocol/config types only, no Node imports.
- `src/renderer/registration/{proxyBridge,ProxyRegistrationFrame}.tsx/.ts` and `RegistrationScreen.tsx`, `App.tsx`: cooperating frame and optional build config; no fake native bridge.
- `scripts/{build-proxy,proxy-fixture}.mjs/.ts`, `tests/proxy/*`, `tests/proxy-browser/*`, `playwright.proxy.config.ts`: synthetic testing only.
- `tsconfig.proxy.json`, package scripts, Vite CSP transform, .env.example/.dockerignore, `deploy/registration-proxy/{Dockerfile,compose.example.yml,Caddyfile.example}` and documentation.

### Task 1: Configuration, policy and dependency boundary

**Produces:** `ProxyConfig {publicOrigin,plannerOrigin,host,port,trustedProxyIP?}`, `readConfig(env):ProxyConfig`, `upstreamURL(value,base,method):URL`, safe `ProxyError(status,code)`, fixed allowlisted paths, protocol types.

- [ ] Add tests for distinct same-site HTTPS config, forbidden creds/query/path/ports/IP/localhost, exact route/method/query allowlists, encoded traversal/separators, safe HTTP upgrade and private/mapped IP rejection.
- [ ] Run `npx vitest run tests/proxy/policy.test.ts` RED; show full failure.
- [ ] Pin/install parse5/tough-cookie; implement config/policy and server NodeNext/erasable typecheck, add server to lint/tests. No browser import of server.
- [ ] GREEN: focused policy tests, typecheck/lint and npm audit. Initial GET documents are exactly login, indexSurvey, registration/studentRegistrationSurvey, schedule/masterSchedule and schedule/masterScheduleSurvey; initial POST loginProSurvey only; CSS/Kaptcha fixed known resources. Only observed passid/message and bounded cache query keys.

### Task 2: Private sessions and resource limits

**Consumes:** Task 1 config/errors. **Produces:** `SessionStore` create/get/delete with CookieJar, csrf/passids/navigation state; `Limiter.take(key,limit,window)`, request acquire/release; injectable clock for tests.

- [ ] RED tests for two independent jars/passid ownership, expiry/logout/capacity, forged IDs/cookies, max cookie/token budgets, rate limits, concurrency release after errors, hashed IP keys, and bounded limiter storage.
- [ ] Implement cryptographic session/CSRF IDs; no password/body storage. Own-cookie parsing only; upstream Set-Cookie stays in its jar. Passids registered only from validated upstream response destinations/content, with bounded count/length.
- [ ] GREEN: `npx vitest run tests/proxy/sessions.test.ts tests/proxy/limits.test.ts`. Expired authenticated routes never recreate an authenticated session; login GET can start a fresh one.

### Task 3: Official document rewriting and least-data frame bridge

**Consumes:** Task 1 policy/config; Task 2 session. **Produces:** `rewriteHTML(html,{upstream,config,session}):string`, `rewriteCSS`, fixed bundled `dist-proxy/bridge.js`; `proxyBridge` protocol.

- [ ] RED tests for relative/absolute paths, validated Location/meta refresh/form/resource URLs, unsupported/off-site content, CSRF injection/removal contract, nested prerequisite tables and compact login CSS. Never execute upstream JS on the server.
- [ ] Parse/serialize with parse5; remove base/external resources, constrain targets/forms. Rewrite only known literal official URL prefixes in legacy JS; unknown dynamic navigation remains blocked. The fixed bootstrap is an external script under /__ttap/ with safely encoded data attributes.
- [ ] Bridge validates parent origin/window and a parent-generated channel challenge; random documentId plus requestId guards responses. Before unload/submit/navigation send loading invalidation; parent reload changes channel and cancels requests.
- [ ] Sanitize cloned course tables to table/section/row/cell/text/br only, bounded spans and subRow IDs; remove URLs/forms/scripts/inputs/attributes and redact known passid values. No tokens/whole DOM/account data returned. Parent gets categorical login errors; actual UTAR error remains inside frame.
- [ ] GREEN: rewrite + bridge unit tests and `npm run build:proxy`.

### Task 4: HTTPS transport and HTTP application

**Consumes:** Tasks 1-3. **Produces:** `createProxyServer({config,transport,bridgeSource,clock?}):{server,close}`, `Transport(request,signal):Promise<{status,headers,body}>`, production `httpsTransport`, strict `main.ts`.

- [ ] RED integration tests use an injected fake Transport while every requested URL is still exact official HTTPS: POST → HTTP 302 → rewritten safe browser redirect → final Survey page; wrong host/port/method/unknown or cross-session passid denied before egress.
- [ ] Implement native HTTPS transport with verified public DNS address pinning, expected TLS servername and normal certificate verification. Manual redirect handling is in the app; do not automatically follow an unvalidated Location. Stream decompression/limits and abort on disconnect/timeout.
- [ ] Validate raw request Host/path, own session, Origin/CSRF, method/content type/field/size bounds. Send only fixed upstream headers, its private jar cookies and validated body. Return allowlisted HTML/CSS/image types with no-store/CSP/referrer protections. Never expose upstream Set-Cookie or raw errors.
- [ ] Implement 8-hop/60-second navigation budget, per-session token ownership, safe logout/expired/error pages, and fixed bridge/health routes. Refresh redirects use the same policy/binding. Unsupported URLs fail closed.
- [ ] GREEN: app + transport abuse/size/encoding/timeout/forged-header tests. Production entry uses fixed transport/origin, reads generated bridge and safe env only; errors print fixed event/code fields.

### Task 5: Planner integration and public CSP configuration

**Consumes:** Task 3 protocol/bootstrap; Task 4 service. **Produces:** optional `registrationProxy` config on App/RegistrationScreen for test injection, production HTTPS config from VITE_REGISTRATION_PROXY_ORIGIN; `ProxyRegistrationFrame`.

- [ ] RED component tests for configured proxy vs native/official fallback, compact/login/error/expired/schedule states, explicit Preview, origin/window/schema/token-leak/stale/reload/timeouts, and no native API exposure.
- [ ] Integrate exact postMessage handshake with document/request/channel IDs; data only on user Preview, 10 MiB UTF-8 bound then existing onSource/inert parser/confirmation. Reload/logout invalidate prior requests and hide/halt when suspended.
- [ ] Validate build origin and generate frame-src from the same setting via Vite. Main app CSP never gains unsafe-inline scripts, HTTP production frames, wildcard or server credentials. Preserve default native routes and existing import/sorting behavior; unconfigured Web explains known redirect limitation.
- [ ] GREEN: registration component tests, typecheck/lint, Web build and existing registration/native unit regressions.

### Task 6: Browser fixture, deployment artifacts and whole-change verification

**Consumes:** Tasks 1-5. **Produces:** standalone Node/Docker deployment drafts, public env template, hosting integration/rollback guide, verification report and final review package.

- [ ] Build a loopback-only fixture launcher with fake Transport, synthetic CAPTCHA/credentials/cookies/tokens and same-site distinct ports. Its App config is injected by test entry; production env/entry never accepts fixture HTTP or custom upstream. No real credential file access or live login.
- [ ] Chromium/Firefox E2E: wrong CAPTCHA/login/retry → HTTP redirect upgraded → current course table → Preview/import/select/export; compact/full/viewport; wrong-message/old-reload reply; two sessions/token reuse; logout/expiry. Assert no external/HTTP upstream and no synthetic secret in parent DOM/messages/logs.
- [ ] Node CLI smoke validates production config rejection, missing config/bridge safe failure and non-listening startup; Docker non-root/read-only/no volumes/no access logs; compose/Caddy templates enforce one instance, private backend, trusted forwarded IP and no raw URL logging. .env.example contains public origins/limits only.
- [ ] Run `npm run check`, proxy browser suite, `npm run build:web`, existing Web/Electron/Tauri regression suites with the new native bundles where affected, and dependency audit. Show full sanitized failure logs before repairs. Docker execution is deferred if the local CLI/runtime is absent, not reported as passed.
- [ ] Prepare task delta review package (baseline is pre-task uncommitted files, no commits permitted); independent final reviewer checks full proxy flow, native boundaries, tests and above Review Focus. One verified Critical/Important fix pass; ledger minors/remaining production gates.
- [ ] Update status/report/README, preserve scratch ledger because commits are forbidden, and present reviewable results. Ask only for remaining deployment-specific configuration/approval when the local result is concrete.

## Authorization and execution notes

The user already approved this design for planning/local implementation/validation and now explicitly resumes unfinished work. Continue inline after publishing this plan; do not ask the same-scope permission again. This does not authorize staging/pushing/releases or actual VPS/DNS deployment. All commit steps in generic skills are replaced by an uncommitted ledger checkpoint under this user constraint.

Transport ruling: use native https.request rather than fetch to pin a resolved public IP without a third production dependency; preserve manual per-hop validation and HTTPS-only behavior. Same network contract, more deterministic SSRF/TLS testing.

Self-review: all spec sections map to Tasks 1-6; task interfaces use config/session/transport/protocol consistently. Review Focus cases are assigned explicit tests above. No extra implementation approval needed beyond existing scoped authorization; external deployment remains a separate gate.
