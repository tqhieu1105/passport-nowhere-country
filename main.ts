import fs from 'node:fs';
import zlib from 'node:zlib';

// A self-contained, pixel-drawn travel document.  No browser, fonts, or assets
// are needed at run time; every mark, letter, and check digit is drawn here.
const W = 1024, H = 1024;
const pixels = new Uint8Array(W * H * 4);
const ink = '#203b39', muted = '#63736b', pale = '#f3eedf', paper = '#f7f3e7';
const red = '#944743', blue = '#3d6680', green = '#34705c', gold = '#b18542';
const C = (hex: string) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
};
function dot(x: number, y: number, color: string) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4, c = C(color);
  pixels[i] = c[0]; pixels[i + 1] = c[1]; pixels[i + 2] = c[2]; pixels[i + 3] = 255;
}
function rect(x: number, y: number, w: number, h: number, color: string) {
  const x0 = Math.max(0, Math.floor(x)), x1 = Math.min(W, Math.ceil(x + w));
  const y0 = Math.max(0, Math.floor(y)), y1 = Math.min(H, Math.ceil(y + h));
  const c = C(color);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const i = (yy * W + xx) * 4;
    pixels[i] = c[0]; pixels[i + 1] = c[1]; pixels[i + 2] = c[2]; pixels[i + 3] = 255;
  }
}
function line(x1: number, y1: number, x2: number, y2: number, color: string, thick = 1) {
  const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 1.4) || 1;
  const r = Math.max(0, Math.floor(thick / 2));
  for (let n = 0; n <= steps; n++) {
    const t = n / steps, x = Math.round(x1 + (x2 - x1) * t), y = Math.round(y1 + (y2 - y1) * t);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) dot(x + dx, y + dy, color);
  }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, color: string, fill = true, thick = 1) {
  if (fill) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      const v = (y - cy) / ry;
      if (Math.abs(v) > 1) continue;
      const dx = rx * Math.sqrt(1 - v * v);
      for (let x = Math.ceil(cx - dx); x <= cx + dx; x++) dot(x, y, color);
    }
  } else {
    const count = Math.max(48, Math.ceil((rx + ry) * 4));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      for (let k = -Math.floor(thick / 2); k <= Math.floor(thick / 2); k++)
        dot(cx + (rx + k) * Math.cos(a), cy + (ry + k) * Math.sin(a), color);
    }
  }
}
function poly(points: [number, number][], color: string) {
  const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= xs[i + 1]; x++) dot(x, y, color);
  }
}
function frame(x: number, y: number, w: number, h: number, color: string, t = 1) {
  rect(x, y, w, t, color); rect(x, y + h - t, w, t, color);
  rect(x, y, t, h, color); rect(x + w - t, y, t, h, color);
}

