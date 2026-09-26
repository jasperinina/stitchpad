import { describe, expect, it } from 'vitest';
import { canvasBackingSize } from '../src/renderer/canvas-renderer';
import {
  fitTransform,
  patternToScreen,
  screenToPattern,
  visibleCellBounds,
  zoomAt,
} from '../src/renderer/viewport';

describe('viewport', () => {
  it('round-trips coordinates', () => {
    const t = { scale: 20, offsetX: 13, offsetY: -7 },
      point = { x: 4.25, y: 9.5 },
      screen = patternToScreen(point.x, point.y, t);
    expect(screenToPattern(screen.x, screen.y, t)).toEqual(point);
  });
  it('keeps the zoom anchor fixed and clamps min/max', () => {
    const t = { scale: 10, offsetX: 0, offsetY: 0 },
      z = zoomAt(t, 2, 50, 50);
    expect(screenToPattern(50, 50, z)).toEqual({ x: 5, y: 5 });
    expect(zoomAt(t, 0.001, 0, 0).scale).toBe(4);
    expect(zoomAt(t, 1_000, 0, 0).scale).toBe(96);
  });
  it('fits the pattern and culls a large offscreen area', () => {
    const fit = fitTransform(100, 100, 1000, 800);
    expect(fit.scale).toBe(7.6);
    const bounds = visibleCellBounds(
      { scale: 20, offsetX: -10_000, offsetY: -20_000 },
      1000,
      800,
      10_000,
      10_000,
    );
    expect(bounds.right - bounds.left).toBeLessThan(60);
    expect(bounds.bottom - bounds.top).toBeLessThan(50);
  });
  it('uses Retina backing dimensions without changing CSS coordinates', () => {
    expect(canvasBackingSize(768, 1024, 2)).toEqual({ width: 1536, height: 2048, dpr: 2 });
    expect(canvasBackingSize(768, 1024, 3).dpr).toBe(2);
  });
});
