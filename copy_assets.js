const fs = require('fs');
const path = require('path');

const src1 = path.join(__dirname, '1.svg');
const src2 = path.join(__dirname, '2.svg');
const destDir = path.join(__dirname, 'client', 'public');

try {
    fs.copyFileSync(src1, path.join(destDir, '1.svg'));
    console.log('1.svg copied successfully');
    fs.copyFileSync(src2, path.join(destDir, '2.svg'));
    console.log('2.svg copied successfully');
} catch (err) {
    console.error('Error copying files:', err);
    process.exit(1);
}
