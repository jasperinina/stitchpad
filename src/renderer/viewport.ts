export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export const screenToPattern = (x: number, y: number, t: ViewTransform) => ({
  x: (x - t.offsetX) / t.scale,
  y: (y - t.offsetY) / t.scale,
});
export const patternToScreen = (x: number, y: number, t: ViewTransform) => ({
  x: x * t.scale + t.offsetX,
  y: y * t.scale + t.offsetY,
});
export function fitTransform(
  patternWidth: number,
  patternHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 40,
): ViewTransform {
  const scale = clamp(
    Math.min((viewportWidth - padding) / patternWidth, (viewportHeight - padding) / patternHeight),
    4,
    32,
  );
  return {
    scale,
    offsetX: (viewportWidth - patternWidth * scale) / 2,
    offsetY: (viewportHeight - patternHeight * scale) / 2,
  };
}
export function visibleCellBounds(
  t: ViewTransform,
  viewportWidth: number,
  viewportHeight: number,
  patternWidth: number,
  patternHeight: number,
) {
  return {
    left: Math.max(0, Math.floor(-t.offsetX / t.scale) - 1),
    top: Math.max(0, Math.floor(-t.offsetY / t.scale) - 1),
    right: Math.min(patternWidth, Math.ceil((viewportWidth - t.offsetX) / t.scale) + 1),
    bottom: Math.min(patternHeight, Math.ceil((viewportHeight - t.offsetY) / t.scale) + 1),
  };
}
export function zoomAt(
  t: ViewTransform,
  factor: number,
  screenX: number,
  screenY: number,
): ViewTransform {
  const before = screenToPattern(screenX, screenY, t),
    scale = clamp(t.scale * factor, 4, 96);
  return { scale, offsetX: screenX - before.x * scale, offsetY: screenY - before.y * scale };
}
