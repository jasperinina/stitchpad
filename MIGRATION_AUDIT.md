# StitchPad Web migration audit

Audit date: 2026-09-25. The directory is not a Git repository, so there is no history or pre-existing commit state to preserve.

## KEEP

- `Мурчащая осень.saga` and `Мурчащая осень.dize`: original, read-only fixtures. Both describe the same 101 × 101 pattern.
- Confirmed reverse-engineering knowledge captured below and in `docs/SAGA_FORMAT.md` / `docs/DIZE_FORMAT.md`.

## PORT

- `Sources/StitchPadCore/AES256CBC.swift`: SAGA XPUB Base64 + AES-256-CBC/PKCS#7 decoding. Port to Web Crypto.
- `Sources/StitchPadCore/ZipReader.swift` and `Zlib.swift`: ZIP central directory and raw DEFLATE extraction. Port using `fflate` with strict limits.
- `Sources/StitchPadCore/SagaParser.swift`: `hoops.xpub` palette/fabric and `hoop_N.xpub` stitch/backstitch XML parsing. Port to TypeScript/DOMParser.
- `Sources/StitchPadCore/DizeParser.swift`: DIZE block framing, XOR + zlib, palette/stitch/backstitch/knot parsing. Port to TypeScript.
- `Sources/StitchPadCore/Models.swift`, `Hashing.swift`: canonical model, deterministic stitch IDs, source/canonical SHA-256. Port to TypeScript.
- `Sources/StitchPadCore/Progress.swift`: versioned progress JSON, validation, incremental counters, external backup concept. Port to IndexedDB + `.stitchprogress`.
- `Tests/StitchPadCoreTests/ParserTests.swift`: known fixture counts and cross-format equivalence assertions. Port to Vitest.
- `Sources/PatternInspector/main.swift`: diagnostics concept. Port to `tools/inspect.ts` and `tools/compare.ts`.

## ARCHIVE

- None. This was a fresh, uncommitted Swift package created during the immediately preceding implementation attempt, not a released native application or Xcode project.

## DELETE (completed after TypeScript verification)

- `Package.swift`, `Sources/`, `Tests/`: removed after the TypeScript parser/progress suite passed.
- `.build/`: removed SwiftPM build output.

## UNKNOWN

- No older Xcode project, native app UI, normalized JSON, format docs, historical progress files, or prior tool scripts were present at audit time.

## Confirmed reusable findings

- SAGA is a ZIP containing Base64 AES-256-CBC encrypted XPUB XML plus an embedded symbol TTF. The neutral web symbol set must not redistribute that font.
- DIZE starts with `DIZE`, version `3`, encoding `2`, then named big-endian blocks. Stored payloads are XORed with the repeating ASCII key `CrossStitchParadise` and zlib-compressed.
- Fixture equivalence: 101 × 101, 43 palette entries, 8,979 full crosses, 651 right half-crosses, 31 knots (`pinch`/`NODE`), and 639 backstitches.

## Completion update

Migration completed. The production PWA builds successfully, ESLint passes, and Vitest validates both real fixtures, canonical cross-format equivalence, progress codecs/transactions, and viewport transforms. The obsolete Swift package was then removed.