const glyphs: Record<string, string[]> = {
  'A':['01110','10001','10001','11111','10001','10001','10001'], 'B':['11110','10001','10001','11110','10001','10001','11110'],
  'C':['01111','10000','10000','10000','10000','10000','01111'], 'D':['11110','10001','10001','10001','10001','10001','11110'],
  'E':['11111','10000','10000','11110','10000','10000','11111'], 'F':['11111','10000','10000','11110','10000','10000','10000'],
  'G':['01111','10000','10000','10111','10001','10001','01110'], 'H':['10001','10001','10001','11111','10001','10001','10001'],
  'I':['11111','00100','00100','00100','00100','00100','11111'], 'J':['00111','00010','00010','00010','10010','10010','01100'],
  'K':['10001','10010','10100','11000','10100','10010','10001'], 'L':['10000','10000','10000','10000','10000','10000','11111'],
  'M':['10001','11011','10101','10101','10001','10001','10001'], 'N':['10001','11001','11001','10101','10011','10011','10001'],
  'O':['01110','10001','10001','10001','10001','10001','01110'], 'P':['11110','10001','10001','11110','10000','10000','10000'],
  'Q':['01110','10001','10001','10001','10101','10010','01101'], 'R':['11110','10001','10001','11110','10100','10010','10001'],
  'S':['01111','10000','10000','01110','00001','00001','11110'], 'T':['11111','00100','00100','00100','00100','00100','00100'],
  'U':['10001','10001','10001','10001','10001','10001','01110'], 'V':['10001','10001','10001','10001','10001','01010','00100'],
  'W':['10001','10001','10001','10101','10101','10101','01010'], 'X':['10001','10001','01010','00100','01010','10001','10001'],
  'Y':['10001','10001','01010','00100','00100','00100','00100'], 'Z':['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'],
  '<':['00010','00100','01000','10000','01000','00100','00010'], '>':['01000','00100','00010','00001','00010','00100','01000'],
  '-':['00000','00000','00000','11111','00000','00000','00000'], '.':['00000','00000','00000','00000','00000','00110','00110'],
  ',':['00000','00000','00000','00000','00110','00110','00100'], ':':['00000','00110','00110','00000','00110','00110','00000'],
  '/':['00001','00010','00010','00100','01000','01000','10000'], '|':['00100','00100','00100','00100','00100','00100','00100'],
  '+':['00000','00100','00100','11111','00100','00100','00000'], '#':['01010','11111','01010','01010','11111','01010','00000'],
  '(':['00010','00100','01000','01000','01000','00100','00010'], ')':['01000','00100','00010','00010','00010','00100','01000'],
  "'":['00100','00100','00010','00000','00000','00000','00000'], '_':['00000','00000','00000','00000','00000','00000','11111'],
};
function text(s: string, x: number, y: number, scale = 1, color = ink, spacing = 1, align: 'left' | 'center' | 'right' = 'left') {
  s = s.toUpperCase();
  const width = Math.max(0, s.length * (5 * scale + spacing) - spacing);
  if (align === 'center') x -= width / 2;
  if (align === 'right') x -= width;
  let cx = Math.round(x);
  for (const ch of s) {
    const g = glyphs[ch];
    if (g) for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) if (g[gy][gx] === '1')
      rect(cx + gx * scale, y + gy * scale, scale, scale, color);
    cx += 5 * scale + spacing;
  }
  return width;
}
function label(s: string, x: number, y: number) { text(s, x, y, 1, muted, 1); }
function val(s: string, x: number, y: number, scale = 2, color = ink) { text(s, x, y, scale, color, 1); }
function centerText(s: string, cx: number, y: number, scale: number, color: string, spacing = 1) { text(s, cx, y, scale, color, spacing, 'center'); }
function dateCheck(s: string) {
  const weights = [7, 3, 1];
  return String([...s].reduce((sum, ch, i) => sum + (ch === '<' ? 0 : /[0-9]/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 55) * weights[i % 3], 0) % 10);
}

// Book cover and paired leaves
rect(0, 0, W, H, '#21312f');
rect(15, 15, 994, 994, '#486057');
rect(23, 23, 978, 978, pale);
rect(31, 31, 479, 962, paper); rect(514, 31, 479, 962, '#f5f1e5');
rect(505, 23, 14, 978, '#d7cfbb'); rect(508, 23, 6, 978, '#beb7a7');
frame(23, 23, 978, 978, '#1c302d', 2); frame(36, 36, 952, 952, '#8b9889', 1);
// Fine horizontal security waves, almost disappearing into the stock.
for (let y = 45; y < 835; y += 19) for (let page = 0; page < 2; page++) {
  const left = page ? 523 : 43, right = page ? 985 : 501;
  let px = left, py = y;
  for (let x = left + 2; x <= right; x += 3) {
    const yy = y + Math.sin((x - left) / 37 + y / 41) * 3.1;
    line(px, py, x, yy, '#e7e3d7', 1); px = x; py = yy;
  }
}
// Guilloche rosettes and interlaced waves, printed beneath the document text.
// The low-contrast linework reads as security stock without obscuring fields.
for (let page = 0; page < 2; page++) {
  const left = page ? 526 : 38, right = page ? 990 : 500;
  for (let band = 0; band < 5; band++) {
    const cy = 194 + band * 139;
    for (let ring = 0; ring < 3; ring++) {
      let px = left, py = cy;
      for (let x = left; x <= right; x += 3) {
        const t = (x - left) / (right - left) * Math.PI * 8;
        const yy = cy + Math.sin(t + ring * 0.7) * (5 + ring * 3) + Math.sin(t * 2.15 + band) * 2;
        line(px, py, x, yy, '#efecdf', 1); px = x; py = yy;
      }
    }
  }
  // Fine concentric rosettes in the otherwise open outer corners.
  const cx = page ? 952 : 69, cy = 777;
  for (let r = 10; r <= 34; r += 4) {
    let px = cx + r, py = cy;
    for (let a = 0.08; a <= Math.PI * 2 + 0.08; a += 0.08) {
      const wobble = 1.8 * Math.sin(a * 12);
      const x = cx + (r + wobble) * Math.cos(a), y = cy + (r + wobble) * Math.sin(a);
      line(px, py, x, y, '#eae7da', 1); px = x; py = y;
    }
  }
}

