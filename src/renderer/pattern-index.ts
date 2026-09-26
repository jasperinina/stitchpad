import type { PatternDocument, Stitch } from '../model/pattern';
export type RowIndex = Map<number, Map<number, Stitch[]>>;
export function buildRowIndex(pattern: PatternDocument): RowIndex {
  const rows: RowIndex = new Map();
  for (const stitch of pattern.stitches) {
    const row = rows.get(stitch.y) ?? new Map<number, Stitch[]>();
    const cell = row.get(stitch.x) ?? [];
    cell.push(stitch);
    row.set(stitch.x, cell);
    rows.set(stitch.y, row);
  }
  return rows;
}
export function stitchesAt(index: RowIndex, x: number, y: number) {
  return index.get(y)?.get(x) ?? [];
}
