'use strict';

const path = require('path');
const QRCode = require('qrcode');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

const ASSETS = path.join(__dirname, '../../assets');
const NAME_FONT = 'SI Bricolage';
const CODE_FONT = 'SI Space Grotesk';

GlobalFonts.registerFromPath(path.join(ASSETS, 'fonts/BricolageGrotesque-Bold.ttf'), NAME_FONT);
GlobalFonts.registerFromPath(path.join(ASSETS, 'fonts/SpaceGrotesk-SemiBold.ttf'), CODE_FONT);

const WIDTH = 1080;
const HEIGHT = 1350;
const FOREST = '#024d3e';
const LOGO = { width: 420, height: 121 };
const QR_SIZE = 720;
const GAP_LOGO_QR = 64;
const GAP_QR_NEXT = 56;
const GAP_CODE_NAME = 28;
const CODE_FONT_SIZE = 38;
const CODE_PADDING = { x: 32, y: 14 };
const CODE_HEIGHT = CODE_FONT_SIZE + CODE_PADDING.y * 2;
const NAME_MAX_WIDTH = WIDTH - 144;
const NAME_MAX_LINES = 3;
const NAME_FONT_SIZES = [60, 52, 44];
const NAME_LINE_RATIO = 1.08;

let logoPromise = null;

/* Charge le logo une seule fois. */
function loadLogo() {
  if (!logoPromise) logoPromise = loadImage(path.join(ASSETS, 'brand/logo-couleur.png'));
  return logoPromise;
}

/* Coupe le nom en lignes qui tiennent dans la largeur. */
function wrapLines(ctx, text) {
  const lines = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > NAME_MAX_WIDTH) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* Vrai si toutes les lignes tiennent en largeur et en nombre. */
function fits(ctx, lines) {
  return lines.length <= NAME_MAX_LINES
    && lines.every((line) => ctx.measureText(line).width <= NAME_MAX_WIDTH);
}

/* Raccourcit la dernière ligne jusqu'à ce qu'elle tienne avec des points de suspension. */
function ellipsize(ctx, line) {
  let text = line;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > NAME_MAX_WIDTH) {
    text = text.slice(0, -1).trimEnd();
  }
  return `${text}…`;
}

/* Choisit la taille du nom : réduit les noms longs, tronque en dernier recours. */
function layoutName(ctx, name) {
  for (const size of NAME_FONT_SIZES) {
    ctx.font = `700 ${size}px "${NAME_FONT}"`;
    const lines = wrapLines(ctx, name);
    if (fits(ctx, lines)) return { size, lines };
  }
  const size = NAME_FONT_SIZES[NAME_FONT_SIZES.length - 1];
  const lines = wrapLines(ctx, name).slice(0, NAME_MAX_LINES);
  lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1]);
  return { size, lines };
}

/* Dessine les modules du QR, alignés sur des pixels entiers pour rester nets. */
function drawQr(ctx, payload, top) {
  const { modules } = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const cell = Math.floor(QR_SIZE / modules.size);
  const drawn = cell * modules.size;
  const left = Math.round((WIDTH - drawn) / 2);
  const offsetTop = top + Math.round((QR_SIZE - drawn) / 2);
  ctx.fillStyle = '#000000';
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) ctx.fillRect(left + col * cell, offsetTop + row * cell, cell, cell);
    }
  }
}

/* Dessine le code sur son fond vert et renvoie le bas du bloc. */
function drawCode(ctx, code, top) {
  ctx.font = `600 ${CODE_FONT_SIZE}px "${CODE_FONT}"`;
  ctx.letterSpacing = '1.5px';
  const width = ctx.measureText(code).width + CODE_PADDING.x * 2;
  ctx.fillStyle = FOREST;
  ctx.fillRect(Math.round((WIDTH - width) / 2), top, Math.round(width), CODE_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, WIDTH / 2, top + CODE_HEIGHT / 2);
  ctx.letterSpacing = '0px';
  return top + CODE_HEIGHT;
}

/* Génère la carte PNG : logo, QR, code éventuel, puis le nom, centrés en hauteur. */
async function renderQrCard({ payload, name, code = null }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';

  const label = String(name || '').trim() || 'Participant';
  const nameLayout = layoutName(ctx, label);
  const lineHeight = Math.round(nameLayout.size * NAME_LINE_RATIO);
  const nameHeight = nameLayout.lines.length * lineHeight;
  const codeBlock = code ? CODE_HEIGHT + GAP_CODE_NAME : 0;
  const total = LOGO.height + GAP_LOGO_QR + QR_SIZE + GAP_QR_NEXT + codeBlock + nameHeight;

  let y = Math.round((HEIGHT - total) / 2);
  ctx.drawImage(await loadLogo(), (WIDTH - LOGO.width) / 2, y, LOGO.width, LOGO.height);
  y += LOGO.height + GAP_LOGO_QR;
  drawQr(ctx, payload, y);
  y += QR_SIZE + GAP_QR_NEXT;
  if (code) y = drawCode(ctx, String(code), y) + GAP_CODE_NAME;

  ctx.font = `700 ${nameLayout.size}px "${NAME_FONT}"`;
  ctx.letterSpacing = `${-0.02 * nameLayout.size}px`;
  ctx.fillStyle = FOREST;
  ctx.textBaseline = 'middle';
  nameLayout.lines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, y + lineHeight * index + lineHeight / 2);
  });
  ctx.letterSpacing = '0px';

  return canvas.encode('png');
}

/* Même carte, en data URL pour le backoffice. */
async function renderQrCardDataUrl(options) {
  const png = await renderQrCard(options);
  return `data:image/png;base64,${png.toString('base64')}`;
}

module.exports = { renderQrCard, renderQrCardDataUrl };
