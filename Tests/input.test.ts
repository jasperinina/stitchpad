import { describe, expect, it } from 'vitest';
import { interpolatedCells, selectMarkable, shouldMarkPointer } from '../src/input/marking';

describe('input safety', () => {
  it('never marks in VIEW and supports touch/capacitive stylus in MARK', () => {
    expect(shouldMarkPointer('view', 'touch', true, false)).toBe(false);
    expect(shouldMarkPointer('mark', 'touch', true, false)).toBe(true);
    expect(shouldMarkPointer('mark', 'pen', false, false)).toBe(true);
  });
  it('suppresses marking for the remainder of a multi-touch gesture', () =>
    expect(shouldMarkPointer('mark', 'touch', true, true)).toBe(false));
  it('interpolates every cell on a fast drag', () =>
    expect(interpolatedCells({ x: 1, y: 2 }, { x: 8, y: 2 }).map((cell) => cell.x)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]));
  it('filters to the selected thread', () =>
    expect(selectMarkable([{ threadID: 1 }, { threadID: 2 }], true, 2)).toEqual([{ threadID: 2 }]));
});
