const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('client/public/benefits/1.png');
let pos = 8;
const chunks = [];
while (pos < buf.length) {
  const length = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') chunks.push(buf.slice(pos + 8, pos + 8 + length));
  pos += 12 + length;
}

const decompressed = zlib.inflateSync(Buffer.concat(chunks));
const width = 2440;
const height = 639;
const bpp = 4;
const rowSize = 1 + width * bpp;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Unfilter raw PNG data
const raw = Buffer.alloc(width * height * bpp);
for (let y = 0; y < height; y++) {
  const filter = decompressed[y * rowSize];
  const srcRow = y * rowSize + 1;
  const dstRow = y * width * bpp;
  const prevDstRow = (y - 1) * width * bpp;

  for (let x = 0; x < width * bpp; x++) {
    const rawVal = decompressed[srcRow + x];
    const left = x >= bpp ? raw[dstRow + x - bpp] : 0;
    const up = y > 0 ? raw[prevDstRow + x] : 0;
    const upLeft = (y > 0 && x >= bpp) ? raw[prevDstRow + x - bpp] : 0;

    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + left) & 0xff;
    else if (filter === 2) val = (rawVal + up) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) val = (rawVal + paeth(left, up, upLeft)) & 0xff;

    raw[dstRow + x] = val;
  }
}

function getPixelHex(x, y) {
  const idx = (y * width + x) * bpp;
  const r = raw[idx].toString(16).padStart(2, '0');
  const g = raw[idx + 1].toString(16).padStart(2, '0');
  const b = raw[idx + 2].toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

console.log('Top Left (10, 10):', getPixelHex(10, 10));
console.log('Top Right (2430, 10):', getPixelHex(2430, 10));
console.log('Bottom Left (10, 620):', getPixelHex(10, 620));
console.log('Bottom Right (2430, 620):', getPixelHex(2430, 620));
console.log('Bottom Center (1220, 620):', getPixelHex(1220, 620));
