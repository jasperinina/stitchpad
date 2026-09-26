import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePattern } from '../src/parsers';

describe('controlled parser failures', () => {
  it.each([
    ['empty', new Uint8Array()],
    ['random', new Uint8Array([1, 9, 4, 7, 2, 8, 3, 6, 5])],
    ['invalid signature', new TextEncoder().encode('NOTAFORMAT')],
  ])('rejects %s input', async (_name, bytes) => {
    await expect(parsePattern(bytes, 'bad.bin')).rejects.toThrow();
  });

  it('rejects truncated SAGA and DIZE', async () => {
    const [saga, dize] = await Promise.all([
      readFile('Мурчащая осень.saga'),
      readFile('Мурчащая осень.dize'),
    ]);
    await expect(
      parsePattern(new Uint8Array(saga.subarray(0, saga.length - 64)), 'truncated.saga'),
    ).rejects.toThrow();
    await expect(
      parsePattern(new Uint8Array(dize.subarray(0, dize.length - 7)), 'truncated.dize'),
    ).rejects.toThrow();
  });

  it('passes the anti-hardcoding mutation test using a temporary SAGA copy', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stitchpad-mutation-'));
    try {
      const original = await readFile('Мурчащая осень.saga'),
        path = join(directory, 'mutated.saga');
      await writeFile(path, original.subarray(0, original.length - 64));
      await expect(parsePattern(new Uint8Array(await readFile(path)), path)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});