// Left leaf: identity page
// Circular seal and its topographic winter-pass symbol.
ellipse(272, 74, 22, 22, ink, false, 2); ellipse(272, 74, 17, 17, '#829084', false, 1);
poly([[258, 80], [266, 68], [272, 77], [280, 64], [287, 80]], ink);
line(257, 83, 287, 83, ink, 1);
centerText('THE CANTONS OF TALVEN', 272, 103, 3, ink, 1);
centerText('KANTONE TALVEN  |  PASSPORT', 272, 128, 1, muted, 2);
centerText('TALVANI  |  PASERA TALVENA', 272, 140, 1, muted, 2);
line(49, 153, 495, 153, ink, 2); line(49, 157, 495, 157, '#b2b7a7', 1);

// Identification photograph: Ilva Ren, a ventilation technician of Upper Keld.
rect(57, 175, 154, 199, '#b5c1bc'); rect(54, 172, 154, 199, '#cbd4cd'); frame(54, 172, 154, 199, ink, 2);
// Hazy gallery lights and vertical architectural lines in the photo backdrop.
rect(58, 176, 146, 191, '#c4d0ca');
for (let x = 65; x < 202; x += 23) line(x, 178, x - 4, 364, '#b7c5bf', 1);
// Soft reflected window light and shadow at the edge of the portrait.
for (let i = 0; i < 8; i++) line(60 + i * 3, 180, 60 + i * 3, 363, '#c8d2cd', 1);
ellipse(102, 221, 15, 15, '#e0e4d9'); ellipse(162, 242, 10, 10, '#e0e4d9');
// Shoulders and dark work coat.
poly([[64, 358], [68, 330], [78, 316], [91, 309], [108, 305], [127, 310], [145, 313], [167, 324], [180, 343], [185, 368], [64, 368]], '#23383b');
poly([[91, 311], [108, 324], [119, 311], [132, 315], [145, 334], [137, 368], [92, 368], [84, 330]], '#344a49');
poly([[102, 303], [105, 286], [132, 285], [135, 315], [120, 325]], '#bd866c');
// Hair behind the face, swept back to a low knot.
ellipse(122, 238, 39, 53, '#302b29'); ellipse(153, 256, 15, 20, '#302b29');
// Face, ears and hairline.
ellipse(87, 249, 6, 11, '#b77d64'); ellipse(158, 249, 6, 11, '#b77d64');
ellipse(123, 248, 32, 43, '#d2a184');
poly([[144, 235], [154, 238], [153, 267], [145, 278], [139, 267]], '#c18e75');
ellipse(112, 238, 13, 24, '#d8ad91');
poly([[91, 231], [93, 208], [109, 194], [131, 195], [151, 211], [157, 235], [146, 222], [137, 213], [119, 218], [105, 214]], '#302b29');
// Individually swept strands give the vector hair directional texture.
for (let i = 0; i < 7; i++) line(98 + i * 7, 211 - (i % 3) * 2, 111 + i * 5, 201 + (i % 2) * 3, '#52433b', 1);
for (let i = 0; i < 4; i++) line(153 + i, 237 + i * 5, 164 + i * 2, 246 + i * 5, '#473a34', 1);
// Brows, eyes, nose and a quiet neutral mouth.
ellipse(109, 261, 8, 3, '#dcae91'); ellipse(139, 262, 8, 3, '#dcae91');
line(101, 242, 114, 241, '#493831', 2); line(132, 241, 145, 243, '#493831', 2);
line(102, 250, 114, 250, '#f1e4d2', 3); line(132, 251, 144, 252, '#f1e4d2', 3);
ellipse(109, 250, 2, 3, '#26302f'); ellipse(138, 251, 2, 3, '#26302f');
line(123, 249, 120, 267, '#a87360', 2); line(120, 267, 126, 268, '#a87360', 1);
line(114, 280, 121, 282, '#814d4b', 2); line(121, 282, 130, 280, '#814d4b', 2);
line(98, 258, 103, 261, '#ca9175', 1); line(142, 259, 147, 256, '#ca9175', 1);
// Workwear seam and small brass breathing-guild pin.
line(78, 340, 103, 329, '#9b9e82', 1); line(146, 330, 168, 344, '#9b9e82', 1);
ellipse(153, 337, 3, 3, gold); line(115, 326, 120, 339, '#b6aa8e', 1); line(120, 339, 126, 326, '#b6aa8e', 1);
label('PHOTOGRAPH  /  35 X 45 MM', 59, 377);

