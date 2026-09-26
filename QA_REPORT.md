# StitchPad final QA report

Audit date: 2026-09-25. The repository has no `.git` directory, so tracked/untracked status cannot be inspected. Original fixtures were treated as read-only and retain their hashes.

## Repository and build inventory

- Application: React + TypeScript + Vite.
- Production parsing: `src/parsers`, executed by `src/workers/parser.worker.ts`.
- Rendering/input: `src/renderer` and `src/components/PatternCanvas.tsx`.
- Progress/persistence: `src/progress` and `src/persistence/database.ts`.
- PWA: `public/manifest.webmanifest`, `public/sw.js`, registration in `src/main.tsx`.
- Automated tests: 8 files in `Tests/`, 28 tests.
- Diagnostic tools: `tools/inspect.ts`, `tools/compare.ts`, `tools/qa-diagnostics.ts`.
- Fixtures: `Мурчащая осень.saga` (796,312 bytes) and `Мурчащая осень.dize` (25,559 bytes).

Dependencies used by production are React, ReactDOM, Vite/React plugin, `fflate`, and `fast-xml-parser`. Development dependencies provide TypeScript, ESLint, Prettier, Vitest, jsdom, Testing Library, TSX, and fake IndexedDB.

No Xcode project, Swift file, DerivedData, SwiftPM `.build`, temporary dump, obsolete parser implementation, or duplicate native application remains. `node_modules`, `dist`, coverage, `.build`, and TypeScript build metadata are ignored. TypeScript incremental metadata was moved from the repository root to `node_modules/.cache` during QA.

Fixture SHA-256 values after QA:

- SAGA: `2ff024bf3ee9778c30c8aabf170170227cfac05d82ad00676e5d593af566908b`
- DIZE: `7855484feb72e231569475ad3aaa286d29563d7421b546a7642a971153cad697`

## Parser results from production code

Diagnostics were produced with `npm run qa:diagnostics`, which imports the same `parsePattern` entry point used by the Web Worker.

| Field | SAGA | DIZE | Match? |
| --- | ---: | ---: | :---: |
| Detected format/container | ZIP (`PK`), 4 entries | `DIZE`, version 3, encoding 2 | n/a |
| Width | 101 | 101 | YES |
| Height | 101 | 101 | YES |
| Palette entries | 43 | 43 | YES |
| Total stitches | 9,661 | 9,661 | YES |
| Full crosses | 8,979 | 8,979 | YES |
| Right half-crosses | 651 | 651 | YES |
| Knots | 31 | 31 | YES |
| Backstitches | 639 | 639 | YES |
| Unknown stitch records | 0 | 0 | YES |
| Parser warnings | 0 | 0 | YES |
| Stable stitch-ID set | 9,661 | 9,661 | YES, exact set equality |
| Backstitch-ID set | 639 | 639 | YES, exact set equality |
| Palette ID/RGB mapping | 43 | 43 | YES |
| Canonical hash | `bb043f4b18cd6a542ff614b0a0a606bb12719ae4e6417ba759b4448749886ae1` | same | YES |

SAGA archive entries are `_CrossStitch3.ttf` (31,760 expanded bytes), `hoops.xpub` (22,360), `info.xpub` (12,140), and `hoop_0.xpub` (984,172). The production parser does not use or redistribute the embedded font.

DIZE support is not a claim of full coverage of every historical/vendor feature. It fully decodes the observed version-3 fixture's core pattern data: PTRN, FBRK, MATS (including nested records), STCH, NODE, and BACK. INFO, SPEC, IMGS, and unsupported future stitch/special-object semantics are not exposed in the normalized model. Unknown stitch types are retained as `unknown` and reported as warnings.

### First 10 decoded palette entries

Both formats produced the same ID, number, RGB, neutral symbol, and stitch count below. SAGA labels the brand `Generic` with an empty name; DIZE provides brand `CrossStitch3` and name `МВ`. Those catalog-label differences are intentionally excluded from canonical identity.

| ID | Number | RGB | Symbol | Stitch count |
| ---: | --- | --- | :---: | ---: |
| 0 | 1 | 175,168,123 | ● | 264 |
| 1 | 2 | 130,120,68 | ■ | 55 |
| 2 | 2 | 130,120,68 | ▲ | 292 |
| 3 | 3 | 99,89,41 | n | 250 |
| 4 | 4 | 229,192,96 | ✚ | 77 |
| 5 | 4 | 229,192,96 | ✦ | 519 |
| 6 | 4 | 229,192,96 | w | 59 |
| 7 | 5 | 206,140,30 | C | 151 |
| 8 | 5 | 206,140,30 | r | 444 |
| 9 | 6 | 168,90,31 | □ | 333 |

### 20 decoded stitch samples

Samples were selected at evenly distributed production-parser indices, not copied from test expectations. They are identical for SAGA and DIZE.

