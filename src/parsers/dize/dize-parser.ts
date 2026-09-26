import { unzlibSync } from 'fflate';
import { BinaryReader } from '../../utils/binary-reader';
import { canonicalHash, sha256 } from '../../utils/hash';
import {
  makeBackstitch,
  makeStitch,
  rgbFromInt,
  validatePattern,
  type FabricInfo,
  type PatternDocument,
  type PatternThread,
  type StrandCounts,
  type StitchType,
} from '../../model/pattern';
import { PatternParseError } from '../errors';

const key = new TextEncoder().encode('CrossStitchParadise');
const symbols = [...'●■▲◆✚✦✱✿◉□△◇+×abcdefghijklmnopqrstuvwxyz0123456789'];

export async function parseDize(data: Uint8Array, suggestedName: string): Promise<PatternDocument> {
  try {
    const r = new BinaryReader(data);
    if (r.ascii(4) !== 'DIZE') throw new PatternParseError('Некорректный заголовок DIZE');
    const version = r.u16(),
      encoding = r.u16();
    if (version < 1 || version > 3)
      throw new PatternParseError(`Версия DIZE ${version} не поддерживается`, 'unsupported');
    if (encoding !== 0 && encoding !== 2)
      throw new PatternParseError(`Кодирование DIZE ${encoding} не поддерживается`, 'unsupported');
    const blocks = new Map<string, Uint8Array[]>();
    while (r.remaining) {
      const tag = r.ascii(4);
      r.u16();
      const rawSize = encoding === 0 ? undefined : r.u32();
      const storedSize = r.u32();
      if (storedSize > 256 * 1024 * 1024 || (rawSize ?? 0) > 256 * 1024 * 1024)
        throw new PatternParseError('Блок DIZE слишком велик', 'limit');
      const payload = new Uint8Array(r.read(storedSize));
      if (encoding === 2)
        for (let i = 0; i < payload.length; i++) payload[i] ^= key[i % key.length];
      const decoded = encoding === 2 ? unzlibSync(payload) : payload;
      if (rawSize !== undefined && decoded.length !== rawSize)
        throw new PatternParseError(`Размер блока ${tag} не совпадает`);
      blocks.set(tag, [...(blocks.get(tag) ?? []), decoded]);
    }
    const first = (tag: string) => blocks.get(tag)?.[0];
    if (!first('PTRN') || !first('MATS') || !first('STCH'))
      throw new PatternParseError('В DIZE нет обязательных блоков', 'missing');
    const section = <T>(name: string, operation: () => T): T => {
      try {
        return operation();
      } catch (error) {
        throw new PatternParseError(
          `Блок ${name}: ${error instanceof Error ? error.message : 'ошибка чтения'}`,
        );
      }
    };
    const dimensions = section('PTRN', () => parsePattern(first('PTRN')!)),
      palette = section('MATS', () => parseMaterials(first('MATS')!));
    const stitches = [
      ...section('STCH', () => parseStitches(first('STCH')!)),
      ...(first('NODE') ? section('NODE', () => parseKnots(first('NODE')!)) : []),
    ];
    const backstitches = first('BACK')
      ? section('BACK', () => parseBackstitches(first('BACK')!))
      : [];
    const unknown = stitches.filter((stitch) => stitch.type === 'unknown').length;
    const pattern: PatternDocument = {
      metadata: { name: suggestedName },
      dimensions,
      palette,
      stitches,
      backstitches,
      fabric: first('FBRK') ? section('FBRK', () => parseFabric(first('FBRK')!)) : undefined,
      sourceFormat: 'dize',
      sourceFileHash: await sha256(data),
      canonicalPatternHash: await canonicalHash(dimensions, palette, stitches, backstitches),
      warnings: unknown ? [`Неизвестных типов стежков: ${unknown}`] : [],
    };
    validatePattern(pattern);
    return pattern;
  } catch (error) {
    if (error instanceof PatternParseError) throw error;
    throw new PatternParseError(error instanceof Error ? error.message : 'Неизвестная ошибка DIZE');
  }
}

