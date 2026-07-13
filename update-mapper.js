const fs = require('fs');
const path = require('path');
const { FORM_20 } = require('./server/form20Schema.js');

const htmlPath = path.join(__dirname, 'client', 'public', 'pdf-mapper.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const fieldsStr = JSON.stringify(FORM_20.fields, null, 4)
  .replace(/"([^"]+)":/g, '$1:')
  .replace(/"/g, "'");

const newHtml = html.replace(/let fields = \[[\s\S]*?\];/, 'let fields = ' + fieldsStr + ';');
fs.writeFileSync(htmlPath, newHtml);
console.log("Updated pdf-mapper.html with latest fields.");
