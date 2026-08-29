const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

// ================================================================
// 1. FORM_20 Schema & Coordinate Mappings (from applicationFormSchema.js)
// ================================================================
const FORM_20 = {
  id: 'FORM_20',
  department: 'ພະແນກຈັດຕັ້ງ-ບຸກຄະລາກອນ',
  name: 'ແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ',
  templatePath: 'templates/form_template.pdf',
  fields: [
    { id: 'pos_applying', type: 'text', pageIndex: 0, x: 270, y: 673 },
    { id: 'first_name', type: 'text', pageIndex: 0, x: 128, y: 631 },
    { id: 'last_name', type: 'text', pageIndex: 0, x: 433, y: 631 },
    { id: 'dob', type: 'date', pageIndex: 0, x: 170, y: 611, x_month: 199, x_year: 225 },
    { id: 'age', type: 'text', pageIndex: 0, x: 520, y: 606 },
    { id: 'birth_village', type: 'text', pageIndex: 0, x: 165, y: 577 },
    { id: 'birth_district', type: 'text', pageIndex: 0, x: 318, y: 577 },
    { id: 'birth_province', type: 'text', pageIndex: 0, x: 489, y: 577 },
    { id: 'curr_village', type: 'text', pageIndex: 0, x: 167, y: 548 },
    { id: 'curr_district', type: 'text', pageIndex: 0, x: 318, y: 548 },
    { id: 'curr_province', type: 'text', pageIndex: 0, x: 490, y: 548 },
    { id: 'phone', type: 'text', pageIndex: 0, x: 144, y: 523 },
    { id: 'email', type: 'text', pageIndex: 0, x: 372, y: 524 },
    { id: 'applicant_photo', type: 'file_photo', pageIndex: 0, x: 480, y: 790, maxWidth: 90, maxHeight: 100 },
    { id: 'sex', type: 'text', pageIndex: 0, x: 39, y: 468 },
    { id: 'nationality', type: 'text', pageIndex: 0, x: 105, y: 468 },
    { id: 'ethnicity', type: 'text', pageIndex: 0, x: 175, y: 468 },
    { id: 'religion', type: 'text', pageIndex: 0, x: 245, y: 468 },
    { id: 'marital_single', type: 'checkbox', pageIndex: 0, x: 312, y: 460 },
    { id: 'marital_married', type: 'checkbox', pageIndex: 0, x: 384, y: 460 },
    { id: 'marital_widow', type: 'checkbox', pageIndex: 0, x: 458, y: 460 },
    { id: 'marital_divorced', type: 'checkbox', pageIndex: 0, x: 534, y: 460 },
    { id: 'motorbike_yes', type: 'checkbox', pageIndex: 0, x: 160, y: 426 },
    { id: 'motorbike_no', type: 'checkbox', pageIndex: 0, x: 217, y: 426 },
    { id: 'motorbike_lic_yes', type: 'checkbox', pageIndex: 0, x: 420, y: 426 },
    { id: 'motorbike_lic_no', type: 'checkbox', pageIndex: 0, x: 479, y: 426 },
    { id: 'car_yes', type: 'checkbox', pageIndex: 0, x: 160, y: 400 },
    { id: 'car_no', type: 'checkbox', pageIndex: 0, x: 218, y: 400 },
    { id: 'car_lic_yes', type: 'checkbox', pageIndex: 0, x: 420, y: 407 },
    { id: 'car_lic_no', type: 'checkbox', pageIndex: 0, x: 480, y: 407 },
    { id: 'car_lic_type', type: 'text', pageIndex: 0, x: 469, y: 392 },
    { id: 'edu1_school', type: 'text', pageIndex: 0, x: 35, y: 320, maxWidth: 180, multiline: true, maxLines: 2 },
    { id: 'edu2_school', type: 'text', pageIndex: 0, x: 35, y: 302, maxWidth: 180, multiline: true, maxLines: 2 },
    { id: 'edu3_school', type: 'text', pageIndex: 0, x: 35, y: 284, maxWidth: 180, multiline: true, maxLines: 2 },
    { id: 'edu1_degree', type: 'text', pageIndex: 0, x: 258, y: 320, maxWidth: 100, multiline: true, maxLines: 2 },
    { id: 'edu2_degree', type: 'text', pageIndex: 0, x: 258, y: 302, maxWidth: 100, multiline: true, maxLines: 2 },
    { id: 'edu3_degree', type: 'text', pageIndex: 0, x: 258, y: 284, maxWidth: 100, multiline: true, maxLines: 2 },
    { id: 'edu1_major', type: 'text', pageIndex: 0, x: 380, y: 320, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'edu2_major', type: 'text', pageIndex: 0, x: 380, y: 302, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'edu3_major', type: 'text', pageIndex: 0, x: 380, y: 284, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'edu1_year', type: 'text', pageIndex: 0, x: 485, y: 320, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'edu2_year', type: 'text', pageIndex: 0, x: 485, y: 302, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'edu3_year', type: 'text', pageIndex: 0, x: 485, y: 284, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'train1_topic', type: 'text', pageIndex: 0, x: 33, y: 232, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'train2_topic', type: 'text', pageIndex: 0, x: 33, y: 216, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'train3_topic', type: 'text', pageIndex: 0, x: 33, y: 198, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'train1_by', type: 'text', pageIndex: 0, x: 156, y: 232, maxWidth: 120, multiline: true, maxLines: 2 },
    { id: 'train2_by', type: 'text', pageIndex: 0, x: 156, y: 216, maxWidth: 120, multiline: true, maxLines: 2 },
    { id: 'train3_by', type: 'text', pageIndex: 0, x: 156, y: 198, maxWidth: 120, multiline: true, maxLines: 2 },
    { id: 'train1_date', type: 'text', pageIndex: 0, x: 310, y: 232, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'train2_date', type: 'text', pageIndex: 0, x: 310, y: 216, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'train3_date', type: 'text', pageIndex: 0, x: 310, y: 198, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'train1_place', type: 'text', pageIndex: 0, x: 432, y: 232, maxWidth: 140, multiline: true, maxLines: 2 },
    { id: 'train2_place', type: 'text', pageIndex: 0, x: 432, y: 216, maxWidth: 140, multiline: true, maxLines: 2 },
    { id: 'train3_place', type: 'text', pageIndex: 0, x: 432, y: 198, maxWidth: 140, multiline: true, maxLines: 2 },
    { id: 'com_word_vgood', type: 'checkbox', pageIndex: 0, x: 333, y: 142 },
    { id: 'com_word_good', type: 'checkbox', pageIndex: 0, x: 433, y: 142 },
    { id: 'com_word_weak', type: 'checkbox', pageIndex: 0, x: 530, y: 142 },
    { id: 'com_excel_vgood', type: 'checkbox', pageIndex: 0, x: 333, y: 120 },
    { id: 'com_excel_good', type: 'checkbox', pageIndex: 0, x: 433, y: 120 },
    { id: 'com_excel_weak', type: 'checkbox', pageIndex: 0, x: 530, y: 120 },
    { id: 'com_ppt_vgood', type: 'checkbox', pageIndex: 0, x: 333, y: 97 },
    { id: 'com_ppt_good', type: 'checkbox', pageIndex: 0, x: 434, y: 97 },
    { id: 'com_ppt_weak', type: 'checkbox', pageIndex: 0, x: 530, y: 97 },
    { id: 'com_others_name', type: 'text', pageIndex: 0, x: 94, y: 75 },
    { id: 'com_oth_vgood', type: 'checkbox', pageIndex: 0, x: 333, y: 73 },
    { id: 'com_oth_good', type: 'checkbox', pageIndex: 0, x: 434, y: 73 },
    { id: 'com_oth_weak', type: 'checkbox', pageIndex: 0, x: 530, y: 73 },
    { id: 'lang_eng_read_good', type: 'checkbox', pageIndex: 1, x: 160, y: 744 },
    { id: 'lang_eng_read_fair', type: 'checkbox', pageIndex: 1, x: 208, y: 744 },
    { id: 'lang_eng_read_weak', type: 'checkbox', pageIndex: 1, x: 258, y: 744 },
    { id: 'lang_eng_write_good', type: 'checkbox', pageIndex: 1, x: 308, y: 744 },
    { id: 'lang_eng_write_fair', type: 'checkbox', pageIndex: 1, x: 358, y: 744 },
    { id: 'lang_eng_write_weak', type: 'checkbox', pageIndex: 1, x: 404, y: 744 },
    { id: 'lang_eng_speak_good', type: 'checkbox', pageIndex: 1, x: 446, y: 744 },
    { id: 'lang_eng_speak_fair', type: 'checkbox', pageIndex: 1, x: 493, y: 744 },
    { id: 'lang_eng_speak_weak', type: 'checkbox', pageIndex: 1, x: 550, y: 744 },
    { id: 'lang_chi_read_good', type: 'checkbox', pageIndex: 1, x: 160, y: 728 },
    { id: 'lang_chi_read_fair', type: 'checkbox', pageIndex: 1, x: 208, y: 728 },
    { id: 'lang_chi_read_weak', type: 'checkbox', pageIndex: 1, x: 258, y: 728 },
    { id: 'lang_chi_write_good', type: 'checkbox', pageIndex: 1, x: 308, y: 728 },
    { id: 'lang_chi_write_fair', type: 'checkbox', pageIndex: 1, x: 358, y: 728 },
    { id: 'lang_chi_write_weak', type: 'checkbox', pageIndex: 1, x: 404, y: 728 },
    { id: 'lang_chi_speak_good', type: 'checkbox', pageIndex: 1, x: 446, y: 728 },
    { id: 'lang_chi_speak_fair', type: 'checkbox', pageIndex: 1, x: 493, y: 728 },
    { id: 'lang_chi_speak_weak', type: 'checkbox', pageIndex: 1, x: 550, y: 728 },
    { id: 'lang_vie_read_good', type: 'checkbox', pageIndex: 1, x: 160, y: 714 },
    { id: 'lang_vie_read_fair', type: 'checkbox', pageIndex: 1, x: 208, y: 714 },
    { id: 'lang_vie_read_weak', type: 'checkbox', pageIndex: 1, x: 258, y: 714 },
    { id: 'lang_vie_write_good', type: 'checkbox', pageIndex: 1, x: 308, y: 714 },
    { id: 'lang_vie_write_fair', type: 'checkbox', pageIndex: 1, x: 358, y: 714 },
    { id: 'lang_vie_write_weak', type: 'checkbox', pageIndex: 1, x: 404, y: 714 },
    { id: 'lang_vie_speak_good', type: 'checkbox', pageIndex: 1, x: 446, y: 714 },
    { id: 'lang_vie_speak_fair', type: 'checkbox', pageIndex: 1, x: 493, y: 714 },
    { id: 'lang_vie_speak_weak', type: 'checkbox', pageIndex: 1, x: 550, y: 714 },
    { id: 'lang_hmo_read_good', type: 'checkbox', pageIndex: 1, x: 160, y: 698 },
    { id: 'lang_hmo_read_fair', type: 'checkbox', pageIndex: 1, x: 208, y: 698 },
    { id: 'lang_hmo_read_weak', type: 'checkbox', pageIndex: 1, x: 258, y: 698 },
    { id: 'lang_hmo_write_good', type: 'checkbox', pageIndex: 1, x: 308, y: 698 },
    { id: 'lang_hmo_write_fair', type: 'checkbox', pageIndex: 1, x: 358, y: 698 },
    { id: 'lang_hmo_write_weak', type: 'checkbox', pageIndex: 1, x: 404, y: 698 },
    { id: 'lang_hmo_speak_good', type: 'checkbox', pageIndex: 1, x: 446, y: 698 },
    { id: 'lang_hmo_speak_fair', type: 'checkbox', pageIndex: 1, x: 493, y: 698 },
    { id: 'lang_hmo_speak_weak', type: 'checkbox', pageIndex: 1, x: 550, y: 698 },
    { id: 'lang_others_name', type: 'text', pageIndex: 1, x: 112, y: 681, size: 8, maxWidth: 30 },
    { id: 'lang_oth_read_good', type: 'checkbox', pageIndex: 1, x: 160, y: 682 },
    { id: 'lang_oth_read_fair', type: 'checkbox', pageIndex: 1, x: 208, y: 682 },
    { id: 'lang_oth_read_weak', type: 'checkbox', pageIndex: 1, x: 258, y: 682 },
    { id: 'lang_oth_write_good', type: 'checkbox', pageIndex: 1, x: 308, y: 682 },
    { id: 'lang_oth_write_fair', type: 'checkbox', pageIndex: 1, x: 358, y: 682 },
    { id: 'lang_oth_write_weak', type: 'checkbox', pageIndex: 1, x: 404, y: 682 },
    { id: 'lang_oth_speak_good', type: 'checkbox', pageIndex: 1, x: 446, y: 682 },
    { id: 'lang_oth_speak_fair', type: 'checkbox', pageIndex: 1, x: 493, y: 682 },
    { id: 'lang_oth_speak_weak', type: 'checkbox', pageIndex: 1, x: 550, y: 682 },
    { id: 'special_skills', type: 'text', pageIndex: 1, x: 30, y: 634, maxWidth: 550, multiline: true, maxLines: 4 },
    { id: 'emp1_company', type: 'text', pageIndex: 1, x: 34, y: 516, maxWidth: 60, multiline: true, maxLines: 2 },
    { id: 'emp2_company', type: 'text', pageIndex: 1, x: 34, y: 457, maxWidth: 60, multiline: true, maxLines: 2 },
    { id: 'emp1_start_date', type: 'text', pageIndex: 1, x: 105, y: 516, maxWidth: 75, multiline: true, maxLines: 2 },
    { id: 'emp2_start_date', type: 'text', pageIndex: 1, x: 105, y: 457, maxWidth: 75, multiline: true, maxLines: 2 },
    { id: 'emp1_end_date', type: 'text', pageIndex: 1, x: 190, y: 516, maxWidth: 85, multiline: true, maxLines: 2 },
    { id: 'emp2_end_date', type: 'text', pageIndex: 1, x: 190, y: 457, maxWidth: 85, multiline: true, maxLines: 2 },
    { id: 'emp1_pos', type: 'text', pageIndex: 1, x: 290, y: 516, maxWidth: 95, multiline: true, maxLines: 2 },
    { id: 'emp2_pos', type: 'text', pageIndex: 1, x: 290, y: 457, maxWidth: 95, multiline: true, maxLines: 2 },
    { id: 'emp1_salary', type: 'text', pageIndex: 1, x: 400, y: 516, maxWidth: 65, multiline: true, maxLines: 2 },
    { id: 'emp2_salary', type: 'text', pageIndex: 1, x: 385, y: 457, maxWidth: 65, multiline: true, maxLines: 2 },
    { id: 'emp1_reason', type: 'text', pageIndex: 1, x: 475, y: 516, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'emp1_desc', type: 'text', pageIndex: 1, x: 110, y: 495, maxWidth: 450, multiline: true, maxLines: 2 },
    { id: 'emp2_reason', type: 'text', pageIndex: 1, x: 475, y: 457, maxWidth: 90, multiline: true, maxLines: 2 },
    { id: 'emp2_desc', type: 'text', pageIndex: 1, x: 110, y: 438, maxWidth: 450, multiline: true, maxLines: 2 },
    { id: 'emg1_name', type: 'text', pageIndex: 1, x: 32, y: 363, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'emg2_name', type: 'text', pageIndex: 1, x: 32, y: 344, maxWidth: 115, multiline: true, maxLines: 2 },
    { id: 'emg1_address', type: 'text', pageIndex: 1, x: 190, y: 363, maxWidth: 170, multiline: true, maxLines: 2 },
    { id: 'emg2_address', type: 'text', pageIndex: 1, x: 190, y: 344, maxWidth: 170, multiline: true, maxLines: 2 },
    { id: 'emg1_phone', type: 'text', pageIndex: 1, x: 370, y: 363, maxWidth: 95, multiline: true, maxLines: 2 },
    { id: 'emg2_phone', type: 'text', pageIndex: 1, x: 370, y: 344, maxWidth: 95, multiline: true, maxLines: 2 },
    { id: 'emg1_relation', type: 'text', label: 'ຄວາມສຳພັນ 1', pageIndex: 1, x: 480, y: 363, section: '12. ບຸກຄົນອ້າງອີງ/ສຸກເສີນ', maxWidth: 80, multiline: true, maxLines: 2 },
    { id: 'emg2_relation', type: 'text', label: 'ຄວາມສຳພັນ 2', pageIndex: 1, x: 480, y: 344, section: '12. ບຸກຄົນອ້າງອີງ/ສຸກເສີນ', maxWidth: 80, multiline: true, maxLines: 2 },
    { id: 'applicant_resume', type: 'file_multiple', label: 'ເອກະສານຄັດຕິດ ອື່ນໆ', pageIndex: 1, x: 0, y: 0, section: '13. ເອກະສານ ແລະ ການຢືນຢັນ', required: false },
    { id: 'applicant_signature', type: 'file_signature', label: 'ຮູບລາຍເຊັນ', pageIndex: 1, x: 390, y: 210, maxWidth: 150, maxHeight: 45, section: '13. ເອກະສານ ແລະ ການຢືນຢັນ', required: true },
    { id: 'sign_date', type: 'date', label: 'ວັນທີສະໝັກ (Date Applied)', pageIndex: 1, x: 35, y: 255, x_month: 75, x_year: 110, section: '13. ເອກະສານ ແລະ ການຢືນຢັນ' }
  ]
};

