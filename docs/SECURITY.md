# Privacy and security model

- Pattern bytes are parsed in a dedicated Web Worker and are never intentionally transmitted.
- The app has no analytics, accounts, backend API, CDN font, or remote image dependency.
- Progress is stored in the browser's IndexedDB under the canonical pattern hash.
- `.stitchprogress` is plain, inspectable versioned JSON. Import validates format/version, pattern identity, and stitch IDs.
- Parsers reject unsupported headers/versions, truncated inputs, oversized expanded blocks, unreasonable dimensions, and excessive record counts.
- A PWA origin can still be affected by browser storage eviction. Export progress periodically for durable backup.
