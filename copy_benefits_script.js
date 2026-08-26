const fs = require('fs');
const path = require('path');
const srcDir = path.join(process.cwd(), 'ຟາຍຮູບກ່ຽວກັບສະວັດດີການ');
const destDir = path.join(process.cwd(), 'client', 'public', 'benefits');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy new banner 88.png if present
if (fs.existsSync(path.join(srcDir, '88.png'))) {
  fs.copyFileSync(path.join(srcDir, '88.png'), path.join(destDir, 'header_top.png'));
  fs.copyFileSync(path.join(srcDir, '88.png'), path.join(destDir, '88.png'));
  console.log('Copied 88.png -> header_top.png');
}

// Copy top header banner image fallback
if (fs.existsSync(path.join(srcDir, 'ข้อความในย่อหน้าของคุณ (19).png'))) {
  if (!fs.existsSync(path.join(destDir, 'header_top.png'))) {
    fs.copyFileSync(path.join(srcDir, 'ข้อความในย่อหน้าของคุณ (19).png'), path.join(destDir, 'header_top.png'));
  }
}

// Copy wave ribbon image if present
if (fs.existsSync(path.join(srcDir, 'ข้อความในย่อหน้าของคุณ.png'))) {
  fs.copyFileSync(path.join(srcDir, 'ข้อความในย่อหน้าของคุณ.png'), path.join(destDir, 'header_wave.png'));
}

// Copy cards 1..17
for (let i = 1; i <= 17; i++) {
  const fileName = `ข้อความในย่อหน้าของคุณ (${i}).png`;
  const srcPath = path.join(srcDir, fileName);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(destDir, `${i}.png`));
  }
}

console.log('All benefits assets updated.');
