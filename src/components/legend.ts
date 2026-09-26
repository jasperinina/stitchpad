import type { PatternDocument, PatternThread, StitchType } from '../model/pattern';

export type LegendKind = StitchType | 'backstitch';

export interface LegendEntry {
  thread: PatternThread;
  total: number;
  completed?: number;
}

export interface LegendGroup {
  kind: LegendKind;
  label: string;
  total: number;
  entries: LegendEntry[];
}

const kinds: { kind: LegendKind; label: string }[] = [
  { kind: 'fullCross', label: 'Полный крест' },
  { kind: 'halfCrossRight', label: 'Полукрест /' },
  { kind: 'halfCrossLeft', label: 'Полукрест \\' },
  { kind: 'quarter', label: 'Четверть креста' },
  { kind: 'threeQuarter', label: 'Три четверти креста' },
  { kind: 'petite', label: 'Петит' },
  { kind: 'knot', label: 'Французский узелок' },
  { kind: 'bead', label: 'Бисер' },
  { kind: 'special', label: 'Специальный стежок' },
  { kind: 'backstitch', label: 'Бэкстич' },
  { kind: 'unknown', label: 'Неизвестный тип' },
];

export function buildLegendGroups(
  pattern: PatternDocument,
  completed: ReadonlySet<string>,
): LegendGroup[] {
  const threads = new Map(pattern.palette.map((thread) => [thread.id, thread]));
  const totals = new Map<LegendKind, Map<number, number>>();
  const completedTotals = new Map<StitchType, Map<number, number>>();

  for (const stitch of pattern.stitches) {
    const byThread = totals.get(stitch.type) ?? new Map<number, number>();
    byThread.set(stitch.threadID, (byThread.get(stitch.threadID) ?? 0) + 1);
    totals.set(stitch.type, byThread);
    if (completed.has(stitch.id)) {
      const completedByThread = completedTotals.get(stitch.type) ?? new Map<number, number>();
      completedByThread.set(stitch.threadID, (completedByThread.get(stitch.threadID) ?? 0) + 1);
      completedTotals.set(stitch.type, completedByThread);
    }
  }

  const backstitches = new Map<number, number>();
  for (const stitch of pattern.backstitches)
    backstitches.set(stitch.threadID, (backstitches.get(stitch.threadID) ?? 0) + 1);
  totals.set('backstitch', backstitches);

  return kinds.flatMap(({ kind, label }) => {
    const byThread = totals.get(kind);
    if (!byThread?.size) return [];
    const entries = [...byThread.entries()]
      .flatMap(([threadID, total]) => {
        const thread = threads.get(threadID);
        if (!thread) return [];
        return [
          {
            thread,
            total,
            completed:
              kind === 'backstitch' ? undefined : (completedTotals.get(kind)?.get(threadID) ?? 0),
          },
        ];
      })
      .sort((a, b) => a.thread.id - b.thread.id);
    return entries.length
      ? [{ kind, label, entries, total: entries.reduce((sum, entry) => sum + entry.total, 0) }]
      : [];
  });
}
