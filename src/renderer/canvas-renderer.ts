import type { PatternDocument, RGB, Stitch, StitchKind } from '../model/pattern';
import type { DisplaySettings } from '../progress/progress';
import type { RowIndex } from './pattern-index';
import { visibleCellBounds, type ViewTransform } from './viewport';

const css = (c: RGB) => `rgb(${c.red} ${c.green} ${c.blue})`;
export interface RenderOptions {
  pattern: PatternDocument;
  index: RowIndex;
  transform: ViewTransform;
  completed: Set<string>;
  selectedThread?: number;
  selectedKind?: StitchKind;
  settings: DisplaySettings;
}
export const canvasBackingSize = (cssWidth: number, cssHeight: number, dpr: number) => ({
  width: Math.round(cssWidth * Math.min(dpr || 1, 2)),
  height: Math.round(cssHeight * Math.min(dpr || 1, 2)),
  dpr: Math.min(dpr || 1, 2),
});
export const matchesSelection = (
  threadID: number,
  kind: StitchKind,
  selectedThread?: number,
  selectedKind?: StitchKind,
) =>
  selectedThread === undefined ||
  (selectedThread === threadID && (selectedKind === undefined || selectedKind === kind));

export function renderPattern(canvas: HTMLCanvasElement, options: RenderOptions) {
  const rect = canvas.getBoundingClientRect(),
    backing = canvasBackingSize(rect.width, rect.height, devicePixelRatio),
    dpr = backing.dpr;
  if (canvas.width !== backing.width || canvas.height !== backing.height) {
    canvas.width = backing.width;
    canvas.height = backing.height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#f3efe4';
  ctx.fillRect(0, 0, rect.width, rect.height);
  const { transform: t, pattern, settings } = options,
    { left, top, right, bottom } = visibleCellBounds(
      t,
      rect.width,
      rect.height,
      pattern.dimensions.width,
      pattern.dimensions.height,
    );
  ctx.save();
  ctx.translate(t.offsetX, t.offsetY);
  ctx.scale(t.scale, t.scale);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, pattern.dimensions.width, pattern.dimensions.height);
  for (let y = top; y < bottom; y++) {
    const row = options.index.get(y);
    if (!row) continue;
    for (const [x, stitches] of row)
      if (x >= left && x <= right)
        for (const stitch of stitches) drawStitch(ctx, stitch, options, t.scale);
  }
  ctx.lineWidth = Math.max(0.04, 1 / t.scale);
  if (settings.showGrid && t.scale >= 8) {
    ctx.beginPath();
    for (let x = left; x <= right; x++) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = top; y <= bottom; y++) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.strokeStyle = 'rgba(49,57,49,.18)';
    ctx.stroke();
  }
  if (settings.showMajorGrid) {
    ctx.beginPath();
    for (let x = Math.ceil(left / 10) * 10; x <= right; x += 10) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = Math.ceil(top / 10) * 10; y <= bottom; y += 10) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.lineWidth = Math.max(0.08, 1.5 / t.scale);
    ctx.strokeStyle = 'rgba(38,53,47,.5)';
    ctx.stroke();
  }
  for (const line of pattern.backstitches) {
    const minX = Math.min(line.startX2, line.endX2) / 2,
      maxX = Math.max(line.startX2, line.endX2) / 2,
      minY = Math.min(line.startY2, line.endY2) / 2,
      maxY = Math.max(line.startY2, line.endY2) / 2;
    if (maxX < left || minX > right || maxY < top || minY > bottom) continue;
    const thread = pattern.palette.find((p) => p.id === line.threadID);
    const focused = matchesSelection(
      line.threadID,
      'backstitch',
      options.selectedThread,
      options.selectedKind,
    );
    ctx.beginPath();
    ctx.moveTo(line.startX2 / 2, line.startY2 / 2);
    ctx.lineTo(line.endX2 / 2, line.endY2 / 2);
    ctx.lineWidth = Math.max(0.1, 2 / t.scale);
    ctx.strokeStyle = thread ? css(thread.color) : '#202020';
    ctx.globalAlpha = focused
      ? 1
      : settings.mode === 'selectedThreadFocus'
        ? 1 - settings.dimOthers
        : 0.45;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawStitch(
  ctx: CanvasRenderingContext2D,
  stitch: Stitch,
  o: RenderOptions,
  scale: number,
) {
  const thread = o.pattern.palette.find((p) => p.id === stitch.threadID);
  if (!thread) return;
  const done = o.completed.has(stitch.id);
  if (done && o.settings.completedAppearance === 'hide') return;
  const focused = matchesSelection(stitch.threadID, stitch.type, o.selectedThread, o.selectedKind);
  ctx.globalAlpha =
    done && o.settings.completedAppearance === 'dim'
      ? 0.2
      : focused
        ? 1
        : o.settings.mode === 'selectedThreadFocus'
          ? 1 - o.settings.dimOthers
          : 0.45;
  ctx.fillStyle = o.settings.mode === 'symbols' ? '#fffdf7' : css(thread.color);
  if (stitch.type === 'halfCrossRight' || stitch.type === 'halfCrossLeft') {
    ctx.beginPath();
    ctx.moveTo(stitch.x + 0.06, stitch.y + 0.94);
    if (stitch.type === 'halfCrossRight') {
      ctx.lineTo(stitch.x + 0.94, stitch.y + 0.06);
      ctx.lineTo(stitch.x + 0.94, stitch.y + 0.94);
    } else {
      ctx.lineTo(stitch.x + 0.06, stitch.y + 0.06);
      ctx.lineTo(stitch.x + 0.94, stitch.y + 0.94);
    }
    ctx.closePath();
    ctx.fill();
  } else if (stitch.type === 'knot') {
    const dx = stitch.subposition & 1 ? 0.72 : 0.28,
      dy = stitch.subposition & 2 ? 0.72 : 0.28;
    ctx.beginPath();
    ctx.arc(stitch.x + dx, stitch.y + dy, 0.19, 0, Math.PI * 2);
    ctx.fill();
  } else ctx.fillRect(stitch.x + 0.05, stitch.y + 0.05, 0.9, 0.9);
  if (o.settings.mode !== 'colors' && stitch.type !== 'knot' && scale >= 13) {
    ctx.globalAlpha *= 0.95;
    ctx.fillStyle =
      o.settings.mode === 'symbols' ||
      (thread.color.red * 299 + thread.color.green * 587 + thread.color.blue * 114) / 1000 > 145
        ? '#18201c'
        : '#fffdf7';
    ctx.font = '.58px ui-rounded, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(thread.symbol, stitch.x + 0.5, stitch.y + 0.53);
  }
  if (done && o.settings.completedAppearance === 'overlay') {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#f7f3e9';
    ctx.fillRect(stitch.x + 0.31, stitch.y + 0.31, 0.38, 0.38);
  }
  ctx.globalAlpha = 1;
}
