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

// Left leaf: identity page
// Circular seal and its topographic winter-pass symbol.
ellipse(272, 74, 22, 22, ink, false, 2); ellipse(272, 74, 17, 17, '#829084', false, 1);
poly([[258, 80], [266, 68], [272, 77], [280, 64], [287, 80]], ink);
line(257, 83, 287, 83, ink, 1);
centerText('THE CANTONS OF TALVEN', 272, 103, 3, ink, 1);
centerText('KANTONE TALVEN  |  PASSPORT', 272, 128, 1, muted, 2);
line(49, 151, 495, 151, ink, 2); line(49, 155, 495, 155, '#b2b7a7', 1);

// Identification photograph: Ilva Ren, a ventilation technician of Upper Keld.
rect(54, 172, 154, 199, '#cbd4cd'); frame(54, 172, 154, 199, ink, 2);
// Hazy gallery lights and vertical architectural lines in the photo backdrop.
rect(58, 176, 146, 191, '#c4d0ca');
for (let x = 65; x < 202; x += 23) line(x, 178, x - 4, 364, '#b7c5bf', 1);
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
poly([[91, 231], [93, 208], [109, 194], [131, 195], [151, 211], [157, 235], [146, 222], [137, 213], [119, 218], [105, 214]], '#302b29');
// Brows, eyes, nose and a quiet neutral mouth.
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

// A low-contrast duplicate portrait security mark, kept clear of the data.
ellipse(452, 641, 43, 43, '#e4e4d8', false, 2); ellipse(452, 641, 37, 37, '#e9e8dd', false, 1);
ellipse(452, 634, 13, 17, '#e2e3d8');
poly([[427, 674], [432, 658], [443, 649], [461, 649], [472, 659], [477, 674]], '#e2e3d8');
text('TLV  -  05', 54, 606, 1, '#8b9588');
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

// Right leaf: border-control history and the seasonal domicile endorsement.
text('VISAS AND BORDER CONTROL', 543, 50, 3, ink, 0);
text('VISAER  |  STAMPS  |  PAGE 03', 544, 77, 1, muted, 2);
line(542, 96, 977, 96, ink, 2);
text('ENTRY / EXIT RECORD  -  NEIGHBOURING STATES', 544, 108, 1, muted, 1);

function stamp(x: number, y: number, country: string, action: string, port: string, date: string, color: string, code: string) {
  // Four stamps have equal stock, border weight, and type hierarchy.
  rect(x + 1, y + 3, 207, 116, '#eee9dc');
  frame(x, y, 207, 116, color, 2); frame(x + 5, y + 5, 197, 106, color, 1);
  ellipse(x + 19, y + 18, 8, 8, color, false, 1);
  poly([[x + 13, y + 20], [x + 19, y + 11], [x + 25, y + 20]], color);
  centerText(country, x + 112, y + 13, 2, color, 2);
  centerText(action, x + 112, y + 39, 1, ink, 2);
  line(x + 14, y + 56, x + 193, y + 56, '#c7c4b8', 1);
  centerText(date, x + 104, y + 65, 2, color, 1);
  centerText(port, x + 104, y + 89, 1, ink, 2);
  text(code, x + 11, y + 96, 1, muted, 0);
}
stamp(544, 132, 'ORDEL', 'ARRIVAL', 'MOSS GATE', '18 JUN 2025', blue, 'OD-04');
stamp(766, 132, 'ORDEL', 'DEPARTURE', 'MOSS GATE', '22 JUN 2025', red, 'OD-04');
stamp(544, 261, 'SARN', 'ARRIVAL', 'HIGH STEPS', '03 OCT 2025', green, 'SR-11');
stamp(766, 261, 'SARN', 'DEPARTURE', 'HIGH STEPS', '08 OCT 2025', blue, 'SR-11');

// A clear, practical visa/endorsement panel explains Talven's seasonal housing.
rect(544, 405, 433, 283, '#f0eddf'); frame(544, 405, 433, 283, ink, 1);
rect(544, 405, 433, 26, ink);
text('SEASONAL DOMICILE  /  WINTER ENDORSEMENT', 554, 410, 2, '#f7f2e4', 0);
label('REGISTER OF INHABITED GALLERIES', 558, 446);
line(558, 460, 962, 460, '#bcc0b2', 1);
label('REGISTERED HOLDER', 558, 473); label('DOMICILE', 768, 473);
val('ILVA REN', 558, 486, 1); val('GALLERY 04', 768, 486, 1);
label('BERTH', 558, 511); label('CANTON', 768, 511);
val('BAY 118', 558, 524, 1); val('UPPER KELD', 768, 524, 1);
label('VALID FOR THE LOWER WINTER QUARTER', 558, 550);
val('01 NOV 2025  -  30 APR 2026', 558, 565, 1, green);
line(558, 584, 962, 584, '#bcc0b2', 1);
text('A WARMED GALLERY BERTH IS A LEGAL ADDRESS.', 558, 596, 1, ink);
text('RECORD YOUR BAY BEFORE THE FIRST FROST.', 558, 612, 1, ink);
text('PRESENT THIS PAGE AT ANY AIRLOCK REGISTRY.', 558, 628, 1, ink);
text('ISSUED KELD  -  14 OCT 2025  -  REF 04/118', 558, 657, 1, muted);

// Fee impression, later than both neighbouring journeys.
ellipse(899, 753, 52, 52, red, false, 2); ellipse(899, 753, 45, 45, red, false, 1);
centerText('BERTH FEE', 899, 726, 1, red, 1);
centerText('PAID  6 LYR', 899, 745, 1, red, 1);
centerText('14 OCT 2025', 899, 764, 1, red, 1);
centerText('KELD REGISTRY', 899, 783, 1, red, 1);
// Binding / property line, page number and quiet security whorl.
ellipse(590, 781, 28, 28, '#e5e4d8', false, 2); ellipse(590, 781, 20, 20, '#e5e4d8', false, 1);
for (let i = 0; i < 6; i++) line(564, 782 + i * 3, 616, 782 + i * 3, '#e5e4d8', 1);
text('THIS PASSPORT REMAINS THE PROPERTY OF THE CANTONS OF TALVEN.', 544, 829, 1, muted);
text('IF FOUND, RETURN TO THE KELD REGISTRY OF PERSONS.', 544, 845, 1, muted);
line(542, 868, 977, 868, '#b5b9aa', 1);
centerText('REPUBLICAN SERVICE  -  TALVEN REGISTRY  -  2024', 759, 888, 1, muted, 1);
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
