import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatternDocument } from '../model/pattern';
import type { DisplaySettings, MarkMode, ViewportState } from '../progress/progress';
import { interpolatedCells, selectMarkable, shouldMarkPointer } from '../input/marking';
import { buildRowIndex, stitchesAt } from '../renderer/pattern-index';
import { renderPattern } from '../renderer/canvas-renderer';
import { fitTransform, screenToPattern, zoomAt, type ViewTransform } from '../renderer/viewport';

interface Props {
  pattern: PatternDocument;
  completed: Set<string>;
  selectedThread?: number;
  settings: DisplaySettings;
  interaction: 'view' | 'mark';
  markMode: MarkMode;
  revision: number;
  viewport: ViewportState;
  onStroke(ids: string[], mode: MarkMode): void;
  onViewportChange(viewport: ViewportState): void;
}
interface Point {
  x: number;
  y: number;
  pointerType: string;
}
export function PatternCanvas({
  pattern,
  completed,
  selectedThread,
  settings,
  interaction,
  markMode,
  revision,
  viewport,
  onStroke,
  onViewportChange,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    frame = useRef(0),
    pointers = useRef(new Map<number, Point>()),
    stroke = useRef(new Set<string>()),
    lastCell = useRef<{ x: number; y: number } | undefined>(undefined),
    gesture = useRef<
      { distance: number; centerX: number; centerY: number; transform: ViewTransform } | undefined
    >(undefined),
    suppressUntilAllReleased = useRef(false);
  const initialViewport = useRef(viewport);
  const index = useMemo(() => buildRowIndex(pattern), [pattern]);
  const [transform, setTransform] = useState<ViewTransform>({
    scale: 18,
    offsetX: 20,
    offsetY: 20,
  });
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const saved = initialViewport.current;
    const next =
      settings.restoreViewport && saved.zoom >= 4
        ? {
            scale: saved.zoom,
            offsetX: rect.width / 2 - saved.centerX * saved.zoom,
            offsetY: rect.height / 2 - saved.centerY * saved.zoom,
          }
        : fitTransform(
            pattern.dimensions.width,
            pattern.dimensions.height,
            rect.width,
            rect.height,
          );
    setTransform(next);
  }, [pattern, settings.restoreViewport]);
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (canvas.current)
        renderPattern(canvas.current, {
          pattern,
          index,
          transform,
          completed,
          selectedThread,
          settings,
        });
    });
    return () => cancelAnimationFrame(frame.current);
  }, [pattern, index, transform, completed, selectedThread, settings, revision]);
  useEffect(() => {
    const resize = () => setTransform((value) => ({ ...value }));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const point = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pointerType: event.pointerType,
    };
  };
  const persistViewport = (value: ViewTransform) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToPattern(rect.width / 2, rect.height / 2, value);
    onViewportChange({ zoom: value.scale, centerX: center.x, centerY: center.y });
  };
  const fit = () => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    const next = fitTransform(
      pattern.dimensions.width,
      pattern.dimensions.height,
      rect.width,
      rect.height,
    );
    setTransform(next);
    persistViewport(next);
  };
  const addCell = (x: number, y: number) => {
    const cellX = Math.floor(x),
      cellY = Math.floor(y),
      previous = lastCell.current;
    for (const { x: cx, y: cy } of interpolatedCells(previous, { x: cellX, y: cellY })) {
      for (const stitch of selectMarkable(
        stitchesAt(index, cx, cy),
        settings.onlyMarkSelectedThread,
        selectedThread,
      ))
        stroke.current.add(stitch.id);
    }
    lastCell.current = { x: cellX, y: cellY };
  };
  const beginPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2,
      transform,
    };
  };
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    pointers.current.set(event.pointerId, p);
    if (pointers.current.size === 2) {
      suppressUntilAllReleased.current = true;
      if (stroke.current.size) onStroke([...stroke.current], markMode);
      stroke.current.clear();
      lastCell.current = undefined;
      beginPinch();
      return;
    }
    const canMark = shouldMarkPointer(
      interaction,
      p.pointerType,
      settings.allowFingerMarking,
      suppressUntilAllReleased.current,
    );
    if (canMark) {
      const cell = screenToPattern(p.x, p.y, transform);
      addCell(cell.x, cell.y);
    }
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const previous = pointers.current.get(event.pointerId)!,
      next = point(event);
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()],
        distance = Math.hypot(b.x - a.x, b.y - a.y),
        centerX = (a.x + b.x) / 2,
        centerY = (a.y + b.y) / 2;
      let nextTransform = zoomAt(
        gesture.current.transform,
        distance / Math.max(1, gesture.current.distance),
        gesture.current.centerX,
        gesture.current.centerY,
      );
      nextTransform = {
        ...nextTransform,
        offsetX: nextTransform.offsetX + centerX - gesture.current.centerX,
        offsetY: nextTransform.offsetY + centerY - gesture.current.centerY,
      };
      setTransform(nextTransform);
      return;
    }
    const canMark = shouldMarkPointer(
      interaction,
      next.pointerType,
      settings.allowFingerMarking,
      suppressUntilAllReleased.current,
    );
    if (canMark) {
      const cell = screenToPattern(next.x, next.y, transform);
      addCell(cell.x, cell.y);
    } else
      setTransform((t) => ({
        ...t,
        offsetX: t.offsetX + next.x - previous.x,
        offsetY: t.offsetY + next.y - previous.y,
      }));
  };
  const finish = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current = undefined;
    if (!pointers.current.size) {
      suppressUntilAllReleased.current = false;
      if (stroke.current.size) onStroke([...stroke.current], markMode);
      stroke.current.clear();
      lastCell.current = undefined;
      persistViewport(transform);
    }
  };
  return (
    <>
      <canvas
        ref={canvas}
        className="pattern-canvas"
        aria-label="Схема для вышивания"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onWheel={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          setTransform((t) => {
            const next = zoomAt(
              t,
              Math.exp(-event.deltaY * 0.0015),
              event.clientX - rect.left,
              event.clientY - rect.top,
            );
            persistViewport(next);
            return next;
          });
        }}
      />
      <button className="zoom-fit" onClick={fit} aria-label="Вместить схему">
        ⌗
      </button>
    </>
  );
}