// ================================================================
// 2. Lao Font Shaping & Cluster Functions
// ================================================================
const LAO_COMBINING = new Set(['ັ', 'ິ', 'ີ', 'ຶ', 'ື', 'ຸ', 'ູ', 'ົ', 'ຼ', '່', '້', '໊', '໋', '໌', 'ໍ']);
const LAO_UPPER_VOWELS = new Set(['ັ', 'ິ', 'ີ', 'ຶ', 'ື', 'ົ', 'ໍ']);
const LAO_LOWER_VOWELS = new Set(['ຸ', 'ູ']);
const LAO_TONE_MARKS = new Set(['່', '້', '໊', '໋', '໌']);

// 🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯
// 📌 ບ່ອນປັບຄ່າຕຳແໜ່ງ ສະລະ/ວັນນະຍຸດ (LAO_FONT_CONFIG) - ຢູ່ບັນທັດ 168
// 🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯
const LAO_FONT_CONFIG = {
  // 1. 👈 ປັບເລື່ອນ ຊ້າຍ/ຂວາ (ແກນ X) ຢູ່ບ່ອນນີ້:
  //    - ຄ່າລົບ (-) ເຊັ່ນ -1.5 (ເລື່ອນໄປຊ້າຍ)
  //    - ຄ່າບວກ (+) ເຊັ່ນ 0 ຫຼື 1.0 (ເລື່ອນໄປຂວາ)
  xOffset: 0,

  // 2. ຄວາມສູງວັນນະຍຸດ (່, ້, ໊, ໋) ເມື່ອຊ້ອນເທິງສະລະ:
  toneAboveVowelYRatio: 0.32,

  // 3. ຄວາມສູງສະລະເທິງ (ັ, ິ, ີ, ຶ, ື, ົ, ໍ):
  upperVowelYRatio: 0.0,

  // 4. ຄວາມສູງສະລະລຸ່ມ (ຸ, ູ):
  lowerVowelYRatio: 0.0
};
// 🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯

