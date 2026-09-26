export type SourceFormat = 'saga' | 'dize';
export type StitchType =
  | 'fullCross'
  | 'halfCrossRight'
  | 'halfCrossLeft'
  | 'quarter'
  | 'threeQuarter'
  | 'petite'
  | 'knot'
  | 'bead'
  | 'special'
  | 'unknown';
export type StitchKind = StitchType | 'backstitch';

export interface StrandCounts {
  fullCross?: number;
  halfCross?: number;
  quarter?: number;
  backstitch?: number;
  knot?: number;
  petite?: number;
  special?: number;
  straight?: number;
}

export interface RGB {
  red: number;
  green: number;
  blue: number;
}
export interface PatternThread {
  id: number;
  brand: string;
  number: string;
  name: string;
  color: RGB;
  symbol: string;
  strands?: StrandCounts;
}
export interface Stitch {
  id: string;
  x: number;
  y: number;
  threadID: number;
  type: StitchType;
  subposition: number;
}
export interface Backstitch {
  id: string;
  startX2: number;
  startY2: number;
  endX2: number;
  endY2: number;
  threadID: number;
}
export interface FabricInfo {
  count?: number;
  name?: string;
  color?: RGB;
}
export interface PatternDocument {
  metadata: { name: string; designer?: string; copyright?: string };
  dimensions: { width: number; height: number };
  palette: PatternThread[];
  stitches: Stitch[];
  backstitches: Backstitch[];
  fabric?: FabricInfo;
  sourceFormat: SourceFormat;
  sourceFileHash: string;
  canonicalPatternHash: string;
  warnings: string[];
}

export const rgbFromInt = (rgb: number): RGB => ({
  red: (rgb >>> 16) & 255,
  green: (rgb >>> 8) & 255,
  blue: rgb & 255,
});
export const rgbInt = (color: RGB): number => (color.red << 16) | (color.green << 8) | color.blue;
export const stitchID = (
  x: number,
  y: number,
  type: StitchType,
  threadID: number,
  subposition = 0,
) => `${x}:${y}:${type}:${threadID}:${subposition}`;
export const makeStitch = (
  x: number,
  y: number,
  type: StitchType,
  threadID: number,
  subposition = 0,
): Stitch => ({
  id: stitchID(x, y, type, threadID, subposition),
  x,
  y,
  type,
  threadID,
  subposition,
});
export const makeBackstitch = (
  startX2: number,
  startY2: number,
  endX2: number,
  endY2: number,
  threadID: number,
): Backstitch => ({
  id: `back:${startX2}:${startY2}:${endX2}:${endY2}:${threadID}`,
  startX2,
  startY2,
  endX2,
  endY2,
  threadID,
});

export function validatePattern(pattern: PatternDocument): void {
  const { width, height } = pattern.dimensions;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 10_000 ||
    height > 10_000
  )
    throw new Error('Недопустимый размер схемы');
  if (
    pattern.palette.length > 4096 ||
    pattern.stitches.length > 5_000_000 ||
    pattern.backstitches.length > 2_000_000
  )
    throw new Error('Файл превышает безопасные ограничения');
}
