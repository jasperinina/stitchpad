import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parsePattern } from '../src/parsers/index';

const format = process.argv[2];
if (format !== 'saga' && format !== 'dize')
  throw new Error('Использование: npm run inspect:saga или npm run inspect:dize');
const file = resolve(`Мурчащая осень.${format}`);
const pattern = await parsePattern(new Uint8Array(await readFile(file)), file);
const types = pattern.stitches.reduce<Record<string, number>>(
  (result, stitch) => ({ ...result, [stitch.type]: (result[stitch.type] ?? 0) + 1 }),
  {},
);
console.log(
  JSON.stringify(
    {
      format,
      dimensions: pattern.dimensions,
      palette: pattern.palette.length,
      stitches: pattern.stitches.length,
      types,
      backstitches: pattern.backstitches.length,
      sourceHash: pattern.sourceFileHash,
      canonicalHash: pattern.canonicalPatternHash,
    },
    null,
    2,
  ),
);
