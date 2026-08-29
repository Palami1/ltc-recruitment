const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

// Require functions directly or re-export from server logic
const CUSTOM_FONT_PATH = path.join(__dirname, '../public/fonts/Phetsarath OT.ttf');

const LAO_LOWER_VOWELS = new Set(['ຸ', 'ູ', '\u0EB8', '\u0EB9']);
const LAO_UPPER_VOWELS = new Set(['ັ', 'ິ', 'ີ', 'ຶ', 'ື', 'ົ', 'ຼ', 'ໍ', '\u0EB1', '\u0EB4', '\u0EB5', '\u0EB6', '\u0EB7', '\u0EBB', '\u0EBC', '\u0ECD']);
const LAO_TONE_MARKS = new Set(['່', '້', '໊', '໋', '໌', '\u0EC8', '\u0EC9', '\u0ECA', '\u0ECB', '\u0ECC']);
const LAO_WIDE_CONSONANTS = new Set(['ໜ', 'ໝ', '\u0EBD', '\u0EBE']);

function isLaoCombiningChar(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x0EB1 && code <= 0x0EBC && code !== 0x0EB2 && code !== 0x0EB3) ||
    (code >= 0x0EC8 && code <= 0x0ECD) ||
    LAO_LOWER_VOWELS.has(char) ||
    LAO_UPPER_VOWELS.has(char) ||
    LAO_TONE_MARKS.has(char)
  );
}

function parseLaoClusters(text) {
  const clusters = [];
  if (!text) return clusters;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isLaoCombiningChar(char)) {
      if (clusters.length === 0) {
        clusters.push({ base: '' });
      }
      const lastCluster = clusters[clusters.length - 1];
      if (LAO_LOWER_VOWELS.has(char)) {
        lastCluster.lowerVowel = char;
      } else if (LAO_UPPER_VOWELS.has(char)) {
        lastCluster.upperVowel = char;
      } else if (LAO_TONE_MARKS.has(char)) {
        lastCluster.toneMark = char;
      }
    } else {
      clusters.push({ base: char });
    }
  }

  return clusters;
}

function drawLaoText(page, text, options) {
  if (!options.font || typeof text !== 'string') {
    page.drawText(String(text), options);
    return;
  }
  const font = options.font;
  let size = options.size || 10;
  let drawTextStr = text;

  if (options.maxWidth) {
    let textWidth = font.widthOfTextAtSize(drawTextStr, size);
    if (textWidth > options.maxWidth) {
      let scaledSize = size * (options.maxWidth / textWidth);
      if (scaledSize >= 7.5) {
        size = scaledSize;
      } else {
        size = 7.5;
        while (drawTextStr.length > 0 && font.widthOfTextAtSize(drawTextStr + '...', size) > options.maxWidth) {
          drawTextStr = drawTextStr.slice(0, -1);
        }
        drawTextStr = drawTextStr + '...';
      }
    }
  }

  const color = options.color || rgb(0, 0, 0);
  let currentX = options.x || 0;
  const baseY = options.y || 0;

  const clusters = parseLaoClusters(drawTextStr);

  for (const cluster of clusters) {
    const { base, lowerVowel, upperVowel, toneMark } = cluster;

    if (!base && (lowerVowel || upperVowel || toneMark)) {
      const mark = lowerVowel || upperVowel || toneMark;
      page.drawText(mark, { font, size, x: currentX, y: baseY, color });
      continue;
    }

    const baseWidth = font.widthOfTextAtSize(base, size);
    const baseX = currentX;

    // 1. Render Base consonant first
    page.drawText(base, { font, size, x: baseX, y: baseY, color });

    // 2. Horizontal anchor positioning
    let markX = baseX;
    if (LAO_WIDE_CONSONANTS.has(base)) {
      markX = baseX + (baseWidth * 0.40);
    } else {
      markX = baseX;
    }

    // 3. Lower Vowel (offsetY = 0)
    if (lowerVowel) {
      page.drawText(lowerVowel, { font, size, x: markX, y: baseY, color });
    }

    // 4. Upper Vowel (offsetY = 0)
    if (upperVowel) {
      page.drawText(upperVowel, { font, size, x: markX, y: baseY, color });
    }

    // 5. Tone Mark (offsetY = 0 if alone on base, offsetY = size * 0.15 if stacked on upper vowel)
    if (toneMark) {
      const toneYOffset = upperVowel ? (size * 0.15) : 0;
      page.drawText(toneMark, { font, size, x: markX, y: baseY + toneYOffset, color });
    }

    // 6. Cursor Advance: ONLY advance by width of the Base consonant
    currentX += baseWidth;
  }
}

async function runTest() {
  console.log('[Test] Initializing PDF test...');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  if (!fs.existsSync(CUSTOM_FONT_PATH)) {
    throw new Error(`Font file not found at: ${CUSTOM_FONT_PATH}`);
  }

  const fontBytes = fs.readFileSync(CUSTOM_FONT_PATH);
  const customFont = await pdfDoc.embedFont(fontBytes);

  const page = pdfDoc.addPage([600, 400]);

  const testPhrases = [
    'ໜຶ້ມນາ (Word with wide consonant + upper vowel + tone mark)',
    'ພຸດ (Word with lower vowel)',
    'ທີ່ (Word with tone mark on upper vowel)',
    'ຜູ້ສະໝັກ (Complex word with lower vowel, upper vowel, wide consonant)',
    'ຫຼວງພະບາງ (Word with composite consonant)'
  ];

  let yPos = 350;
  for (const phrase of testPhrases) {
    console.log(`[Test] Rendering: "${phrase}"`);
    drawLaoText(page, phrase, {
      font: customFont,
      size: 14,
      x: 50,
      y: yPos,
      color: rgb(0.1, 0.1, 0.3)
    });
    yPos -= 50;
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, 'test_output.pdf');
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`[Test] SUCCESS: PDF generated cleanly! Size: ${pdfBytes.length} bytes.`);
  console.log(`[Test] Output saved to: ${outputPath}`);
}

runTest().catch(err => {
  console.error('[Test] FAILED with error:', err);
  process.exit(1);
});
