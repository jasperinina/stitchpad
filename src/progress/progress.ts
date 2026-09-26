import type { PatternDocument } from '../model/pattern';

export type DisplayMode = 'symbols' | 'colors' | 'symbolsAndColors' | 'selectedThreadFocus';
export type CompletedAppearance = 'dim' | 'overlay' | 'hide';
export type MarkMode = 'mark' | 'unmark' | 'toggle';
export interface ViewportState {
  zoom: number;
  centerX: number;
  centerY: number;
}
export interface DisplaySettings {
  mode: DisplayMode;
  dimOthers: number;
  completedAppearance: CompletedAppearance;
  showGrid: boolean;
  showMajorGrid: boolean;
  allowFingerMarking: boolean;
  onlyMarkSelectedThread: boolean;
  autosave: boolean;
  restoreViewport: boolean;
}
export interface StitchProgress {
  format: 'StitchPadProgress';
  schemaVersion: 1;
  sourceFileHash: string;
  canonicalPatternHash: string;
  patternMetadata: { name: string; width: number; height: number };
  completedStitchIDs: string[];
  selectedThreadID?: number;
  viewport: ViewportState;
  displaySettings: DisplaySettings;
  createdAt: string;
  modifiedAt: string;
}
export const defaultSettings: DisplaySettings = {
  mode: 'symbolsAndColors',
  dimOthers: 0.78,
  completedAppearance: 'dim',
  showGrid: true,
  showMajorGrid: true,
  // Capacitive styluses are reported as touch, so explicit MARK mode must work for touch by default.
  allowFingerMarking: true,
  onlyMarkSelectedThread: true,
  autosave: true,
  restoreViewport: true,
};
export function newProgress(pattern: PatternDocument): StitchProgress {
  const now = new Date().toISOString();
  return {
    format: 'StitchPadProgress',
    schemaVersion: 1,
    sourceFileHash: pattern.sourceFileHash,
    canonicalPatternHash: pattern.canonicalPatternHash,
    patternMetadata: { name: pattern.metadata.name, ...pattern.dimensions },
    completedStitchIDs: [],
    selectedThreadID: pattern.palette[0]?.id,
    viewport: {
      zoom: 1,
      centerX: pattern.dimensions.width / 2,
      centerY: pattern.dimensions.height / 2,
    },
    displaySettings: { ...defaultSettings },
    createdAt: now,
    modifiedAt: now,
  };
}
export function validateProgress(value: unknown): StitchProgress {
  if (!value || typeof value !== 'object') throw new Error('Повреждён progress document');
  const candidate = value as Partial<StitchProgress>;
  if (candidate.format !== 'StitchPadProgress') throw new Error('Это не файл StitchPad Progress');
  if (candidate.schemaVersion !== 1)
    throw new Error(`Версия прогресса ${String(candidate.schemaVersion)} не поддерживается`);
  if (!candidate.sourceFileHash || !candidate.canonicalPatternHash)
    throw new Error('В progress отсутствует identity схемы');
  if (!candidate.patternMetadata || typeof candidate.patternMetadata.name !== 'string')
    throw new Error('В progress отсутствуют metadata схемы');
  if (
    !Array.isArray(candidate.completedStitchIDs) ||
    candidate.completedStitchIDs.some((id) => typeof id !== 'string')
  )
    throw new Error('Повреждён список выполненных стежков');
  if (
    !candidate.viewport ||
    !Number.isFinite(candidate.viewport.zoom) ||
    !Number.isFinite(candidate.viewport.centerX) ||
    !Number.isFinite(candidate.viewport.centerY)
  )
    throw new Error('Повреждено состояние viewport');
  if (
    !candidate.displaySettings ||
    !['symbols', 'colors', 'symbolsAndColors', 'selectedThreadFocus'].includes(
      candidate.displaySettings.mode,
    )
  )
    throw new Error('Повреждены настройки отображения');
  if (!candidate.createdAt || !candidate.modifiedAt)
    throw new Error('В progress отсутствуют timestamps');
  return candidate as StitchProgress;
}
export function decodeProgress(text: string): StitchProgress {
  return validateProgress(JSON.parse(text));
}
export function progressCompatibility(
  progress: StitchProgress,
  pattern: PatternDocument,
): 'exact' | 'canonical' | 'mismatch' {
  return progress.sourceFileHash === pattern.sourceFileHash
    ? 'exact'
    : progress.canonicalPatternHash === pattern.canonicalPatternHash
      ? 'canonical'
      : 'mismatch';
}
export function sanitizeProgress(progress: StitchProgress, pattern: PatternDocument) {
  const known = new Set(pattern.stitches.map((s) => s.id));
  const ids = [...new Set(progress.completedStitchIDs)].filter((id) => known.has(id));
  return {
    progress: { ...progress, completedStitchIDs: ids },
    ignored: progress.completedStitchIDs.length - ids.length,
  };
}
export function encodeProgress(progress: StitchProgress) {
  return JSON.stringify({ ...progress, modifiedAt: new Date().toISOString() }, null, 2);
}

