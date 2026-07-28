import { writeFileSync } from 'fs';
import zlib from 'zlib';

const W = 1200, H = 630;

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crc32._table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
crc32._table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crc32._table[i] = c;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crc]);
}

const rawData = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = y / H;
    const r = Math.round(249 * (1 - t) + 234 * t);
    const g = Math.round(115 * (1 - t) + 88 * t);
    const b = Math.round(22 * (1 - t) + 12 * t);
    rawData.push(r, g, b, 255);
  }
}

const filtered = [];
for (let y = 0; y < H; y++) {
  filtered.push(0);
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    filtered.push(rawData[i], rawData[i+1], rawData[i+2], rawData[i+3]);
  }
}

const deflated = zlib.deflateSync(Buffer.from(filtered));

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflated),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync('public/og-image.png', png);
console.log(`Created og-image.png (${png.length} bytes)`);
