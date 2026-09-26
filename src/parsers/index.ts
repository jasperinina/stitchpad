import type { PatternDocument } from '../model/pattern';
import { parseDize } from './dize/dize-parser';
import { PatternParseError } from './errors';
import { parseSaga } from './saga/saga-parser';

export async function parsePattern(data: Uint8Array, fileName: string): Promise<PatternDocument> {
  if (data.length < 8) throw new PatternParseError('Файл слишком короткий');
  const name = fileName.replace(/\.(saga|dize)$/i, '');
  if (data[0] === 0x44 && data[1] === 0x49 && data[2] === 0x5a && data[3] === 0x45)
    return parseDize(data, name);
  if (data[0] === 0x50 && data[1] === 0x4b) return parseSaga(data, name);
  throw new PatternParseError('Поддерживаются только файлы .saga и .dize', 'unsupported');
}

export { PatternParseError };
