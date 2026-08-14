const fs = require('fs');
const path = './client/src/components/Form20Tables.tsx';

// Read the file as binary (buffer)
const buf = fs.readFileSync(path);

// The file currently contains the string "àºžàº²àºªàº²" encoded as utf-8.
// We need to read it as utf-8 string, then take the char codes (which represent the corrupted latin1 bytes)
// and put them into a new buffer, then decode that new buffer as utf-8.
const str = buf.toString('utf8');

const correctedBytes = new Uint8Array(str.length);
let isCorrupted = false;
let j = 0;

for (let i = 0; i < str.length; i++) {
  const code = str.charCodeAt(i);
  if (code > 255) {
    // If there are actual Lao characters, it means it's not purely mojibake
    // Or it means the file is mixed.
  }
  // Convert char code back to byte
  correctedBytes[i] = code & 0xFF;
}

try {
  // If the whole file was double-encoded:
  // Let's try converting the corrupted string to a buffer using latin1, then reading as utf8
  const latin1Buf = Buffer.from(str, 'latin1');
  const fixedStr = latin1Buf.toString('utf8');
  
  if (fixedStr.includes('ພາສາ')) {
     fs.writeFileSync(path, fixedStr, 'utf8');
     console.log('Successfully fixed encoding!');
  } else {
     console.log('Failed to fix: did not find expected Lao words after decode.');
  }
} catch (e) {
  console.log('Error:', e.message);
}
