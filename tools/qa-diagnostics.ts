import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { parsePattern } from '../src/parsers/index';
import type { PatternDocument } from '../src/model/pattern';

function diagnostic(pattern: PatternDocument, bytes: Uint8Array, container: object) {
  const counts = pattern.stitches.reduce<Record<string, number>>((result, stitch) => {
    result[stitch.type] = (result[stitch.type] ?? 0) + 1;
    return result;
  }, {});
  const byThread = pattern.stitches.reduce<Map<number, number>>(
    (map, stitch) => map.set(stitch.threadID, (map.get(stitch.threadID) ?? 0) + 1),
    new Map(),
  );
  const samples = Array.from(
    { length: 20 },
    (_, index) => pattern.stitches[Math.floor((index * (pattern.stitches.length - 1)) / 19)],
  );
  return {
    detectedFormat: pattern.sourceFormat,
    fileSize: bytes.length,
    container,
    dimensions: pattern.dimensions,
    paletteCount: pattern.palette.length,
    totalStitches: pattern.stitches.length,
    stitchTypes: counts,
    backstitches: pattern.backstitches.length,
    unknownRecords: counts.unknown ?? 0,
    warnings: pattern.warnings,
    sourceHash: pattern.sourceFileHash,
    canonicalHash: pattern.canonicalPatternHash,
    paletteSample: pattern.palette
      .slice(0, 10)
      .map((thread) => ({ ...thread, stitchCount: byThread.get(thread.id) ?? 0 })),
    stitchSample: samples.map(({ x, y, threadID, type, id }) => ({
      x,
      y,
      thread: threadID,
      type,
      id,
    })),
  };
}

const sagaBytes = new Uint8Array(await readFile('Мурчащая осень.saga'));
const dizeBytes = new Uint8Array(await readFile('Мурчащая осень.dize'));
const [saga, dize] = await Promise.all([
  parsePattern(sagaBytes, 'real-input.saga'),
  parsePattern(dizeBytes, 'real-input.dize'),
]);
const sagaEntries = Object.entries(unzipSync(sagaBytes)).map(([name, value]) => ({
  name,
  expandedBytes: value.length,
}));
const dizeView = new DataView(dizeBytes.buffer, dizeBytes.byteOffset, dizeBytes.byteLength);
console.log(
  JSON.stringify(
    {
      saga: diagnostic(saga, sagaBytes, { signature: 'PK', entries: sagaEntries }),
      dize: diagnostic(dize, dizeBytes, {
        signature: new TextDecoder().decode(dizeBytes.subarray(0, 4)),
        version: dizeView.getUint16(4),
        encoding: dizeView.getUint16(6),
      }),
    },
    null,
    2,
  ),
);