// Typed particulars, using a single measured grid.
label('TYPE', 221, 174); label('CODE', 286, 174); label('PASSPORT NO.', 350, 174);
val('P', 221, 187); val('TLV', 286, 187); val('TV0626418', 350, 187);
line(220, 210, 487, 210, '#c6c8bb', 1);
label('SURNAME / FAMILIENAME', 221, 222); val('REN', 221, 235);
label('GIVEN NAMES / VORNAMEN', 221, 265); val('ILVA', 221, 278);
label('NATIONALITY', 221, 308); label('SEX', 407, 308);
val('TALVENI', 221, 321); val('F', 407, 321);
label('DATE OF BIRTH', 221, 351); label('PLACE OF BIRTH', 348, 351);
val('09 MAY 1991', 221, 364, 1); val('UPPER KELD', 348, 364, 1);
label('DATE OF ISSUE', 221, 394); label('DATE OF EXPIRY', 352, 394);
val('14 FEB 2024', 221, 407, 1); val('13 FEB 2034', 352, 407, 1);
label('AUTHORITY', 221, 437); val('KELD REGISTRY', 221, 450, 1);
line(53, 402, 208, 402, '#a4a899', 1);
text('ILVA REN', 57, 409, 2, '#273d51', 1);
label("HOLDER'S SIGNATURE", 57, 431);

// The gallery domicile entry is repeated in the endorsement as official record.
rect(53, 464, 440, 94, '#eeebdd'); frame(53, 464, 440, 94, green, 1);
rect(53, 464, 440, 18, green); text('OBSERVATIONS / BEMERKUNGEN', 62, 469, 1, '#f8f3e7', 1);
text('UPPER KELD VENTILATION SERVICE', 64, 492, 1, ink);
text('GALLERY TECHNICIAN  -  GUILD 17', 64, 507, 1, ink);
text('WINTER BERTH REGISTERED ON PAGE 03', 64, 522, 1, ink);

// A faint ghost portrait security watermark, identifiable but behind the data.
ellipse(451, 641, 47, 47, '#e8e6db', false, 2); ellipse(451, 641, 40, 40, '#ebe9de', false, 1);
ellipse(451, 635, 17, 21, '#e5e4d8');
ellipse(439, 634, 5, 9, '#e5e4d8'); ellipse(463, 634, 5, 9, '#e5e4d8');
poly([[426, 679], [431, 659], [439, 651], [451, 648], [463, 651], [472, 659], [477, 679]], '#e5e4d8');
poly([[435, 622], [437, 613], [445, 608], [455, 608], [465, 615], [468, 628], [460, 620], [451, 621], [442, 618]], '#e3e2d6');
text('TLV  -  05  -  TV0626418', 54, 606, 1, '#8b9588');
centerText('PERSONAL DOCUMENT  |  RETURN TO A TALVEN REGISTRY', 272, 805, 1, muted, 1);
line(49, 825, 495, 825, '#b4b8a9', 1);

