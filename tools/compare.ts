import { readFile } from 'node:fs/promises';
import { parsePattern } from '../src/parsers/index';

const saga = await parsePattern(
  new Uint8Array(await readFile('Мурчащая осень.saga')),
  'Мурчащая осень.saga',
);
const dize = await parsePattern(
  new Uint8Array(await readFile('Мурчащая осень.dize')),
  'Мурчащая осень.dize',
);
const result = {
  sameCanonicalPattern: saga.canonicalPatternHash === dize.canonicalPatternHash,
  saga: { source: saga.sourceFileHash, canonical: saga.canonicalPatternHash },
  dize: { source: dize.sourceFileHash, canonical: dize.canonicalPatternHash },
};
const sagaStitches = new Set(saga.stitches.map((item) => item.id)),
  dizeStitches = new Set(dize.stitches.map((item) => item.id));
const sagaBack = new Set(saga.backstitches.map((item) => item.id)),
  dizeBack = new Set(dize.backstitches.map((item) => item.id));
console.log(
  JSON.stringify(
    {
      ...result,
      paletteEqual:
        JSON.stringify(saga.palette.map(({ id, number, color }) => ({ id, number, color }))) ===
        JSON.stringify(dize.palette.map(({ id, number, color }) => ({ id, number, color }))),
      stitchDifferences: {
        sagaOnly: [...sagaStitches].filter((id) => !dizeStitches.has(id)).slice(0, 5),
        dizeOnly: [...dizeStitches].filter((id) => !sagaStitches.has(id)).slice(0, 5),
      },
      backstitchDifferences: {
        sagaOnly: [...sagaBack].filter((id) => !dizeBack.has(id)).slice(0, 5),
        dizeOnly: [...dizeBack].filter((id) => !sagaBack.has(id)).slice(0, 5),
      },
      firstPalette: { saga: saga.palette.slice(0, 3), dize: dize.palette.slice(0, 3) },
    },
    null,
    2,
  ),
);
if (!result.sameCanonicalPattern) process.exitCode = 1;
