// Minimal PNG encoder (no dependencies). Supports 8/16-bit grayscale and 8-bit RGBA.
import { deflateSync } from "node:zlib";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * @param {{width:number,height:number,bitDepth:8|16,colorType:0|6,data:Uint8Array|Uint16Array}} img
 *   data is row-major samples (gray: 1 per pixel, RGBA: 4 per pixel).
 */
export function encodePNG({ width, height, bitDepth, colorType, data }) {
  const channels = colorType === 6 ? 4 : 1;
  const bytesPerSample = bitDepth / 8;
  const rowBytes = width * channels * bytesPerSample;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (rowBytes + 1);
    raw[o] = 0; // filter: none
    for (let i = 0; i < width * channels; i++) {
      const v = data[y * width * channels + i];
      if (bitDepth === 16) raw.writeUInt16BE(v, o + 1 + i * 2);
      else raw[o + 1 + i] = v;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
