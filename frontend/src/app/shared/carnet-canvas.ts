import { Person } from '../models/person.model';
import { resolveAssetUrl } from './app-urls';

export interface CarnetCanvasOptions {
  cardUrl: string;
  validationUrl: string;
}

const CARD_WIDTH = 520;
const CARD_HEIGHT = 920;

export async function drawCarnetToCanvas(
  ctx: CanvasRenderingContext2D,
  person: Person,
  options: CarnetCanvasOptions
): Promise<void> {
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = '#edf2f7';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const cardX = 30;
  const cardY = 20;
  const cardW = 460;
  const cardH = 880;
  const headerH = 112;
  const footerH = 72;
  const footerY = cardY + cardH - footerH;
  const centerX = cardX + cardW / 2;

  roundRect(ctx, cardX, cardY, cardW, cardH, 28, '#ffffff');

  const header = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
  header.addColorStop(0, '#07131f');
  header.addColorStop(0.62, '#0b1d31');
  header.addColorStop(1, '#10263f');
  roundRect(ctx, cardX, cardY, cardW, headerH, 28, header);
  ctx.fillStyle = header;
  ctx.fillRect(cardX, cardY + 28, cardW, headerH - 28);

  ctx.fillStyle = '#1f5aa6';
  ctx.globalAlpha = 0.86;
  ctx.fillRect(cardX, cardY + headerH - 4, cardW, 4);
  ctx.globalAlpha = 1;

  const logo = await loadImage(absoluteAsset('img/Curvas_Azul.png'));
  if (logo) {
    ctx.save();
    ctx.filter = 'brightness(0) invert(1)';
    drawImageContained(ctx, logo, cardX + 46, cardY + 27, 116, 72);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.filter = 'grayscale(1)';
    drawImageContained(ctx, logo, centerX - 12, cardY + headerH + 132, 232, 292);
    ctx.restore();
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.font = '850 18px Arial';
  ctx.fillText('ASSIST POINT', cardX + cardW - 54, cardY + 60);
  ctx.font = '750 14px Arial';
  ctx.fillText('CARNET CORPORATIVO', cardX + cardW - 54, cardY + 86);

  const photo = await loadImage(absoluteAsset(person.avatar || 'img/defecto_perfil.jpeg'));
  const photoRadius = 66;
  const photoX = centerX - photoRadius;
  const photoY = cardY + headerH + 38;
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, photoY + photoRadius, photoRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photo, photoX, photoY, photoRadius * 2, photoRadius * 2);
    ctx.restore();
  }
  ctx.strokeStyle = '#1f5aa6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, photoY + photoRadius, photoRadius + 6, 0, Math.PI * 2);
  ctx.stroke();

  roundRect(ctx, centerX - 54, photoY + 116, 108, 28, 14, statusColor(person.status));
  ctx.fillStyle = '#ffffff';
  ctx.font = '850 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(String(person.status || '').toUpperCase(), centerX, photoY + 135);

  ctx.fillStyle = '#0b2436';
  const nameY = photoY + 181;
  const nameLines = fitMultilineText(ctx, person.fullName, centerX, nameY, 382, 30, 21, 2, '820');

  ctx.fillStyle = '#1f5aa6';
  const roleY = nameY + nameLines * 34 + 15;
  const roleLines = fitMultilineText(ctx, String(person.role || '').toUpperCase(), centerX, roleY, 358, 19, 13, 2, '850');

  ctx.strokeStyle = '#dde3ee';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const dividerY = roleY + roleLines * 22 + 17;
  ctx.moveTo(cardX + 84, dividerY);
  ctx.lineTo(cardX + cardW - 84, dividerY);
  ctx.stroke();

  const details = [
    ['area', 'Área:', person.department],
    ['badge', 'Documento:', person.documentNumber],
    ['blood', 'RH:', person.bloodType || 'No registrado'],
    ['pin', 'Sede:', person.site || 'Colina'],
    ['mode', 'Modalidad:', person.mode],
    ['phone', 'Emergencia:', person.emergencyContact || 'No registrado']
  ];
  const detailsY = dividerY + 26;
  details.forEach(([icon, label, value], index) => {
    drawCanvasDetailRow(ctx, icon, label, String(value || ''), centerX, detailsY + index * 26, 306);
  });

  const qrSize = 138;
  const qrX = centerX - qrSize / 2;
  const qrY = Math.min(detailsY + details.length * 26 + 36, footerY - qrSize - 24);
  const qr = await loadImage(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(options.validationUrl || options.cardUrl)}`);
  if (qr) {
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 2, '#ffffff');
    ctx.strokeStyle = '#dde3ee';
    ctx.lineWidth = 1;
    roundedPath(ctx, qrX, qrY, qrSize, qrSize, 2);
    ctx.stroke();
    ctx.drawImage(qr, qrX + 4, qrY + 4, qrSize - 8, qrSize - 8);
  }
  ctx.fillStyle = '#b8bec8';
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Escanear para validar', centerX, qrY + qrSize + 20);

  const footer = ctx.createLinearGradient(cardX, footerY, cardX + cardW, footerY + footerH);
  footer.addColorStop(0, '#07131f');
  footer.addColorStop(1, '#1f5aa6');
  roundRect(ctx, cardX, footerY, cardW, footerH, 28, footer);
  ctx.fillStyle = footer;
  ctx.fillRect(cardX, footerY, cardW, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.74)';
  ctx.font = '15px Arial';
  ctx.fillText(`Assist Point © ${new Date().getFullYear()} · Carnet digital`, centerX, footerY + 27);
  ctx.fillStyle = '#ffffff';
  fitText(ctx, `Código empleado: ${person.employeeCode || 'No asignado'}`, centerX, footerY + 55, 390, 18, 13, '850');
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filenameBase: string): void {
  const anchor = document.createElement('a');
  anchor.href = canvas.toDataURL('image/png');
  anchor.download = `${filenameBase.replace(/[^a-z0-9_-]+/gi, '_')}.png`;
  anchor.click();
}

export function createCarnetCanvas(scale = 3): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * scale;
  canvas.height = CARD_HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(scale, scale);
  return { canvas, ctx };
}

function fitMultilineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minFontSize: number,
  maxLines: number,
  weight = '400',
  align: CanvasTextAlign = 'center'
): number {
  let size = fontSize;
  let lines = wrapLines(ctx, text, maxWidth, size, weight);
  while ((lines.length > maxLines || lines.some(line => ctx.measureText(line).width > maxWidth)) && size > minFontSize) {
    size -= 1;
    lines = wrapLines(ctx, text, maxWidth, size, weight);
  }
  ctx.textAlign = align;
  ctx.font = `${weight} ${size}px Arial`;
  const rendered = lines.slice(0, maxLines);
  rendered.forEach((line, index) => ctx.fillText(line, x, y + index * (size + 3)));
  return rendered.length;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string): string[] {
  ctx.font = `${weight} ${size}px Arial`;
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minFontSize: number,
  weight = '400',
  align: CanvasTextAlign = 'center'
): void {
  let size = fontSize;
  ctx.textAlign = align;
  ctx.font = `${weight} ${size}px Arial`;
  while (ctx.measureText(String(text || '')).width > maxWidth && size > minFontSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px Arial`;
  }
  ctx.fillText(String(text || ''), x, y);
}

function drawImageContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): void {
  const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  ctx.drawImage(image, x, y + (maxHeight - height) / 2, width, height);
}

function drawCanvasDetailRow(
  ctx: CanvasRenderingContext2D,
  icon: string,
  label: string,
  value: string,
  centerX: number,
  y: number,
  maxWidth: number
): void {
  const iconSize = 17;
  const labelWidth = 88;
  const gap = 10;
  const valueWidth = maxWidth - iconSize - gap - labelWidth - gap;
  const startX = centerX - maxWidth / 2;

  drawMiniIcon(ctx, icon, startX, y - 13, iconSize);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#667085';
  ctx.font = '800 15px Arial';
  ctx.fillText(label, startX + iconSize + gap + labelWidth, y);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#424242';
  ctx.font = '800 15px Arial';
  ctx.fillText(truncateText(ctx, value, valueWidth), startX + iconSize + gap + labelWidth + gap, y);
}

function drawMiniIcon(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = '#1f5aa6';
  ctx.fillStyle = '#1f5aa6';
  ctx.lineWidth = 1.4;

  if (icon === 'mail') {
    ctx.strokeRect(x + 1, y + 3, size - 2, size - 6);
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 3);
    ctx.lineTo(x + size / 2, y + size / 2 + 1);
    ctx.lineTo(x + size - 1, y + 3);
    ctx.stroke();
  } else if (icon === 'pin') {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size - 1);
    ctx.lineTo(x + 3, y + 7);
    ctx.lineTo(x + size - 3, y + 7);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'badge') {
    ctx.strokeRect(x + 2, y + 3, size - 4, size - 4);
    ctx.fillRect(x + 4, y + 1, size - 8, 3);
    ctx.beginPath();
    ctx.arc(x + size / 2, y + 7, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 4, y + 10, size - 8, 1.3);
  } else if (icon === 'area') {
    ctx.strokeRect(x + 1, y + 2, 4, size - 3);
    ctx.strokeRect(x + 7, y + 5, 4, size - 6);
    ctx.fillRect(x + 2.4, y + 4, 1.2, 1.2);
    ctx.fillRect(x + 2.4, y + 7, 1.2, 1.2);
    ctx.fillRect(x + 8.4, y + 7, 1.2, 1.2);
  } else {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1f5aa6';
    ctx.font = '700 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(icon === 'mode' ? 'M' : 'T', x + size / 2, y + size / 2 + 2.5);
  }

  ctx.restore();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const value = String(text || '');
  if (ctx.measureText(value).width <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && ctx.measureText(`${shortened}...`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}...`;
}

function statusColor(status: string): string {
  if (status === 'Activo') return '#2e7d32';
  if (status === 'Suspendido') return '#e65100';
  return '#c62828';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function absoluteAsset(assetPath?: string): string {
  const resolved = resolveAssetUrl(assetPath);
  if (resolved.startsWith('data:') || resolved.startsWith('http')) return resolved;
  return `${window.location.origin}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