// ICAO 9303 TD3 data and actual check digits.
const doc = 'TV0626418', dob = '910509', expiry = '340213', personal = 'WK11804<<<<<<<';
const mrz1 = ('P<TLVREN<<ILVA' + '<'.repeat(44)).slice(0, 44);
const docField = doc.padEnd(9, '<');
const dcd = dateCheck(docField), bcd = dateCheck(dob), ecd = dateCheck(expiry), pcd = dateCheck(personal);
const composite = dateCheck(docField + dcd + dob + bcd + expiry + ecd + personal + pcd);
const mrz2 = `${docField}${dcd}TLV${dob}${bcd}F${expiry}${ecd}${personal}${pcd}${composite}`;
if (mrz1.length !== 44 || mrz2.length !== 44) throw new Error('MRZ must contain two 44-character TD3 lines');
rect(45, 846, 462, 126, '#e7e1d2'); frame(45, 846, 462, 126, '#a3a797', 1);
label('MACHINE READABLE ZONE  /  ICAO TD3', 55, 853);
centerText(mrz1, 276, 877, 1.5, '#172826', 2);
centerText(mrz2, 276, 906, 1.5, '#172826', 2);
centerText('2', 54, 976, 1, muted, 0);

// Right leaf: border-control history, a neighbouring visa and seasonal record.
text('VISAS AND BORDER CONTROL', 543, 50, 3, ink, 0);
text('VISAER  |  STAMPS  |  PAGE 03', 544, 75, 1, muted, 2);
text('TALVANI  |  VISAJA KONTROLA', 544, 89, 1, muted, 2);
line(542, 105, 977, 105, ink, 2);
text('ENTRY / EXIT RECORD  -  NEIGHBOURING STATES', 544, 113, 1, muted, 1);

function stamp(x: number, y: number, country: string, action: string, port: string, date: string, color: string, code: string) {
  // Paired rectangular entry/exit marks retain the actual border dates.
  rect(x + 1, y + 3, 207, 96, '#eee9dc');
  frame(x, y, 207, 96, color, 2); frame(x + 5, y + 5, 197, 86, color, 1);
  ellipse(x + 19, y + 18, 8, 8, color, false, 1);
  poly([[x + 13, y + 20], [x + 19, y + 11], [x + 25, y + 20]], color);
  centerText(country, x + 112, y + 9, 2, color, 2);
  centerText(action, x + 112, y + 31, 1, ink, 2);
  line(x + 14, y + 45, x + 193, y + 45, '#c7c4b8', 1);
  centerText(date, x + 104, y + 53, 1, color, 1);
  centerText(port, x + 104, y + 73, 1, ink, 2);
  text(code, x + 11, y + 82, 1, muted, 0);
}
stamp(544, 131, 'ORDEL', 'ARRIVAL', 'MOSS GATE', '18 JUN 2025', blue, 'OD-04');
stamp(766, 131, 'ORDEL', 'DEPARTURE', 'MOSS GATE', '22 JUN 2025', red, 'OD-04');
stamp(544, 235, 'SARN', 'ARRIVAL', 'HIGH STEPS', '03 OCT 2025', green, 'SR-11');
stamp(766, 235, 'SARN', 'DEPARTURE', 'HIGH STEPS', '08 OCT 2025', blue, 'SR-11');

function roundStamp(cx: number, cy: number, country: string, line1: string, line2: string, date: string, color: string) {
  ellipse(cx + 2, cy + 2, 47, 43, '#e8e2d5');
  ellipse(cx, cy, 47, 43, color, false, 2); ellipse(cx, cy, 41, 37, color, false, 1);
  centerText(country, cx, cy - 25, 1, color, 1);
  line(cx - 31, cy - 13, cx + 31, cy - 13, color, 1);
  centerText(line1, cx, cy - 6, 1, color, 0);
  centerText(line2, cx, cy + 6, 1, color, 0);
  centerText(date, cx, cy + 20, 1, color, 0);
}
roundStamp(646, 383, 'TALVEN', 'WINTER GALLERY', 'BERTH 118', '01 NOV 2025', green);
roundStamp(872, 383, 'TALVEN', 'GALLERY RELEASE', 'LOWER QUARTER', '30 APR 2026', red);

