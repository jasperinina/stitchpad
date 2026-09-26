import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PatternDocument } from '../src/model/pattern';
import { parsePattern } from '../src/parsers';
import {
  decodeProgress,
  encodeProgress,
  MarkingEngine,
  newProgress,
  progressCompatibility,
  sanitizeProgress,
} from '../src/progress/progress';

let pattern: PatternDocument;
beforeAll(async () => {
  pattern = await parsePattern(new Uint8Array(await readFile('Мурчащая осень.dize')), 'real.dize');
}, 30_000);

describe('progress on the real pattern', () => {
  it('marks exactly 100, ignores duplicates, and unmarks 25 with incremental counters', () => {
    const engine = new MarkingEngine(pattern),
      ids = pattern.stitches.slice(0, 100).map((stitch) => stitch.id);
    expect(engine.apply(ids, 'mark')).toBe(100);
    expect(engine.overall).toEqual({
      total: 9661,
      completed: 100,
      remaining: 9561,
      percentage: 100 / 9661,
    });
    expect(engine.apply(ids, 'mark')).toBe(0);
    expect(engine.completed.size).toBe(100);
    engine.apply(ids.slice(0, 25), 'unmark');
    expect(engine.overall.completed).toBe(75);
    const expectedByThread = pattern.stitches
      .slice(25, 100)
      .reduce<Map<number, number>>(
        (map, stitch) => map.set(stitch.threadID, (map.get(stitch.threadID) ?? 0) + 1),
        new Map(),
      );
    for (const [thread, count] of expectedByThread)
      expect(engine.counters(thread).completed).toBe(count);
  });

  it('undoes and redoes one multi-stitch stroke as one transaction', () => {
    const engine = new MarkingEngine(pattern),
      stroke = pattern.stitches.slice(300, 318).map((stitch) => stitch.id);
    engine.apply(stroke, 'mark');
    expect(engine.overall.completed).toBe(18);
    expect(engine.undo()).toBe(true);
    expect(engine.overall.completed).toBe(0);
    expect(engine.redo()).toBe(true);
    expect(engine.overall.completed).toBe(18);
  });

  it('round-trips 100 IDs and all persisted UI state', () => {
    const progress = newProgress(pattern);
    progress.completedStitchIDs = pattern.stitches.slice(500, 600).map((stitch) => stitch.id);
    progress.selectedThreadID = 12;
    progress.selectedStitchKind = 'knot';
    progress.viewport = { zoom: 17, centerX: 42.5, centerY: 37.25 };
    progress.displaySettings = { ...progress.displaySettings, mode: 'symbols', showGrid: false };
    const restored = decodeProgress(encodeProgress(progress));
    expect(restored.completedStitchIDs).toEqual(progress.completedStitchIDs);
    expect(restored.selectedThreadID).toBe(12);
    expect(restored.selectedStitchKind).toBe('knot');
    expect(restored.viewport).toEqual(progress.viewport);
    expect(restored.displaySettings).toEqual(progress.displaySettings);
  });

  it('rejects a wrong pattern and sanitizes unknown IDs', () => {
    const progress = newProgress(pattern);
    expect(
      progressCompatibility(
        { ...progress, sourceFileHash: 'wrong', canonicalPatternHash: 'wrong' },
        pattern,
      ),
    ).toBe('mismatch');
    progress.completedStitchIDs = [pattern.stitches[0].id, 'not-a-real-stitch'];
    const clean = sanitizeProgress(progress, pattern);
    expect(clean.ignored).toBe(1);
    expect(clean.progress.completedStitchIDs).toEqual([pattern.stitches[0].id]);
  });

  it.each([
    ['', 'Unexpected end'],
    ['{broken', 'Expected'],
    [JSON.stringify({ format: 'StitchPadProgress', schemaVersion: 1 }), 'identity'],
    [JSON.stringify({ format: 'StitchPadProgress', schemaVersion: 99 }), '99'],
  ])('rejects corrupted progress without crashing', (text, message) =>
    expect(() => decodeProgress(text)).toThrow(message),
  );
  it('rejects non-string completed IDs', () =>
    expect(() =>
      decodeProgress(JSON.stringify({ ...newProgress(pattern), completedStitchIDs: [42] })),
    ).toThrow('список'));
});
