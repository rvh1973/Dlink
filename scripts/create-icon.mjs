import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const size = 180;
const pixels = Buffer.alloc(size * size * 4);

const colors = {
  background: [16, 25, 35, 255],
  line: [41, 58, 70, 255],
  orange: [255, 107, 44, 255],
  mint: [82, 226, 168, 255],
  white: [245, 247, 248, 255],
};

function setPixel(x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= size || py >= size) return;
  const offset = (py * size + px) * 4;
  pixels.set(color, offset);
}

function drawLine(x1, y1, x2, y2, width, color) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(length * 2);
  const radius = width / 2;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if (Math.hypot(x - cx, y - cy) <= radius) setPixel(x, y, color);
      }
    }
  }
}

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) setPixel(x, y, colors.background);
}

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const dx = x - 90;
    const dy = y - 90;
    const distance = Math.hypot(dx, dy);
    if (distance >= 54 && distance <= 62) setPixel(x, y, colors.line);
    const angle = Math.atan2(dy, dx);
    if (distance >= 54 && distance <= 62 && angle >= -Math.PI / 2 && angle <= -0.35) setPixel(x, y, colors.mint);
  }
}

drawLine(73, 61, 101, 61, 7, colors.orange);
drawLine(73, 61, 73, 119, 7, colors.orange);
drawLine(73, 119, 118, 119, 7, colors.orange);
drawLine(118, 119, 118, 78, 7, colors.orange);
drawLine(101, 61, 118, 78, 7, colors.orange);
drawLine(101, 61, 101, 78, 7, colors.orange);
drawLine(101, 78, 118, 78, 7, colors.orange);
drawLine(84, 98, 93, 107, 7, colors.white);
drawLine(93, 107, 109, 87, 7, colors.white);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const scanlines = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y += 1) {
  const row = y * (size * 4 + 1);
  scanlines[row] = 0;
  pixels.copy(scanlines, row + 1, y * size * 4, (y + 1) * size * 4);
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(scanlines, { level: 9 })),
  chunk("IEND"),
]);

await writeFile(resolve("public", "icon-180.png"), png);
