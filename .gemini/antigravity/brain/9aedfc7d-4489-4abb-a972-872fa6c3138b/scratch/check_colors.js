const fs = require('fs');

// Simple PNG pixel color sampling script
// Read PNG header and IHDR chunk
const buf = fs.readFileSync('client/public/benefits/1.png');
console.log('PNG magic:', buf.slice(0, 8).toString('hex'));
console.log('PNG width:', buf.readUInt32BE(16));
console.log('PNG height:', buf.readUInt32BE(20));
console.log('PNG color type:', buf[25]);