function isLaoCombiningChar(char) {
  return LAO_COMBINING.has(char) || /[\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECD]/.test(char);
}

function parseLaoClusters(textStr) {
  const segments = [];
  const str = String(textStr || '');
  for (let i = 0; i < str.length; i++) {
    let segment = str[i];
    while (i + 1 < str.length && isLaoCombiningChar(str[i + 1])) {
      segment += str[i + 1];
      i++;
    }
    segments.push(segment);
  }
  return segments;
}

function drawLaoText(page, text, options) {
  if (!options.font || typeof text !== 'string') {
    page.drawText(String(text || ''), options);
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

  const color = options.color;
  let currentX = options.x || 0;
  const y = options.y || 0;
  let baseX = currentX;
  let prevCharWasUpperVowel = false;

  for (let i = 0; i < drawTextStr.length; i++) {
    const char = drawTextStr[i];
    if (LAO_COMBINING.has(char)) {
      let yOffset = 0;

      if (LAO_TONE_MARKS.has(char) && prevCharWasUpperVowel) {
        yOffset += size * LAO_FONT_CONFIG.toneAboveVowelYRatio;
      } else if (LAO_UPPER_VOWELS.has(char)) {
        yOffset += size * LAO_FONT_CONFIG.upperVowelYRatio;
      } else if (LAO_LOWER_VOWELS.has(char)) {
        yOffset += size * LAO_FONT_CONFIG.lowerVowelYRatio;
      }

      const charX = baseX + LAO_FONT_CONFIG.xOffset;
      const charY = y + yOffset;

      page.drawText(char, { font, size, x: charX, y: charY, color });

      if (LAO_UPPER_VOWELS.has(char)) {
        prevCharWasUpperVowel = true;
      }
    } else {
      baseX = currentX;
      const charWidth = font.widthOfTextAtSize(char, size);
      page.drawText(char, { font, size, x: currentX, y, color });
      currentX += charWidth;
      prevCharWasUpperVowel = false;
    }
  }
}

function parseDateParts(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-\/]/);
    const yyyy = parts[0];
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].substring(0, 2).padStart(2, '0');
    return { dd, mm, yyyy };
  }

  if (str.includes('T') && !isNaN(Date.parse(str))) {
    const d = new Date(str);
    return {
      dd: String(d.getDate()).padStart(2, '0'),
      mm: String(d.getMonth() + 1).padStart(2, '0'),
      yyyy: String(d.getFullYear())
    };
  }

  const parts = str.split(/[-\/]/);
  if (parts.length === 3) {
    const n1 = parseInt(parts[0], 10);
    const n2 = parseInt(parts[1], 10);
    const yr = parts[2].substring(0, 4);

    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 > 12) {
        return { dd: String(n1).padStart(2, '0'), mm: String(n2).padStart(2, '0'), yyyy: yr };
      }
      if (n2 > 12) {
        return { dd: String(n2).padStart(2, '0'), mm: String(n1).padStart(2, '0'), yyyy: yr };
      }
      return { dd: String(n1).padStart(2, '0'), mm: String(n2).padStart(2, '0'), yyyy: yr };
    }
  }

  return null;
}

