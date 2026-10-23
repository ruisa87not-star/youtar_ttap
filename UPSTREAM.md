# Upstream provenance

youtar_ttap is independently developed and maintained by ruisa87not-star. It
contains adapted code and data from [wongjiahau/ttap-web](https://github.com/wongjiahau/ttap-web),
commit **becbba38d9986b3e624c3ed0bd6eac2171d30244** (MIT).
LICENSE retains Copyright (c) 2017 Wong Jia Hau and the complete MIT text,
alongside Copyright (c) 2026 ruisa87not-star for new contributions.

## Adapted code and data

Upstream paths below refer to the pinned commit, not local files required by this repo.

- [Student v1 parser](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/parser/parseStudentHtmlToRawSlot.ts)
  and [v2 parser](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/parser/parseStudentHtmlToRawSlot_v2.ts)
  informed src/renderer/import/parseUtarHtml.ts: headings, class rows, Mode
  columns and continuation rows. The port adds bounded input, diagnostics,
  composite identities and validation instead of browser-global IDs and silent drops.
- [findTimetable](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/permutator/findTimetable.ts)
  and [partitionize](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/permutator/partitionize.ts)
  informed src/core/solveTimetables.ts: partition by course/type, candidate sorting,
  backtracking and clash pruning. Mutable matrices/visualization hooks were
  replaced by validated minute intervals, week sets and cancellable workers.
- [September cases](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/tests/testData/heng_2017_sept.ts)
  and [April cases](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/tests/testData/heng_2017_apr.ts)
  supply the extracted course rows in tests/fixtures/upstream-cases.json.
  Expected solution counts: MPU3113=3; MPU3113+MPU3123=5; UKMM1043=29;
  ACP+BKA=0 (September); UEME3112=420 (April, retaining meeting weeks).
- The archived testData/student-2020-Sept.html was converted into
  tests/fixtures/student-2020-sept-anonymized.html. Only its course table is
  retained; account header, student identity, forms, input fields, scripts,
  links and session state are excluded. Continuation rows receive synthetic subRow identifiers. Table cells and row/column spans retain
  the Mode/multi-row regression. The complete private archive is not copied.
- The [tutorial flow](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/src/ts/react/tutorial/tutorial.tsx)
  and [manual import guide](https://github.com/wongjiahau/ttap-web/blob/becbba38d9986b3e624c3ed0bd6eac2171d30244/HowToAddSlotManually.md)
  informed rewritten Tutorial.tsx and ManualImportGuide.tsx. Remote tutorial
  fetching and original screenshots are excluded. Guide PNGs are generated
  from synthetic data by scripts/capture-import-guide.mjs.

## Behavior and boundaries

Invalid input is diagnosed, missing required class types and internally clashing
classes are excluded, and deterministic backtracking retains at most 500
solutions. Finding a 501st marks truncation. Teaching-week sets remain part of
clash correctness, without a week-filter UI. Mixed-term metadata and subset
merging remain documented limitations.

Desktop remote content uses a sandboxed, isolated WebContentsView restricted to
the official UTAR HTTPS origin, with no application preload. The local app has
a restricted ttap:// protocol, CSP and named IPC capabilities with sender
checks. Internal ttap IPC/schema names serve compatibility and do not contact an
upstream deployment. Web uses the real cross-origin iframe, subject to frame
and cookie policies. Synthetic tests alone do not verify current authenticated
UTAR course pages.

## Other assets and runtime licenses

- React, ReactDOM and scheduler: MIT texts in THIRD_PARTY_NOTICES.txt.
- Electron/Chromium: official runtime notices remain in Windows output.
- src/assets/fork-logo.png: provided by the user, who confirmed redistribution
  and retaining the current TTAP lettering during migration.
- src/renderer/help/images/: synthetic account-free guide illustrations.

LICENSE, THIRD_PARTY_NOTICES.txt and this document accompany the web output
and the packaged desktop application.