export class MarkingEngine {
  readonly completed: Set<string>;
  readonly totalByThread = new Map<number, number>();
  readonly completedByThread = new Map<number, number>();
  private readonly threadByStitch = new Map<string, number>();
  private undoStack: { added: string[]; removed: string[] }[] = [];
  private redoStack: { added: string[]; removed: string[] }[] = [];
  constructor(
    readonly pattern: PatternDocument,
    ids: Iterable<string> = [],
  ) {
    for (const stitch of pattern.stitches) {
      this.threadByStitch.set(stitch.id, stitch.threadID);
      this.totalByThread.set(stitch.threadID, (this.totalByThread.get(stitch.threadID) ?? 0) + 1);
    }
    this.completed = new Set([...ids].filter((id) => this.threadByStitch.has(id)));
    for (const id of this.completed) this.adjustThread(id, 1);
  }
  apply(ids: Iterable<string>, mode: MarkMode) {
    const added: string[] = [],
      removed: string[] = [];
    for (const id of new Set(ids)) {
      if (!this.threadByStitch.has(id)) continue;
      const has = this.completed.has(id),
        should = mode === 'mark' || (mode === 'toggle' && !has);
      if (should && !has) {
        this.completed.add(id);
        this.adjustThread(id, 1);
        added.push(id);
      } else if (!should && has) {
        this.completed.delete(id);
        this.adjustThread(id, -1);
        removed.push(id);
      }
    }
    if (added.length || removed.length) {
      this.undoStack.push({ added, removed });
      this.redoStack = [];
    }
    return added.length + removed.length;
  }
  undo() {
    const tx = this.undoStack.pop();
    if (!tx) return false;
    tx.added.forEach((id) => {
      this.completed.delete(id);
      this.adjustThread(id, -1);
    });
    tx.removed.forEach((id) => {
      this.completed.add(id);
      this.adjustThread(id, 1);
    });
    this.redoStack.push(tx);
    return true;
  }
  redo() {
    const tx = this.redoStack.pop();
    if (!tx) return false;
    tx.added.forEach((id) => {
      this.completed.add(id);
      this.adjustThread(id, 1);
    });
    tx.removed.forEach((id) => {
      this.completed.delete(id);
      this.adjustThread(id, -1);
    });
    this.undoStack.push(tx);
    return true;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get overall() {
    const total = this.threadByStitch.size,
      completed = this.completed.size;
    return {
      total,
      completed,
      remaining: total - completed,
      percentage: total ? completed / total : 0,
    };
  }
  counters(threadID: number) {
    const total = this.totalByThread.get(threadID) ?? 0,
      completed = this.completedByThread.get(threadID) ?? 0;
    return {
      total,
      completed,
      remaining: total - completed,
      percentage: total ? completed / total : 0,
    };
  }
  private adjustThread(id: string, delta: number) {
    const thread = this.threadByStitch.get(id);
    if (thread !== undefined)
      this.completedByThread.set(thread, (this.completedByThread.get(thread) ?? 0) + delta);
  }
}
