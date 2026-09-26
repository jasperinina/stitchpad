# SAGA format notes

These notes document only what the bundled fixture requires. They are not a claim of a complete vendor specification.

## Container and XPUB

SAGA is a ZIP archive. `hoops.xpub` contains palette/fabric metadata and `hoop_N.xpub` contains sheet geometry. XPUB content is whitespace-tolerant Base64 followed by AES-256-CBC with PKCS#7 padding. The interoperable legacy key and IV are isolated in `src/parsers/saga/saga-parser.ts`; they are format constants, not user secrets.

The parser deliberately ignores the embedded proprietary symbol font. UI symbols come from a neutral local set.

## Mappings

- `Properties.size_x/size_y` → dimensions.
- `color.ColorUID` and its `concrete_color` child → palette entry.
- `block` → stitch; `full_cross`, `half_cross_right`, `half_cross_left`, `pinch`, and `petite` are recognized.
- Fractional `pinch` coordinates are stored at half-cell precision and converted to cell + subposition.
- `Lines ColorUID` owns nested `line type="back"` records. Endpoints retain half-cell integer precision.

ZIP entry count, expanded size, dimensions, palette, and object counts are bounded before large allocations.
