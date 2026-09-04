const fs = require('fs');

// Read PNG pixels using sharp or raw buffer inspection
// In RGBA png (color type 6), each row starts with a filter byte (1 byte) followed by width * 4 bytes.
const buf = fs.readFileSync('client/public/benefits/1.png');

// Find IDAT chunk
let pos = 8;
const chunks = [];
while (pos < buf.length) {
  const length = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') {
    chunks.push(buf.slice(pos + 8, pos + 8 + length));
  }
  pos += 12 + length;
}

const zlib = require('zlib');
const idat = Buffer.concat(chunks);
const decompressed = zlib.inflateSync(idat);

const width = 2440;
const height = 639;
const bpp = 4; // RGBA
const rowSize = 1 + width * bpp;

function getPixel(x, y) {
  const rowStart = y * rowSize;
  const filterType = decompressed[rowStart];
  // Simple check for unfiltered or sample
  const pixelOffset = rowStart + 1 + x * bpp;
  return {
    r: decompressed[pixelOffset],
    g: decompressed[pixelOffset + 1],
    b: decompressed[pixelOffset + 2],
    a: decompressed[pixelOffset + 3]
  };
}

console.log('Decompressed length:', decompressed.length);
console.log('Filter types sample:', decompressed[0], decompressed[rowSize], decompressed[rowSize * 300]);
