import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { canonicalHash, sha256 } from '../../utils/hash';
import {
  makeBackstitch,
  makeStitch,
  rgbFromInt,
  validatePattern,
  type Backstitch,
  type PatternDocument,
  type PatternThread,
  type StrandCounts,
  type Stitch,
  type StitchType,
} from '../../model/pattern';
import { PatternParseError } from '../errors';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  isArray: (name) => ['color', 'concrete_color', 'block', 'Lines', 'line'].includes(name),
});
const symbols = [...'●■▲◆✚✦✱✿◉□△◇+×abcdefghijklmnopqrstuvwxyz0123456789'];
const utf8 = new TextDecoder();
type XMLNode = Record<string, unknown>;

export async function parseSaga(data: Uint8Array, suggestedName: string): Promise<PatternDocument> {
  try {
    if (!(data[0] === 0x50 && data[1] === 0x4b))
      throw new PatternParseError('Некорректный заголовок SAGA');
    let entryCount = 0,
      expandedBytes = 0;
    const files = unzipSync(data, {
      filter: (file) => {
        entryCount += 1;
        expandedBytes += file.originalSize;
        if (
          entryCount > 10_000 ||
          file.originalSize > 256 * 1024 * 1024 ||
          expandedBytes > 1024 * 1024 * 1024
        )
          throw new PatternParseError('Архив SAGA превышает безопасные ограничения', 'limit');
        return true;
      },
    });
    const hoops = files['hoops.xpub'];
    if (!hoops) throw new PatternParseError('В SAGA нет hoops.xpub', 'missing');
    const paletteRoot = parser.parse(utf8.decode(await decryptXpub(hoops))) as XMLNode;
    const paletteNode = findFirst(paletteRoot, 'hoops') ?? paletteRoot;
    const palette = parsePalette(paletteRoot);
    const stitches: Stitch[] = [],
      backstitches: Backstitch[] = [];
    let width = 0,
      height = 0;
    const names = Object.keys(files)
      .filter((name) => /^hoop_.*\.xpub$/i.test(name))
      .sort();
    if (!names.length) throw new PatternParseError('В SAGA нет листов схемы', 'missing');
    for (const name of names) {
      const root = parser.parse(utf8.decode(await decryptXpub(files[name]))) as XMLNode;
      const props = findFirst(root, 'Properties');
      width = Math.max(width, toInt(props?.size_x));
      height = Math.max(height, toInt(props?.size_y));
      collectBlocks(root, stitches);
      collectLines(root, backstitches);
    }
    const fabric = {
      count: toInt(paletteNode.canva_x) || undefined,
      name: stringValue(paletteNode.canva_name),
      color: rgbFromHex(paletteNode.color),
    };
    const license = findFirst(paletteRoot, 'license');
    const dimensions = { width, height };
    const unknown = stitches.filter((stitch) => stitch.type === 'unknown').length;
    const result: PatternDocument = {
      metadata: {
        name: suggestedName,
        designer: stringValue(license?.author ?? license?.designer),
        copyright: stringValue(license?.copyright),
      },
      dimensions,
      palette: palette.sort((a, b) => a.id - b.id),
      stitches,
      backstitches,
      fabric,
      sourceFormat: 'saga',
      sourceFileHash: await sha256(data),
      canonicalPatternHash: await canonicalHash(dimensions, palette, stitches, backstitches),
      warnings: unknown ? [`Неизвестных типов стежков: ${unknown}`] : [],
    };
    validatePattern(result);
    return result;
  } catch (error) {
    if (error instanceof PatternParseError) throw error;
    throw new PatternParseError(error instanceof Error ? error.message : 'Неизвестная ошибка SAGA');
  }
}

async function decryptXpub(encoded: Uint8Array): Promise<ArrayBuffer> {
  const compact = utf8.decode(encoded).replace(/\s/g, '');
  let encrypted: Uint8Array;
  try {
    encrypted = Uint8Array.from(atob(compact), (character) => character.charCodeAt(0));
  } catch {
    throw new PatternParseError('Некорректный Base64 в XPUB');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('i0dLlD2bl3432rMboA6YbTOYiKWtc31n'),
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  );
  try {
    return await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: new TextEncoder().encode('00RWpTlqTYwxMKRU') },
      key,
      new Uint8Array(encrypted),
    );
  } catch {
    throw new PatternParseError('Не удалось расшифровать XPUB');
  }
}

