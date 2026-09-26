import { describe, expect, it } from 'vitest';
import { buildLegendGroups } from '../src/components/legend';
import type { PatternDocument } from '../src/model/pattern';

const pattern: PatternDocument = {
  metadata: { name: 'Legend' },
  dimensions: { width: 2, height: 2 },
  palette: [
    {
      id: 1,
      brand: 'DMC',
      number: '310',
      name: 'Black',
      color: { red: 0, green: 0, blue: 0 },
      symbol: '×',
    },
  ],
  stitches: [
    { id: 'full', x: 0, y: 0, threadID: 1, type: 'fullCross', subposition: 0 },
    { id: 'half', x: 1, y: 0, threadID: 1, type: 'halfCrossRight', subposition: 0 },
    { id: 'knot', x: 0, y: 1, threadID: 1, type: 'knot', subposition: 0 },
  ],
  backstitches: [{ id: 'back', startX2: 0, startY2: 0, endX2: 2, endY2: 2, threadID: 1 }],
  sourceFormat: 'saga',
  sourceFileHash: 'source',
  canonicalPatternHash: 'canonical',
  warnings: [],
};

describe('pattern legend', () => {
  it('separates one thread into stitch categories and counts progress per category', () => {
    const groups = buildLegendGroups(pattern, new Set(['full', 'knot']));

    expect(groups.map(({ kind, total }) => [kind, total])).toEqual([
      ['fullCross', 1],
      ['halfCrossRight', 1],
      ['knot', 1],
      ['backstitch', 1],
    ]);
    expect(groups.map(({ entries }) => entries[0].completed)).toEqual([1, 0, 1, undefined]);
  });
});
