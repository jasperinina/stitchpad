import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parsePattern } from '../src/parsers';

describe('stable identity', () => {
  it('is repeatable across independent runs and filenames', async () => {
    const bytes = new Uint8Array(await readFile('Мурчащая осень.saga'));
    const [first, second, renamed] = await Promise.all([
      parsePattern(bytes, 'first.saga'),
      parsePattern(bytes, 'second.saga'),
      parsePattern(bytes, '/different/location/renamed.saga'),
    ]);
    expect(first.stitches.slice(0, 1000).map((stitch) => stitch.id)).toEqual(
      second.stitches.slice(0, 1000).map((stitch) => stitch.id),
    );
    expect(first.canonicalPatternHash).toBe(second.canonicalPatternHash);
    expect(first.canonicalPatternHash).toBe(renamed.canonicalPatternHash);
    expect(first.metadata.name).not.toBe(renamed.metadata.name);
  }, 30_000);
});
