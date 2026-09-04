// Lao PDF Font Shaping and Cluster Helper Module

function isLaoCombiningChar(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    code === 0x0EB1 ||
    (code >= 0x0EB4 && code <= 0x0EBC) ||
    (code >= 0x0EC8 && code <= 0x0ECD)
  );
}

function parseLaoClusters(text) {
  if (!text) return [];
  const str = String(text);
  const clusters = [];
  for (let i = 0; i < str.length; i++) {
    let cluster = str[i];
    while (i + 1 < str.length && isLaoCombiningChar(str[i + 1])) {
      cluster += str[i + 1];
      i++;
    }
    clusters.push(cluster);
  }
  return clusters;
}

function drawLaoText(page, text, options = {}) {
  if (!text && text !== 0) return;
  const { x = 0, y = 0, size = 10, color, font, maxWidth } = options;
  const str = String(text);
  if (font && maxWidth) {
    let drawStr = str;
    try {
      let width = font.widthOfTextAtSize(drawStr, size);
      if (width > maxWidth) {
        while (drawStr.length > 0 && font.widthOfTextAtSize(drawStr + '...', size) > maxWidth) {
          drawStr = drawStr.slice(0, -1);
        }
        drawStr = drawStr + '...';
      }
    } catch (e) {}
    page.drawText(drawStr, { x, y, size, color, font });
  } else {
    page.drawText(str, { x, y, size, color, font });
  }
}

module.exports = {
  isLaoCombiningChar,
  parseLaoClusters,
  drawLaoText
};