| x | y | Thread | Type | Stable ID |
| ---: | ---: | ---: | --- | --- |
| 1 | 1 | 28 | fullCross | `1:1:fullCross:28:0` |
| 2 | 7 | 28 | fullCross | `2:7:fullCross:28:0` |
| 88 | 12 | 5 | halfCrossRight | `88:12:halfCrossRight:5:0` |
| 14 | 18 | 10 | fullCross | `14:18:fullCross:10:0` |
| 27 | 23 | 10 | fullCross | `27:23:fullCross:10:0` |
| 41 | 28 | 28 | fullCross | `41:28:fullCross:28:0` |
| 54 | 33 | 5 | halfCrossRight | `54:33:halfCrossRight:5:0` |
| 67 | 38 | 8 | fullCross | `67:38:fullCross:8:0` |
| 81 | 43 | 24 | fullCross | `81:43:fullCross:24:0` |
| 94 | 48 | 4 | halfCrossRight | `94:48:halfCrossRight:4:0` |
| 9 | 54 | 2 | fullCross | `9:54:fullCross:2:0` |
| 22 | 59 | 27 | fullCross | `22:59:fullCross:27:0` |
| 36 | 64 | 33 | fullCross | `36:64:fullCross:33:0` |
| 49 | 69 | 36 | fullCross | `49:69:fullCross:36:0` |
| 62 | 74 | 9 | fullCross | `62:74:fullCross:9:0` |
| 76 | 79 | 42 | fullCross | `76:79:fullCross:42:0` |
| 89 | 84 | 31 | fullCross | `89:84:fullCross:31:0` |
| 4 | 90 | 35 | fullCross | `4:90:fullCross:35:0` |
| 17 | 95 | 28 | fullCross | `17:95:fullCross:28:0` |
| 79 | 56 | 39 | knot | `79:56:knot:39:2` |

## Anti-hardcoding

- Production mock/fallback found: **NO**.
- Filename-specific production logic found: **NO**.
- Fixture JSON or prebuilt production Pattern found: **NO**.
- Mutation test: **PASS**. A temporary truncated SAGA copy was created under the OS temporary directory and production parsing returned a controlled error. The original was not modified and the temporary directory was removed.
- Stable ID repeatability: **PASS**. The first 1,000 IDs matched across independent runs.
- Canonical hash repeatability: **PASS** across repeated runs and different filename/location strings.

`StartScreen.tsx` contains an `aria-hidden` decorative 8×8 sample card whose caption says 101×101/43 colors. It is static presentation only and is not imported by either parser or used after opening a file.

## Progress and persistence

- 100-stitch marking: **PASS** (`completed=100`, `remaining=9561`, exact percentage `100/9661`).
- Duplicate marking: **PASS** (second Mark operation changed zero IDs).
- Unmark 25: **PASS** (`completed=75`), including per-thread counters.
- Undo one multi-stitch stroke: **PASS**.
- Redo: **PASS**.
- Export/import round-trip: **PASS** for 100 IDs, selected thread, viewport, and display settings.
- Wrong-pattern rejection: **PASS**.
- Unknown completed IDs: **PASS**, safely removed by sanitization and reported.
- Empty/invalid/missing/future-version/corrupt progress: **PASS**, controlled errors.
- IndexedDB save/destroy/reload: **PASS** in the repository test against the real persistence implementation.
- Browser IndexedDB restore: **PASS** in production UI. A real SAGA was opened, one real stitch was marked, autosave completed, the page was reloaded, the same file was reopened, and `1/9661` was restored.
- Cross-format restore: **PASS**. The DIZE file was then opened and the SAGA-created `1/9661` progress was restored by canonical identity.

Counters are now incremental inside `MarkingEngine`; marking does not scan all stitches. IndexedDB autosave is debounced by 500 ms per completed stroke/settings change, not per pointer move. `visibilitychange(hidden)` and `pagehide` additionally flush pending state.

## Input and rendering

- VIEW mode safety: **PASS** by logic test and code path; it only changes transform.
- MARK tap/drag: **PASS**. Mark is idempotent; Toggle is separate.
- Ordinary touch/capacitive stylus: **PASS** through the touch path when finger marking is enabled, now enabled by default in explicit MARK mode. No core operation requires `pointerType === "pen"`.
- Only Selected Thread: **PASS**.
- Multi-touch safety: **PASS**. A second pointer commits/stops the current stroke and suppresses all further marking until every pointer is released.
- Stroke interpolation: **PASS**, including a synthetic jump from x=1 to x=8 with every intermediate cell.
- Undo granularity: **PASS**, one pointer stroke is one transaction.
- Canvas receives the parsed `PatternDocument`; no demo model is connected to the workspace.
- Grid and 10×10 major grid: **PASS** by renderer audit and production screenshot.
- Symbols/colors/completed/selected-thread branches: **PASS** by renderer audit.
- Viewport culling: **PASS** for stitches through a row/cell index and calculated visible bounds. Backstitches are bounds-rejected but the current renderer still examines each backstitch record per frame.
- Retina sizing: **PASS**; backing dimensions use CSS size × DPR (capped at 2), while input remains in CSS coordinates.
- Zoom min/max: **PASS** at 4/96 pixels per cell.
- Zoom anchor, screen↔pattern transforms, and Zoom to Fit: **PASS**.
- Completed-state repaint after marking: **PASS** after adding the progress revision to render scheduling.