// The domicile endorsement carries Talven's winter gallery residency rule.
rect(544, 432, 433, 134, '#f0eddf'); frame(544, 432, 433, 134, green, 1);
rect(544, 432, 433, 20, green);
text('SEASONAL DOMICILE  /  WINTER ENDORSEMENT', 552, 437, 1, '#f7f2e4', 1);
text('REGISTERED HOLDER  ILVA REN', 554, 461, 1, ink, 1);
text('GALLERY 04  /  BAY 118  /  UPPER KELD', 554, 476, 1, ink, 1);
text('VALID  01 NOV 2025  -  30 APR 2026', 554, 492, 1, green, 1);
line(554, 506, 967, 506, '#bcc0b2', 1);
text('A WARMED GALLERY BERTH IS A LEGAL ADDRESS.', 554, 515, 1, ink, 1);
text('REGISTER BEFORE FIRST FROST  /  AIRLOCK 04', 554, 530, 1, ink, 1);
text('ISSUED KELD  -  14 OCT 2025  -  REF 04/118', 554, 547, 1, muted, 1);

// Complete Ordel visitor visa: serial, period, class, remarks and barcode.
rect(544, 579, 433, 253, '#eee8d7'); frame(544, 579, 433, 253, blue, 2); frame(550, 585, 421, 241, blue, 1);
rect(550, 585, 421, 26, blue);
text('ORDEL  /  VISITOR VISA  /  VISADO', 561, 591, 2, '#f7f2e4', 1);
text('CLASS C  -  SINGLE ENTRY', 562, 620, 1, ink, 1);
text('NO. OV-25-061047  /  HOLDER ILVA REN', 562, 636, 1, ink, 1);
line(560, 650, 961, 650, '#b4b9af', 1);
text('VALID FROM', 562, 661, 1, muted, 1); text('UNTIL', 766, 661, 1, muted, 1);
text('10 JUN 2025', 562, 674, 1, blue, 1); text('23 JUN 2025', 766, 674, 1, blue, 1);
text('PLACE  MOSS GATE  /  PERMITTED STAY  14 DAYS', 562, 692, 1, ink, 1);
line(560, 706, 961, 706, '#b4b9af', 1);
text('REMARKS  WINTER GALLERY TECHNICIAN.', 562, 716, 1, ink, 1);
text('REGISTER A WARMED BERTH BEFORE FIRST FROST.', 562, 731, 1, ink, 1);
text('AUTHORITY  ORDEL BORDER OFFICE  /  10 JUN 2025', 562, 748, 1, muted, 1);
// Deterministic machine-readable barcode with quiet zones and human-readable key.
const barcode = 'OV25061047';
let bx = 566;
for (let i = 0; i < barcode.length; i++) {
  const n = barcode.charCodeAt(i);
  for (let bit = 0; bit < 7; bit++) {
    const barW = ((n >> bit) & 1) ? 3 : 1;
    rect(bx, 768, barW, 43, ink); bx += barW + 1;
  }
  bx += 2;
}
text(barcode, bx + 10, 785, 1, ink, 1);
// Binding / property line and page number.
text('THIS PASSPORT REMAINS THE PROPERTY OF THE CANTONS OF TALVEN.', 544, 848, 1, muted);
text('IF FOUND, RETURN TO THE KELD REGISTRY OF PERSONS.', 544, 864, 1, muted);
line(542, 882, 977, 882, '#b5b9aa', 1);
centerText('REPUBLICAN SERVICE  -  TALVEN REGISTRY  -  2024', 759, 896, 1, muted, 1);
centerText('3', 976, 976, 1, muted, 0);

// PNG writer using only Node built-ins.
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) raw.set(pixels.subarray(y * W * 4, (y + 1) * W * 4), y * (W * 4 + 1) + 1);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync('/output', { recursive: true });
fs.writeFileSync('/output/entry.png', png);
