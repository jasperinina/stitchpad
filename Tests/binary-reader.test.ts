import { describe, expect, it } from 'vitest';
import { BinaryReader } from '../src/utils/binary-reader';

describe('BinaryReader', () => {
  it('reads big-endian numbers and UTF-8 strings', () => {
    const bytes = new Uint8Array([0x7f, 0x12, 0x34, 0xff, 0xfe, 0, 0, 0, 2, 0, 2, 0xd0, 0x9c]);
    const reader = new BinaryReader(bytes);
    expect(reader.u8()).toBe(0x7f);
    expect(reader.u16()).toBe(0x1234);
    expect(reader.i16()).toBe(-2);
    expect(reader.u32()).toBe(2);
    expect(reader.string16()).toBe('М');
    expect(reader.remaining).toBe(0);
  });
  it('throws a controlled error on truncation', () =>
    expect(() => new BinaryReader(new Uint8Array([1])).u32()).toThrow(
      'Файл неожиданно закончился',
    ));
});
