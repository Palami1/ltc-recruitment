const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { FORM_20 } = require('./form20Schema');

async function createTestPDF() {
  const templatePath = path.join(__dirname, '../public/templates/20. ແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ (13).pdf');
  const outputPath = path.join(__dirname, '../public/templates/test_output.pdf');
  const fontPath = path.join(__dirname, '../public/fonts/Phetsarath OT.ttf');

  if (!fs.existsSync(templatePath)) {
    console.error('Template not found at:', templatePath);
    return;
  }

  const existingPdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  pdfDoc.registerFontkit(fontkit);
  let customFont = null;
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    customFont = await pdfDoc.embedFont(fontBytes);
  }
  
  const zapfFont = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);
  const pages = pdfDoc.getPages();

  FORM_20.fields.forEach(field => {
    const page = pages[field.pageIndex] || pages[0];
    const { height } = page.getSize();
    
    if (field.x === undefined || field.y === undefined || (field.x === 0 && field.y === 0)) return;
    
    // Exact logic from server/index.js
    if (field.type === 'checkbox') {
        page.drawLine({ start: { x: field.x, y: field.y + 6 }, end: { x: field.x + 4, y: field.y + 2 }, thickness: 1.5, color: rgb(1,0,0) }); 
        page.drawLine({ start: { x: field.x + 4, y: field.y + 2 }, end: { x: field.x + 10, y: field.y + 10 }, thickness: 1.5, color: rgb(1,0,0) });
    } else if (field.type === 'date') {
        const textOptions = { size: 10, color: rgb(1, 0, 0) };
        if (customFont) textOptions.font = customFont;
        const baseY = field.y - 4; // Lower baseline slightly
        page.drawText('25', { ...textOptions, x: field.x, y: baseY });
        page.drawText('12', { ...textOptions, x: field.x_month || field.x + 38, y: baseY });
        page.drawText('2026', { ...textOptions, x: field.x_year || field.x + 78, y: baseY });
    } else {
        const textOptions = { x: field.x, y: field.y - 4, size: 10, color: rgb(1, 0, 0) };
        if (customFont) textOptions.font = customFont;
        page.drawText(field.id.substring(0, 8), textOptions); // Show first 8 chars of ID
    }
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('Dummy PDF created successfully at:', outputPath);
}

createTestPDF().catch(console.error);
