export class BinaryReader {
  private offset = 0;
  constructor(private readonly bytes: Uint8Array) {}
  get remaining() {
    return this.bytes.length - this.offset;
  }
  private take(size: number): Uint8Array {
    if (size < 0 || size > this.remaining) throw new Error('Файл неожиданно закончился');
    const result = this.bytes.subarray(this.offset, this.offset + size);
    this.offset += size;
    return result;
  }
  skip(size: number) {
    this.take(size);
  }
  u8() {
    return this.take(1)[0];
  }
  u16() {
    const b = this.take(2);
    return (b[0] << 8) | b[1];
  }
  i16() {
    const v = this.u16();
    return v & 0x8000 ? v - 0x10000 : v;
  }
  u32() {
    const b = this.take(4);
    return (b[0] * 0x1000000 + (b[1] << 16) + (b[2] << 8) + b[3]) >>> 0;
  }
  read(size: number) {
    return this.take(size);
  }
  ascii(size: number) {
    return new TextDecoder('ascii').decode(this.take(size));
  }
  string16() {
    const size = this.u16();
    if (size > 1_000_000) throw new Error('Строка слишком длинная');
    return new TextDecoder().decode(this.take(size));
  }
}
