import type { StitchKind, StitchType } from '../model/pattern';

export interface GridCell {
  x: number;
  y: number;
}

export function interpolatedCells(from: GridCell | undefined, to: GridCell): GridCell[] {
  if (!from) return [to];
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: Math.round(from.x + ((to.x - from.x) * index) / steps),
    y: Math.round(from.y + ((to.y - from.y) * index) / steps),
  }));
}

export function shouldMarkPointer(
  interaction: 'view' | 'mark',
  pointerType: string,
  allowFingerMarking: boolean,
  multiTouchSuppressed: boolean,
) {
  if (interaction !== 'mark' || multiTouchSuppressed) return false;
  return pointerType !== 'touch' || allowFingerMarking;
}

export function selectMarkable<T extends { threadID: number; type: StitchType }>(
  stitches: T[],
  onlySelectedThread: boolean,
  selectedThread?: number,
  selectedKind?: StitchKind,
): T[] {
  return onlySelectedThread
    ? stitches.filter(
        (stitch) =>
          stitch.threadID === selectedThread &&
          (selectedKind === undefined || stitch.type === selectedKind),
      )
    : stitches;
}