function parsePalette(root: XMLNode): PatternThread[] {
  const colors: XMLNode[] = [];
  collectNamed(root, 'color', colors);
  return colors
    .filter((color) => color && typeof color === 'object' && color.ColorUID !== undefined)
    .map((color, index) => {
      const concrete = arrayValue(color.concrete_color)[0] as XMLNode | undefined;
      const id = toInt(color.ColorUID, index),
        code = Number.parseInt(String(color.Unicode ?? ''), 16);
      return {
        id,
        brand: stringValue(concrete?.ColorPalette) ?? '',
        number: stringValue(concrete?.ColorId) ?? '',
        name: stringValue(concrete?.Name) ?? '',
        color: rgbFromHex(concrete?.RGB) ?? rgbFromInt(0),
        strands: parseStrands(color),
        symbol:
          Number.isFinite(code) && code >= 33 && code < 127
            ? String.fromCodePoint(code)
            : symbols[Math.abs(id) % symbols.length],
      };
    });
}

function parseStrands(color: XMLNode): StrandCounts | undefined {
  const values: StrandCounts = {
    fullCross: positiveInt(color.threads_full),
    halfCross: positiveInt(color.threads_half),
    quarter: positiveInt(color.threads_quarter),
    backstitch: positiveInt(color.threads_back),
    knot: positiveInt(color.threads_french),
    petite: positiveInt(color.threads_petite),
    special: positiveInt(color.threads_special),
    straight: positiveInt(color.threads_straight),
  };
  return Object.values(values).some((value) => value !== undefined) ? values : undefined;
}

function collectBlocks(value: unknown, result: Stitch[]) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as XMLNode)) {
    if (key === 'block')
      for (const block of arrayValue(child) as XMLNode[]) {
        const x2 = twice(block.x),
          y2 = twice(block.y),
          thread = toInt(block.ColorUID),
          raw = String(block.type ?? '');
        const type: StitchType =
          raw === 'full_cross'
            ? 'fullCross'
            : raw === 'half_cross_right'
              ? 'halfCrossRight'
              : raw === 'half_cross_left'
                ? 'halfCrossLeft'
                : raw === 'pinch'
                  ? 'knot'
                  : raw === 'petite'
                    ? 'petite'
                    : 'unknown';
        result.push(
          makeStitch(
            Math.floor(x2 / 2),
            Math.floor(y2 / 2),
            type,
            thread,
            type === 'knot' ? (x2 & 1) | ((y2 & 1) << 1) : 0,
          ),
        );
      }
    if (key !== 'block') for (const item of arrayValue(child)) collectBlocks(item, result);
  }
}
function collectLines(value: unknown, result: Backstitch[]) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as XMLNode)) {
    if (key === 'Lines')
      for (const group of arrayValue(child) as XMLNode[]) {
        const thread = toInt(group.ColorUID);
        for (const line of arrayValue(group.line) as XMLNode[])
          if (line.type === 'back')
            result.push(
              makeBackstitch(
                twice(line.start_x),
                twice(line.start_y),
                twice(line.end_x),
                twice(line.end_y),
                thread,
              ),
            );
      }
    if (key !== 'Lines') for (const item of arrayValue(child)) collectLines(item, result);
  }
}
function collectNamed(value: unknown, name: string, result: XMLNode[]) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as XMLNode)) {
    if (key === name) result.push(...(arrayValue(child) as XMLNode[]));
    else for (const item of arrayValue(child)) collectNamed(item, name, result);
  }
}
function findFirst(value: unknown, name: string): XMLNode | undefined {
  if (!value || typeof value !== 'object') return;
  const object = value as XMLNode;
  if (object[name]) return arrayValue(object[name])[0] as XMLNode;
  for (const child of Object.values(object))
    for (const item of arrayValue(child)) {
      const found = findFirst(item, name);
      if (found) return found;
    }
}
function arrayValue(value: unknown): unknown[] {
  return value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
}
function toInt(value: unknown, fallback = 0) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function positiveInt(value: unknown) {
  const parsed = toInt(value);
  return parsed > 0 ? parsed : undefined;
}
function twice(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 2) : 0;
}
function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
function rgbFromHex(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').replace(/^#/, ''), 16);
  return Number.isFinite(parsed) ? rgbFromInt(parsed) : undefined;
}
