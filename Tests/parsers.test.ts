import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parsePattern } from '../src/parsers';

describe('real pattern fixtures', () => {
  it('parses SAGA and DIZE into the same canonical pattern', async () => {
    const [sagaBytes, dizeBytes] = await Promise.all([
      readFile('Мурчащая осень.saga'),
      readFile('Мурчащая осень.dize'),
    ]);
    const [saga, dize] = await Promise.all([
      parsePattern(new Uint8Array(sagaBytes), 'Мурчащая осень.saga'),
      parsePattern(new Uint8Array(dizeBytes), 'Мурчащая осень.dize'),
    ]);
    for (const pattern of [saga, dize]) {
      expect(pattern.dimensions).toEqual({ width: 101, height: 101 });
      expect(pattern.palette).toHaveLength(43);
      expect(pattern.stitches.filter((s) => s.type === 'fullCross')).toHaveLength(8979);
      expect(pattern.stitches.filter((s) => s.type === 'halfCrossRight')).toHaveLength(651);
      expect(pattern.stitches.filter((s) => s.type === 'knot')).toHaveLength(31);
      expect(pattern.backstitches).toHaveLength(639);
    }
    expect(new Set(saga.stitches.map((s) => s.id))).toEqual(
      new Set(dize.stitches.map((s) => s.id)),
    );
    expect(new Set(saga.backstitches.map((s) => s.id))).toEqual(
      new Set(dize.backstitches.map((s) => s.id)),
    );
    expect(saga.sourceFileHash).not.toBe(dize.sourceFileHash);
    expect(saga.canonicalPatternHash).toBe(dize.canonicalPatternHash);
    expect(saga.canonicalPatternHash).toBe(
      'bb043f4b18cd6a542ff614b0a0a606bb12719ae4e6417ba759b4448749886ae1',
    );
  }, 30_000);

  it('rejects unknown data', async () => {
    await expect(parsePattern(new Uint8Array(16), 'bad.bin')).rejects.toThrow(
      'Поддерживаются только',
    );
  });
});
