# DIZE format notes

These notes cover the observed version 3 fixture.

## Framing

The file begins with ASCII `DIZE`, a big-endian `u16` version, and `u16` encoding. Each block is `tag[4]`, `u16 blockVersion`, `u32 rawSize`, `u32 storedSize`, payload. Encoding 2 XORs the stored payload with repeating ASCII `CrossStitchParadise`, then uses zlib. Duplicate tags are preserved; the first full `MATS` block is authoritative.

## Blocks

- `PTRN`: signature string, width and height.
- `FBRK`: fabric count, color and name.
- `MATS`: thread records plus length-framed `STRN`, `SYMB`, `NOTE`, and optional `BLND` children.
- `STCH`: count then `(x, y, type, material)` as four big-endian `i16` values.
- `NODE`: knots at half-cell coordinates.
- `BACK`: count then six `i16` values: start/end half-cell coordinates, type, material.

Unknown stitch types remain `unknown`; unknown top-level blocks are retained only during container parsing and safely skipped. Raw/expanded block sizes and collection counts are bounded.