function parsePattern(data: Uint8Array) {
  const r = new BinaryReader(data);
  if (r.string16() !== 'CrossStitchParadise')
    throw new PatternParseError('Некорректная сигнатура PTRN');
  return { width: r.u16(), height: r.u16() };
}
function nested(r: BinaryReader, expected: string) {
  const tag = r.ascii(4);
  r.u16();
  const size = r.u32();
  if (tag !== expected) throw new PatternParseError(`Ожидался ${expected}, найден ${tag}`);
  return r.read(size);
}
function parseMaterials(data: Uint8Array): PatternThread[] {
  const r = new BinaryReader(data),
    count = r.u16();
  if (count > 4096) throw new PatternParseError('Слишком много цветов', 'limit');
  const result: PatternThread[] = [];
  for (let index = 0; index < count; index++) {
    const id = r.i16();
    r.i16();
    r.i16();
    r.i16();
    const color = rgbFromInt(r.u32());
    const number = r.string16(),
      name = r.string16(),
      brand = r.string16();
    const strands = parseStrands(nested(r, 'STRN'));
    const symbolData = nested(r, 'SYMB');
    nested(r, 'NOTE');
    if (r.u8()) r.skip(4);
    const blendCount = r.u8();
    for (let b = 0; b < blendCount; b++) nested(r, 'BLND');
    const code = symbolData.length >= 2 ? (symbolData[0] << 8) | symbolData[1] : id;
    result.push({
      id,
      brand,
      number,
      name,
      color,
      strands,
      symbol:
        code >= 33 && code < 127
          ? String.fromCodePoint(code)
          : symbols[Math.abs(id) % symbols.length],
    });
  }
  return result;
}
function parseStrands(data: Uint8Array): StrandCounts | undefined {
  const names: (keyof StrandCounts)[] = [
    'fullCross',
    'halfCross',
    'quarter',
    'backstitch',
    'knot',
    'petite',
    'special',
    'straight',
  ];
  const strands: StrandCounts = {};
  names.forEach((name, index) => {
    const value = data[index];
    if (value) strands[name] = value;
  });
  return Object.keys(strands).length ? strands : undefined;
}
function parseStitches(data: Uint8Array) {
  const r = new BinaryReader(data),
    count = r.u32();
  if (count > 5_000_000) throw new PatternParseError('Слишком много стежков', 'limit');
  return Array.from({ length: count }, () => {
    const x = r.i16(),
      y = r.i16(),
      raw = r.i16(),
      thread = r.i16();
    const type: StitchType = raw === 1 ? 'fullCross' : raw === 3 ? 'halfCrossRight' : 'unknown';
    return makeStitch(x, y, type, thread);
  });
}
function parseKnots(data: Uint8Array) {
  const r = new BinaryReader(data),
    count = r.u32();
  if (count > 2_000_000) throw new PatternParseError('Слишком много узелков', 'limit');
  return Array.from({ length: count }, () => {
    const x2 = r.i16(),
      y2 = r.i16();
    r.i16();
    const thread = r.i16();
    return makeStitch(
      Math.floor(x2 / 2),
      Math.floor(y2 / 2),
      'knot',
      thread,
      (x2 & 1) | ((y2 & 1) << 1),
    );
  });
}
function parseBackstitches(data: Uint8Array) {
  const r = new BinaryReader(data),
    count = r.u32();
  if (count > 2_000_000) throw new PatternParseError('Слишком много линий бэкстича', 'limit');
  return Array.from({ length: count }, () => {
    const startX2 = r.i16(),
      startY2 = r.i16(),
      endX2 = r.i16(),
      endY2 = r.i16();
    r.i16();
    return makeBackstitch(startX2, startY2, endX2, endY2, r.i16());
  });
}
function parseFabric(data: Uint8Array): FabricInfo {
  const r = new BinaryReader(data);
  const count = r.u32();
  r.u16();
  const color = rgbFromInt(r.u32()),
    name = r.string16();
  return { count, color, name };
}
