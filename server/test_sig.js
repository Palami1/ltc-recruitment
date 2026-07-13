const sharp = require('sharp');
const fs = require('fs');

async function test() {
  const files = fs.readdirSync('uploads').filter(f => f.startsWith('signature_'));
  if (files.length === 0) return console.log('No signature found');
  // Sort by modification time to get the latest
  files.sort((a, b) => fs.statSync('uploads/' + b).mtime - fs.statSync('uploads/' + a).mtime);
  const latest = 'uploads/' + files[0];
  console.log('Testing on', latest);

  const img = sharp(latest).greyscale();
  const blurred = await img.clone().blur(15).toBuffer();
  
  // subtract original from blurred? Wait, if we composite difference
  // libvips difference: abs(A - B)
  const diff = await img.clone().composite([{ input: blurred, blend: 'difference' }]).toBuffer();
  
  // diff now has Ink as BRIGHT (high value) and Paper/Shadows as DARK (low value).
  // because blurred shadow is same as original shadow, difference is 0.
  // blurred ink is light, original ink is dark, difference is high.

  // We can just negate the diff and threshold it.
  const final = await sharp(diff)
    .negate() // Now Ink is DARK, Paper/Shadows are BRIGHT
    .threshold(220, { grayscale: true }) // Anything brighter than 220 becomes 255. Anything darker becomes 0.
    .toBuffer();
    
  fs.writeFileSync('uploads/test_diff.png', final);
  console.log('Done!');
}
test();
