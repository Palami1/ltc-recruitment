const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { FORM_20 } = require('./applicationFormSchema');

const CUSTOM_FONT_PATH = path.join(__dirname, '../public/fonts/Phetsarath OT.ttf');
const TEMPLATE_PATH = path.join(__dirname, '../client/public/form_template.pdf');

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

function parseDateParts(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-\/]/);
    return { dd: parts[2].substring(0, 2).padStart(2, '0'), mm: parts[1].padStart(2, '0'), yyyy: parts[0] };
  }
  return null;
}

async function generateSampleForm20() {
  console.log('[Form20 Generator] Loading background PDF template...');
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at: ${TEMPLATE_PATH}`);
  }
  const existingPdfBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  if (!fs.existsSync(CUSTOM_FONT_PATH)) {
    throw new Error(`Custom font not found at: ${CUSTOM_FONT_PATH}`);
  }
  const fontBytes = fs.readFileSync(CUSTOM_FONT_PATH);
  const customFont = await pdfDoc.embedFont(fontBytes);

  const pages = pdfDoc.getPages();

  // Full Mock Applicant Data
  const mockData = {
    pos_applying: 'ນັກພັດທະນາ ຊອບແວ (Software Developer)',
    first_name: 'ໜຶ້ມນາ',
    last_name: 'ພຸດທະສາດ',
    dob: '1998-05-15',
    age: '28',
    birth_village: 'ບ້ານ ພຸດ',
    birth_district: 'ເມືອງ ຫຼວງພະບາງ',
    birth_province: 'ແຂວງ ຫຼວງພະບາງ',
    curr_village: 'ບ້ານ ຜູ້ສະໝັກ',
    curr_district: 'ເມືອງ ໄຊເສດຖາ',
    curr_province: 'ນະຄອນຫຼວງວຽງຈັນ',
    phone: '02055383707',
    email: 'numna.phouthasat@ltc.la',
    sex: 'ຊາຍ',
    nationality: 'ລາວ',
    ethnicity: 'ລາວ',
    religion: 'ພຸດ',
    marital_single: 'on',
    motorbike_yes: 'on',
    motorbike_lic_yes: 'on',
    car_yes: 'on',
    car_lic_yes: 'on',
    car_lic_type: 'B',
    
    // Education Table
    edu1_school: 'ມະຫາວິທະຍາໄລ ແຫ່ງຊາດ (ມຊ)',
    edu1_degree: 'ປະລິນຍາຕີ',
    edu1_major: 'ວິທະຍາສາດ ຄອມພິວເຕີ (CS)',
    edu1_year: '2016 - 2020',
    
    edu2_school: 'ໂຮງຮຽນ ມັດທະຍົມ ສົມບູນ ຫຼວງພະບາງ',
    edu2_degree: 'ມ.7',
    edu2_major: 'ສາຍສາມັນ',
    edu2_year: '2010 - 2016',
    
    // Training Table
    train1_topic: 'Full-Stack Web Development & Cloud Architecture',
    train1_by: 'Lao Telecom IT Center',
    train1_date: '2022',
    train1_place: 'ນະຄອນຫຼວງວຽງຈັນ',

    // Computer Skills
    com_word_vgood: 'on',
    com_excel_vgood: 'on',
    com_ppt_good: 'on',

    // Language Skills
    lang_eng_read_good: 'on',
    lang_eng_write_good: 'on',
    lang_eng_speak_fair: 'on',

    // Special Skills
    special_skills: 'ມີຄວາມຊຳນານດ້ານ React, Node.js, Express, MongoDB ແລະ UX/UI Design ພ້ອມທັງລະບົບ PDF Generation',

    // Employment History
    emp1_company: 'ບໍລິສັດ ເທັກໂນໂລຢີ ດິຈິທັອນ',
    emp1_start_date: '01/01/2021',
    emp1_end_date: '30/06/2024',
    emp1_pos: 'Senior Software Engineer',
    emp1_salary: '15,000,000 ກີບ',
    emp1_reason: 'ຊອກຫາໂອກາດໃໝ່',
    emp1_desc: 'ພັດທະນາ Web Application ແລະ API Services',

    // Emergency Contacts
    emg1_name: 'ທ່ານ ພຸດທະວົງ ພຸດທະສາດ',
    emg1_address: 'ບ້ານ ຫຼວງພະບາງ, ແຂວງ ຫຼວງພະບາງ',
    emg1_phone: '020 55112233',
    emg1_relation: 'ບິດາ (Father)',

    sign_date: '2026-08-28'
  };

  const fieldTargetSizes = {};
  FORM_20.fields.forEach(field => {
    const val = mockData[field.id];
    if (val && field.type !== 'checkbox' && field.type !== 'file' && field.type !== 'date') {
      let effectiveMaxWidth = field.maxWidth;
      if (field.multiline && field.maxLines) {
        effectiveMaxWidth = field.maxWidth * field.maxLines;
      }
      let baseSize = field.multiline ? 7.5 : 10;
      if (customFont && effectiveMaxWidth) {
        const str = String(val);
        let textWidth = customFont.widthOfTextAtSize(str, baseSize);
        if (textWidth > effectiveMaxWidth) {
          let scaledSize = baseSize * (effectiveMaxWidth / textWidth);
          fieldTargetSizes[field.id] = Math.max(7.5, scaledSize);
        } else {
          fieldTargetSizes[field.id] = baseSize;
        }
      } else {
        fieldTargetSizes[field.id] = baseSize;
      }
    }
  });

  FORM_20.fields.forEach(field => {
    const page = pages[field.pageIndex] || pages[0];
    const val = mockData[field.id];

    if (field.type === 'checkbox' && (val === 'true' || val === true || val === 'on')) {
      page.drawLine({ start: { x: field.x, y: field.y + 6 }, end: { x: field.x + 4, y: field.y + 2 }, thickness: 1.5, color: rgb(0,0,0) });
      page.drawLine({ start: { x: field.x + 4, y: field.y + 2 }, end: { x: field.x + 10, y: field.y + 10 }, thickness: 1.5, color: rgb(0,0,0) });
    } else if (val && field.type === 'date') {
      const parsed = parseDateParts(val);
      if (parsed) {
        const textOptions = { size: 10, color: rgb(0, 0, 0), font: customFont };
        const baseY = field.y - 4;
        drawLaoText(page, parsed.dd, { ...textOptions, x: field.x, y: baseY });
        drawLaoText(page, parsed.mm, { ...textOptions, x: field.x_month || field.x + 38, y: baseY });
        drawLaoText(page, parsed.yyyy, { ...textOptions, x: field.x_year || field.x + 78, y: baseY });
      }
    } else if (val && field.type !== 'checkbox' && field.type !== 'file') {
      const textOptions = { x: field.x, y: field.y, size: field.size || fieldTargetSizes[field.id] || 10, color: rgb(0, 0, 0), font: customFont };
      drawLaoText(page, String(val), textOptions);
    }
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, 'sample_form20_output.pdf');
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`[Form20 Generator] SUCCESS: Full Form 20 PDF generated! Size: ${pdfBytes.length} bytes.`);
  console.log(`[Form20 Generator] Saved output to: ${outputPath}`);
}

generateSampleForm20().catch(err => {
  console.error('[Form20 Generator] FAILED:', err);
  process.exit(1);
});
