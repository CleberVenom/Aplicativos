/**
 * Renders the app icons, splash image and the home-screen demo illustrations from
 * SVG sources defined here (all original artwork — no third-party images).
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Requires the `playwright` dev dependency and a Chromium build available to it.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TERRACOTTA = '#9A4527';
const CREAM = '#F6EBDD';

const arch = (cx, bottom, w, h, fill) =>
  `<path d="M ${cx - w / 2} ${bottom} L ${cx - w / 2} ${bottom - h + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${bottom - h + w / 2} L ${cx + w / 2} ${bottom} Z" fill="${fill}"/>`;

const sparkle = (cx, cy, r, fill) =>
  `<path d="M ${cx} ${cy - r} C ${cx + r * 0.12} ${cy - r * 0.12} ${cx + r * 0.12} ${cy - r * 0.12} ${cx + r} ${cy} C ${cx + r * 0.12} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.12} ${cx} ${cy + r} C ${cx - r * 0.12} ${cy + r * 0.12} ${cx - r * 0.12} ${cy + r * 0.12} ${cx - r} ${cy} C ${cx - r * 0.12} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.12} ${cx} ${cy - r} Z" fill="${fill}"/>`;

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

// --- Icons ---------------------------------------------------------------------
const icon = svg(1024, 1024, `<rect width="1024" height="1024" fill="${TERRACOTTA}"/>${arch(512, 800, 380, 520, CREAM)}${sparkle(735, 300, 70, CREAM)}`);
const adaptiveFg = svg(512, 512, `${arch(256, 352, 150, 210, CREAM)}${sparkle(345, 178, 30, CREAM)}`);
const adaptiveBg = svg(512, 512, `<rect width="512" height="512" fill="${TERRACOTTA}"/>`);
const monochrome = svg(432, 432, `${arch(216, 300, 130, 180, '#FFFFFF')}${sparkle(293, 150, 26, '#FFFFFF')}`);
const tile = (size) =>
  svg(size, size, `<rect width="${size}" height="${size}" rx="${size * 0.24}" fill="${TERRACOTTA}"/>${arch(size / 2, size * 0.84, size * 0.42, size * 0.58, CREAM)}`);

// --- Demo illustration (same room, before and after) ---------------------------
function room(after) {
  const wallBack = after ? '#F2EDE5' : '#D3CEC6';
  const wallSide = after ? '#E9E2D8' : '#C8C2B9';
  const ceiling = after ? '#F7F4EF' : '#E2DED8';
  const floor = after ? '#C39A6B' : '#A8987F';
  const plank = after ? '#B08756' : '#968672';
  const planks = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 10;
    const xb = 200 + 800 * t;
    const xf = 1200 * t;
    return `<line x1="${xb}" y1="600" x2="${xf}" y2="900" stroke="${plank}" stroke-width="3"/>`;
  }).join('');

  const window = `
    <polygon points="1040,237 1150,229 1150,586 1040,491" fill="${after ? '#DCEBF2' : '#C9D3D8'}"/>
    <polygon points="1040,237 1150,229 1150,586 1040,491" fill="none" stroke="${after ? '#FFFFFF' : '#9EA3A6'}" stroke-width="8"/>
    ${after
      ? `<polygon points="1022,200 1062,196 1062,560 1022,520" fill="#EADFCE"/><polygon points="1140,190 1185,186 1185,650 1140,600" fill="#EADFCE"/>`
      : Array.from({ length: 8 }, (_, i) => `<line x1="1040" y1="${255 + i * 30}" x2="1150" y2="${250 + i * 43}" stroke="#A9B0B4" stroke-width="4"/>`).join('')}`;

  const before = `
    <ellipse cx="600" cy="150" rx="70" ry="16" fill="#F4F6F8" stroke="#BFC3C6" stroke-width="3"/>
    <rect x="300" y="230" width="150" height="110" fill="#B8B0A5"/>
    <rect x="325" y="250" width="100" height="70" fill="#9C9389"/>
    <rect x="360" y="440" width="480" height="150" rx="12" fill="#857A70"/>
    <rect x="360" y="400" width="480" height="70" rx="14" fill="#7A6F66"/>
    <rect x="340" y="430" width="50" height="160" rx="10" fill="#6F655C"/>
    <rect x="810" y="430" width="50" height="160" rx="10" fill="#6F655C"/>
    <rect x="470" y="660" width="260" height="70" fill="#5B524B"/>
    <rect x="490" y="640" width="70" height="30" fill="#A79A8B"/><rect x="600" y="630" width="90" height="40" fill="#988B7C"/>
    <polygon points="60,420 170,380 170,690 60,800" fill="#8F857B"/>
    <rect x="80" y="760" width="90" height="60" fill="#9D9184"/><rect x="900" y="700" width="80" height="55" fill="#8F8478"/>`;

  const afterScene = `
    <defs>
      <radialGradient id="glowLamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD9A0" stop-opacity="0.9"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
      <radialGradient id="glowRoom" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFF1DC" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF1DC" stop-opacity="0"/></radialGradient>
    </defs>
    ${arch(600, 600, 520, 430, '#B5603F')}
    <rect x="455" y="250" width="110" height="140" fill="#F3E6D2" stroke="#8C5E3C" stroke-width="6"/>
    <circle cx="510" cy="320" r="34" fill="#6B7045"/>
    <rect x="590" y="270" width="150" height="110" fill="#F3E6D2" stroke="#8C5E3C" stroke-width="6"/>
    <path d="M 600 370 Q 650 290 730 330" stroke="#B5603F" stroke-width="10" fill="none"/>
    <line x1="600" y1="0" x2="600" y2="190" stroke="#3A332D" stroke-width="3"/>
    <circle cx="600" cy="230" r="150" fill="url(#glowLamp)"/>
    <ellipse cx="600" cy="215" rx="58" ry="46" fill="#F7EBD8" stroke="#E2CFB1" stroke-width="3"/>
    <ellipse cx="600" cy="745" rx="330" ry="95" fill="#D9C7AE"/>
    <ellipse cx="600" cy="745" rx="290" ry="78" fill="none" stroke="#C4AE90" stroke-width="5"/>
    <rect x="350" y="450" width="500" height="140" rx="40" fill="#E7DCCB"/>
    <rect x="350" y="400" width="500" height="80" rx="38" fill="#EFE5D6"/>
    <rect x="395" y="415" width="110" height="70" rx="22" fill="#B5603F"/>
    <rect x="695" y="415" width="110" height="70" rx="22" fill="#6B7045"/>
    <rect x="530" y="425" width="140" height="60" rx="22" fill="#D9C7AE"/>
    <ellipse cx="600" cy="700" rx="120" ry="34" fill="#8C5E3C"/>
    <rect x="590" y="700" width="20" height="40" fill="#734B2F"/>
    <circle cx="560" cy="688" r="14" fill="#F2EDE5"/><rect x="620" y="672" width="40" height="18" rx="4" fill="#B5603F"/>
    <rect x="215" y="610" width="70" height="80" rx="10" fill="#B08756"/>
    <ellipse cx="250" cy="520" rx="95" ry="120" fill="#5E7A4F"/>
    <ellipse cx="215" cy="470" rx="55" ry="80" fill="#6E8C5C"/><ellipse cx="290" cy="455" rx="50" ry="70" fill="#56704A"/>
    <line x1="930" y1="380" x2="930" y2="640" stroke="#2E2B28" stroke-width="6"/>
    <ellipse cx="930" cy="645" rx="40" ry="10" fill="#2E2B28"/>
    <circle cx="930" cy="380" r="110" fill="url(#glowLamp)"/>
    <path d="M 885 390 L 975 390 L 955 340 L 905 340 Z" fill="#EFE2CF"/>
    <polygon points="70,330 180,300 180,318 70,352" fill="#8C5E3C"/>
    <rect x="95" y="290" width="26" height="40" fill="#B5603F"/><circle cx="150" cy="290" r="16" fill="#6B7045"/>
    <rect x="0" y="0" width="1200" height="900" fill="url(#glowRoom)"/>`;

  return svg(
    1200,
    900,
    `<rect width="1200" height="900" fill="${wallBack}"/>
     <polygon points="0,0 1200,0 1000,120 200,120" fill="${ceiling}"/>
     <polygon points="0,0 200,120 200,600 0,900" fill="${wallSide}"/>
     <polygon points="1200,0 1000,120 1000,600 1200,900" fill="${wallSide}"/>
     <rect x="200" y="120" width="800" height="480" fill="${wallBack}"/>
     <polygon points="0,900 200,600 1000,600 1200,900" fill="${floor}"/>
     ${planks}
     ${window}
     ${after ? afterScene : before}`,
  );
}

const jobs = [
  ['assets/images/icon.png', icon, 1024, 1024, false],
  ['assets/images/android-icon-foreground.png', adaptiveFg, 512, 512, true],
  ['assets/images/android-icon-background.png', adaptiveBg, 512, 512, false],
  ['assets/images/android-icon-monochrome.png', monochrome, 432, 432, true],
  ['assets/images/splash-icon.png', tile(400), 400, 400, true],
  ['assets/images/favicon.png', tile(48), 48, 48, true],
  ['assets/demo/before.png', room(false), 1200, 900, false],
  ['assets/demo/after.png', room(true), 1200, 900, false],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, markup, width, height, transparent] of jobs) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  await page.locator('svg').screenshot({ path: out, omitBackground: transparent });
  console.log('wrote', file);
}
await browser.close();