// ================================================================
// 3. Full PDF Generation Pipeline
// ================================================================
async function generateForm20PDF(bodyData = {}, options = {}) {
  const possibleTemplatePaths = [
    path.join(__dirname, '../public/templates/application_form_template.pdf'),
    path.join(__dirname, '../public/templates/20. ແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ (13).pdf'),
    path.join(__dirname, '../client/public/form_template.pdf'),
    path.join(__dirname, './templates/form_template.pdf'),
    path.join(process.cwd(), 'public/templates/application_form_template.pdf'),
    path.join(process.cwd(), 'client/public/form_template.pdf'),
  ];

  let templatePath = options.templatePath;
  if (!templatePath) {
    templatePath = possibleTemplatePaths.find(p => fs.existsSync(p));
  }

  if (!templatePath || !fs.existsSync(templatePath)) {
    throw new Error('PDF template file not found.');
  }

  const fontPath = options.fontPath || path.join(__dirname, '../public/fonts/Phetsarath OT.ttf');
  const existingPdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  pdfDoc.registerFontkit(fontkit);
  let customFont = null;
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    customFont = await pdfDoc.embedFont(fontBytes);
  }

  const pages = pdfDoc.getPages();

  // Dynamic Font Auto-Scaling Calculation
  const fieldTargetSizes = {};
  FORM_20.fields.forEach(field => {
    const val = bodyData[field.id];
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

  const groupMinSizes = {};
  Object.keys(fieldTargetSizes).forEach(fid => {
    let group = null;
    if (fid.startsWith('edu')) group = 'edu';
    else if (fid.startsWith('train')) group = 'train';
    else if (fid.startsWith('emp') || fid === 'special_skills') group = 'emp';
    else if (fid.startsWith('emg')) group = 'emg';

    if (group) {
      const size = fieldTargetSizes[fid];
      if (groupMinSizes[group] === undefined || size < groupMinSizes[group]) {
        groupMinSizes[group] = size;
      }
    }
  });

  // Field Drawing Loop
  FORM_20.fields.forEach(field => {
    const page = pages[field.pageIndex] || pages[0];
    const val = bodyData[field.id];
    if (field.type === 'checkbox' && (val === 'true' || val === true || val === 'on')) {
      page.drawLine({ start: { x: field.x, y: field.y + 6 }, end: { x: field.x + 4, y: field.y + 2 }, thickness: 1.5, color: rgb(0, 0, 0) });
      page.drawLine({ start: { x: field.x + 4, y: field.y + 2 }, end: { x: field.x + 10, y: field.y + 10 }, thickness: 1.5, color: rgb(0, 0, 0) });
    } else if (val && field.type === 'date') {
      const parsed = parseDateParts(val);
      if (parsed) {
        const textOptions = { size: 10, color: rgb(0, 0, 0) };
        if (customFont) textOptions.font = customFont;
        const baseY = field.y - 4;
        drawLaoText(page, parsed.dd, { ...textOptions, x: field.x, y: baseY });
        drawLaoText(page, parsed.mm, { ...textOptions, x: field.x_month || field.x + 38, y: baseY });
        drawLaoText(page, parsed.yyyy, { ...textOptions, x: field.x_year || field.x + 78, y: baseY });
      } else {
        const textOptions = { x: field.x, y: field.y - 4, size: 10, color: rgb(0, 0, 0) };
        if (customFont) textOptions.font = customFont;
        drawLaoText(page, String(val), textOptions);
      }
    } else if (val && field.type !== 'checkbox' && field.type !== 'file') {
      let drawSize = field.multiline ? 7.5 : 10;
      let group = null;
      if (field.id.startsWith('edu')) group = 'edu';
      else if (field.id.startsWith('train')) group = 'train';
      else if (field.id.startsWith('emp') || field.id === 'special_skills') group = 'emp';
      else if (field.id.startsWith('emg')) group = 'emg';

      if (group && groupMinSizes[group] !== undefined) {
        drawSize = groupMinSizes[group];
      } else if (fieldTargetSizes[field.id] !== undefined) {
        drawSize = fieldTargetSizes[field.id];
      }

      const textOptions = { x: field.x, y: field.y, size: field.size || drawSize, color: rgb(0, 0, 0) };
      if (customFont) textOptions.font = customFont;

      if (field.multiline && customFont && field.maxWidth) {
        const segments = parseLaoClusters(val);

        const lines = [];
        let currentLine = '';
        for (const seg of segments) {
          if (seg === '\n') {
            lines.push(currentLine);
            currentLine = '';
            continue;
          }
          const testLine = currentLine + seg;
          const testWidth = customFont.widthOfTextAtSize(testLine, drawSize);
          if (testWidth > field.maxWidth) {
            if (currentLine !== '') {
              lines.push(currentLine);
              currentLine = seg;
            } else {
              lines.push(seg);
              currentLine = '';
            }
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine !== '') {
          lines.push(currentLine);
        }

        let finalLines = lines;
        const maxLines = field.maxLines || 3;
        if (lines.length > maxLines) {
          finalLines = lines.slice(0, maxLines - 1);
          let lastLineText = lines.slice(maxLines - 1).join('');
          if (customFont && field.maxWidth) {
            while (lastLineText.length > 0 && customFont.widthOfTextAtSize(lastLineText + '...', drawSize) > field.maxWidth) {
              lastLineText = lastLineText.slice(0, -1);
            }
            lastLineText = lastLineText + '...';
          }
          finalLines.push(lastLineText);
        }

        const lineSpacing = drawSize * 1.15;
        const yOffset = ((finalLines.length - 1) * lineSpacing) / 2;
        finalLines.forEach((lineText, idx) => {
          const lineOptions = { ...textOptions, y: field.y + yOffset - idx * lineSpacing };
          drawLaoText(page, lineText, lineOptions);
        });
      } else {
        let drawTextStr = String(val);
        if (customFont && field.maxWidth) {
          let textWidth = customFont.widthOfTextAtSize(drawTextStr, drawSize);
          if (textWidth > field.maxWidth) {
            while (drawTextStr.length > 0 && customFont.widthOfTextAtSize(drawTextStr + '...', drawSize) > field.maxWidth) {
              drawTextStr = drawTextStr.slice(0, -1);
            }
            drawTextStr = drawTextStr + '...';
          }
        }
        drawLaoText(page, drawTextStr, textOptions);
      }
    }
  });

  // Embed Signature if path provided
  if (options.signaturePath && fs.existsSync(options.signaturePath)) {
    try {
      const sigField = FORM_20.fields.find(f => f.id === 'applicant_signature');
      const sigX = sigField ? sigField.x : 390;
      const sigY = sigField ? sigField.y : 210;
      const sigMaxWidth = sigField && sigField.maxWidth ? sigField.maxWidth : 150;
      const sigMaxHeight = sigField && sigField.maxHeight ? sigField.maxHeight : 45;

      const page2 = pages[1] || pages[0];
      const signatureImageBytes = fs.readFileSync(options.signaturePath);
      let pngImage;
      if (options.signaturePath.endsWith('.jpg') || options.signaturePath.endsWith('.jpeg')) {
        pngImage = await pdfDoc.embedJpg(signatureImageBytes);
      } else {
        pngImage = await pdfDoc.embedPng(signatureImageBytes);
      }
      const pngDims = pngImage.scaleToFit(sigMaxWidth, sigMaxHeight);
      page2.drawImage(pngImage, { x: sigX, y: sigY, width: pngDims.width, height: pngDims.height });
    } catch (sigErr) {
      console.error('Failed to embed signature into PDF:', sigErr);
    }
  }

  // Embed Photo if path provided
  if (options.photoPath && fs.existsSync(options.photoPath)) {
    try {
      const photoField = FORM_20.fields.find(f => f.id === 'applicant_photo');
      if (photoField) {
        const photoBytes = fs.readFileSync(options.photoPath);
        let pdfImage;
        if (options.photoPath.endsWith('.jpg') || options.photoPath.endsWith('.jpeg')) {
          pdfImage = await pdfDoc.embedJpg(photoBytes);
        } else {
          pdfImage = await pdfDoc.embedPng(photoBytes);
        }
        const pngDims = pdfImage.scaleToFit(photoField.maxWidth, photoField.maxHeight);
        const xOffset = (photoField.maxWidth - pngDims.width) / 2;
        const yOffset = (photoField.maxHeight - pngDims.height) / 2;

        pages[0].drawImage(pdfImage, {
          x: photoField.x + xOffset,
          y: (photoField.y - photoField.maxHeight) + yOffset,
          width: pngDims.width,
          height: pngDims.height
        });
      }
    } catch (photoErr) {
      console.error('Failed to embed photo into PDF:', photoErr);
    }
  }

  return await pdfDoc.save();
}

// ================================================================
// 4. Standalone Sample Execution Runner
// ================================================================
if (require.main === module) {
  (async () => {
    console.log('Generating Form 20 PDF sample directly from 555.js...');

    const sampleData = {
      pos_applying: 'ນັກພັດທະນາ ຊອບແວ (Software Developer)',
      first_name: 'ສົມໄຊ',
      last_name: 'ພອນສະຫວັນ',
      dob: '1995-05-15',
      age: '29',
      birth_village: 'ໂພນໄຊ',
      birth_district: 'ໄຊເສດຖາ',
      birth_province: 'ນະຄອນຫຼວງວຽງຈັນ',
      curr_village: 'ດົງໂດກ',
      curr_district: 'ໄຊທານີ',
      curr_province: 'ນະຄອນຫຼວງວຽງຈັນ',
      phone: '020 5555 8888',
      email: 'somchai.p@example.com',
      sex: 'ຊາຍ',
      nationality: 'ລາວ',
      ethnicity: 'ລາວ',
      religion: 'ພຸດ',
      marital_single: true,
      motorbike_yes: true,
      motorbike_lic_yes: true,
      car_yes: true,
      car_lic_yes: true,
      car_lic_type: 'B',
      edu1_school: 'ມະຫາວິທະຍາໄລແຫ່ງຊາດ (ມຊ)',
      edu1_degree: 'ປະລິນຍາຕີ',
      edu1_major: 'ວິທະຍາສາດ ຄອມພິວເຕີ',
      edu1_year: '2013 - 2017',
      train1_topic: 'React & Node.js Web Development',
      train1_by: 'Lao-IT Institute',
      train1_date: '2020',
      train1_place: 'ນະຄອນຫຼວງວຽງຈັນ',
      com_word_vgood: true,
      com_excel_good: true,
      com_ppt_vgood: true,
      lang_eng_read_good: true,
      lang_eng_write_good: true,
      lang_eng_speak_fair: true,
      special_skills: 'Full Stack Web Development, Docker, Git, Database Architecture',
      emp1_company: 'Lao Tech Co., Ltd',
      emp1_start_date: '01/2018',
      emp1_end_date: '12/2021',
      emp1_pos: 'Frontend Developer',
      emp1_salary: '8,000,000 LAK',
      emp1_reason: 'ຊອກຫາໂອກາດໃໝ່',
      emp1_desc: 'ພັດທະນາ Web Application ດ້ວຍ React & TailwindCSS',
      emg1_name: 'ທ້າວ ບຸນມີ ພອນສະຫວັນ',
      emg1_address: 'ບ້ານ ໂພນໄຊ, ເມືອງ ໄຊເສດຖາ',
      emg1_phone: '020 2222 9999',
      emg1_relation: 'ອ້າຍ',
      sign_date: '28/08/2026'
    };

    const outputPath = path.join(__dirname, '555_sample_output.pdf');
    try {
      const pdfBytes = await generateForm20PDF(sampleData);
      fs.writeFileSync(outputPath, pdfBytes);
      console.log(`✅ Success! Form 20 PDF successfully generated at:\n   ${outputPath}`);
    } catch (err) {
      console.error('❌ Error generating PDF:', err.message);
    }
  })();
}

module.exports = {
  FORM_20,
  drawLaoText,
  parseLaoClusters,
  isLaoCombiningChar,
  generateForm20PDF
};