## PWA and network

- Manifest: **PASS**. Name, short name, relative start URL/scope, standalone display, theme/background colors, and an `any maskable` SVG icon are present.
- Service Worker registration/install/activate/cache/update: **PASS** by code audit and production browser run.
- Offline shell: **PASS**. Production was loaded on isolated localhost port 4187, the server was stopped, and reload displayed the start screen from cache.
- Offline Worker/parser: **PASS**. With the server still stopped, the real SAGA reopened and restored progress.
- Production console: **0 errors, 0 warnings** online and after offline reload.
- Network/privacy search: application code contains no XMLHttpRequest, Axios, WebSocket, sendBeacon, analytics, telemetry, or pattern/progress upload. `fetch` exists only in the Service Worker for same-origin static shell/assets.

Safari compatibility audit found no Chrome-only critical dependency. The app uses File/Blob, Web Worker, Web Crypto, IndexedDB, Service Worker/Cache, Pointer Events, and Canvas 2D. WebKit documents Pointer Events on iPadOS and Home Screen web apps, manifests, manifest icons, and Service Workers. Physical iPad behavior still requires the manual test described below. HTTP over a LAN IP is not a valid PWA/Web Crypto production environment; use HTTPS for iPad testing.

## Commands and results

```text
npm run lint
→ PASS, 0 errors, 0 warnings

npm test
→ PASS, 8 test files; 28 passed / 0 failed

npm run build
→ PASS, TypeScript and Vite production build completed

npm run qa:diagnostics
→ PASS, both real fixtures decoded through production parsePattern

npm run compare
→ PASS, same canonical pattern and exact stitch/backstitch ID sets

npm run test:e2e
→ NOT CONFIGURED; browser production smoke/offline tests were run directly instead
```

## Bugs found and fixed during this QA

1. Canvas completed-state did not repaint because a mutated Set retained its identity. Added explicit render revision dependency.
2. After a pinch ended with one finger remaining, MARK could resume without a fresh touch. Added suppression until all pointers are released.
3. Capacitive stylus/touch was blocked by default. Explicit MARK mode now enables the indistinguishable touch path by default while retaining the user setting.
4. Palette progress counters rescanned all stitches after every stroke. Added incremental total/completed per-thread counters.
5. `MarkingEngine.apply` accepted unknown IDs. It now ignores IDs absent from the parsed pattern.
6. Progress decoding checked only three fields. Added validation for identity, metadata, string IDs, viewport, display settings, and timestamps.
7. A corrupt IndexedDB record could prevent the pattern itself from opening. It now opens with fresh progress and a warning.
8. Autosave had no background lifecycle flush. Added `visibilitychange` and `pagehide` saves.
9. Viewport fields were serialized but live pan/zoom was not persisted. Transform state now updates stored zoom/center, restores it, and exposes Zoom to Fit.
10. ZIP entry/expanded-size limits were checked too late. Limits are now enforced inside the unzip filter before accepting entries.
11. NODE/BACK record counts had no explicit collection limit. Added two-million-record limits.
12. DIZE accepted version zero. Supported versions are now constrained to 1–3.
13. The opaque comma-expression used for DIZE backstitch type/material was replaced with explicit fields.
14. Root-level `.tsbuildinfo` artifacts were generated by clean builds. They now live under ignored `node_modules/.cache`.
15. SVG was incorrectly declared as a higher-priority `apple-touch-icon`. The override was removed so WebKit uses the manifest icon/fallback.

## Remaining issues

### BLOCKERS

None for beginning an iPad manual test over HTTPS.

### IMPORTANT

- Physical Apple Pencil, capacitive stylus, two-finger pinch, process eviction, and standalone-mode Blob download must be confirmed on the target iPad; desktop automation cannot prove hardware behavior.
- DIZE support is deliberately scoped to the observed version-3 core blocks and types, not the entire undocumented format family.
- Backstitches are bounds-tested but not spatially indexed; extremely line-heavy patterns may require a line index after profiling. The fixture has only 639 lines.

### MINOR

- The icon is SVG-only. Supported WebKit versions can use manifest icons and have a monogram fallback, but final Home Screen artwork should be visually checked on the target OS.
- There is no separately scripted browser E2E command yet; repeatable unit/integration coverage and the recorded production browser/offline run are the present QA evidence.

## Final verdict

**READY FOR IPAD MANUAL TESTING**, provided the build is served from an HTTPS origin.

Official WebKit references used for the compatibility check:

- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/
- https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/
