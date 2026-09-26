import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it } from 'vitest';
import { parsePattern } from '../src/parsers';
import {
  loadLastPattern,
  loadProgress,
  saveLastPattern,
  saveProgress,
} from '../src/persistence/database';
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

  it('stores the last pattern file locally and recreates it for the next launch', async () => {
    const bytes = await readFile('Мурчащая осень.dize');
    const original = new File([bytes], 'Мурчащая осень.dize', {
      type: 'application/octet-stream',
      lastModified: 123,
    });

    await saveLastPattern(original);
    const restored = await loadLastPattern();

    expect(restored?.name).toBe(original.name);
    expect(restored?.type).toBe(original.type);
    expect(restored?.lastModified).toBe(original.lastModified);
    expect(new Uint8Array(await restored!.arrayBuffer())).toEqual(new Uint8Array(bytes));
  });

  it('upgrades the existing progress database without losing saved progress', async () => {
    const pattern = await parsePattern(
      new Uint8Array(await readFile('Мурчащая осень.dize')),
      'real.dize',
    );
    const progress = newProgress(pattern);
    progress.completedStitchIDs = pattern.stitches.slice(0, 12).map((stitch) => stitch.id);

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('stitchpad', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('progress', { keyPath: 'canonicalPatternHash' });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('progress', 'readwrite');
        tx.objectStore('progress').put(progress);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const restored = await loadProgress(pattern.canonicalPatternHash);
    expect(restored?.completedStitchIDs).toEqual(progress.completedStitchIDs);
    expect(await loadLastPattern()).toBeUndefined();
  });
});
