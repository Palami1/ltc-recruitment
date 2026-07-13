const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { FORM_20 } = require('./form20Schema');

async function createGridPDF() {
  const templatePath = path.join(__dirname, '../public/templates/20. ແບບຟອມສະໝັກເຂົ້າເຮັດວຽກ (13).pdf');
  const outputPath = path.join(__dirname, '../public/templates/grid_reference.pdf');

  if (!fs.existsSync(templatePath)) {
    console.error('Template not found:', templatePath);
    return;
  }

  const existingPdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();

  pages.forEach((page, pageIndex) => {
    const { width, height } = page.getSize();
    
    // Draw minor grid (every 10)
    for (let x = 0; x < width; x += 10) {
      page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.2, color: rgb(0.8, 0.8, 0.8) });
    }
    for (let y = 0; y < height; y += 10) {
      page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.2, color: rgb(0.8, 0.8, 0.8) });
    }

    // Draw major grid (every 50)
    for (let x = 0; x < width; x += 50) {
      page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.5, color: rgb(0, 0, 1), opacity: 0.5 });
      page.drawText(x.toString(), { x: x + 2, y: 10, size: 8, color: rgb(0, 0, 1) });
      page.drawText(x.toString(), { x: x + 2, y: height - 10, size: 8, color: rgb(0, 0, 1) });
    }
    
    for (let y = 0; y < height; y += 50) {
      page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.5, color: rgb(0, 0, 1), opacity: 0.5 });
      page.drawText(y.toString(), { x: 10, y: y + 2, size: 8, color: rgb(0, 0, 1) });
      page.drawText(y.toString(), { x: width - 25, y: y + 2, size: 8, color: rgb(0, 0, 1) });
    }

    // Draw current mapping points
    FORM_20.fields.forEach(field => {
      if (field.pageIndex === pageIndex && field.x !== undefined && field.y !== undefined) {
        page.drawCircle({ x: field.x, y: field.y, size: 3, color: rgb(1, 0, 0) });
        page.drawText(field.id, { x: field.x + 5, y: field.y + 5, size: 7, color: rgb(1, 0, 0) });
      }
    });
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('Grid reference PDF created at:', outputPath);
}

createGridPDF().catch(console.error);
