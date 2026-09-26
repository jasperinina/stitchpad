import type { Backstitch, PatternThread, Stitch } from '../model/pattern';
import { rgbInt } from '../model/pattern';

export async function sha256(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function canonicalHash(
  dimensions: { width: number; height: number },
  palette: PatternThread[],
  stitches: Stitch[],
  backstitches: Backstitch[],
) {
  const rows = [`stitchpad-canonical-v2`, `${dimensions.width},${dimensions.height}`];
  // Brand/number/name are catalog metadata and legitimately differ between exports.
  for (const t of [...palette].sort((a, b) => a.id - b.id))
    rows.push(`t|${t.id}|${rgbInt(t.color)}`);
  for (const s of [...stitches].sort(
    (a, b) =>
      a.y - b.y ||
      a.x - b.x ||
      a.type.localeCompare(b.type) ||
      a.threadID - b.threadID ||
      a.subposition - b.subposition,
  ))
    rows.push(`s|${s.x}|${s.y}|${s.threadID}|${s.type}|${s.subposition}`);
  for (const b of [...backstitches].sort((a, z) => a.id.localeCompare(z.id)))
    rows.push(`b|${b.startX2}|${b.startY2}|${b.endX2}|${b.endY2}|${b.threadID}`);
  return sha256(`${rows.join('\n')}\n`);
}
