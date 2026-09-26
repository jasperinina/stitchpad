import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it } from 'vitest';
import { parsePattern } from '../src/parsers';
import { loadProgress, saveProgress } from '../src/persistence/database';
import { newProgress } from '../src/progress/progress';

describe('IndexedDB persistence implementation', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('stitchpad');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  it('restores progress after state recreation', async () => {
    const pattern = await parsePattern(
      new Uint8Array(await readFile('Мурчащая осень.dize')),
      'real.dize',
    );
    const progress = newProgress(pattern);
    progress.completedStitchIDs = pattern.stitches.slice(0, 100).map((stitch) => stitch.id);
    progress.selectedThreadID = 7;
    await saveProgress(progress);
    const restored = await loadProgress(pattern.canonicalPatternHash);
    expect(restored?.completedStitchIDs).toEqual(progress.completedStitchIDs);
    expect(restored?.selectedThreadID).toBe(7);
  });
});
