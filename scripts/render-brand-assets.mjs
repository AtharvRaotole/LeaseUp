#!/usr/bin/env node
/**
 * Renders LeaseUp brand PNGs/ICO from SVG sources.
 * Usage: node scripts/render-brand-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'apps/web/public');
const brandDir = join(root, 'docs/brand');
const explorationsDir = join(brandDir, 'explorations');

mkdirSync(explorationsDir, { recursive: true });

const glyphSvg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8');

async function writePng(path, svg, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path);
}

const explorationFiles = ['exploration-a.svg', 'exploration-b.svg', 'exploration-c.svg'];
for (const file of explorationFiles) {
  const svg = readFileSync(join(explorationsDir, file), 'utf8');
  const base = file.replace('.svg', '');
  for (const size of [16, 32, 128]) {
    await writePng(join(explorationsDir, `${base}-${size}.png`), svg, size);
  }
}

const sizes = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
];

for (const [name, px] of sizes) {
  const pad = name.includes('maskable') ? Math.round(px * 0.1) : 0;
  const inner = px - pad * 2;
  const padded = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <rect width="100%" height="100%" fill="#fafaf7"/>
    <g transform="translate(${pad} ${pad}) scale(${inner / 32})">
      <path fill="#0f6b4f" d="M5 5v18h5.5v-3.5H8.5V5H5z"/>
      <path fill="#0f6b4f" d="M13.5 21L19.5 13 13.5 5v16z"/>
    </g>
  </svg>`;
  await writePng(join(publicDir, name), padded, px);
}

const fav16 = await sharp(Buffer.from(glyphSvg)).resize(16, 16).png().toBuffer();
const fav32 = await sharp(Buffer.from(glyphSvg)).resize(32, 32).png().toBuffer();
const fav48 = await sharp(Buffer.from(glyphSvg)).resize(48, 48).png().toBuffer();
const ico = await pngToIco([fav16, fav32, fav48]);
writeFileSync(join(publicDir, 'favicon.ico'), ico);

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fafaf7"/>
      <stop offset="100%" stop-color="#e6f2ec"/>
    </linearGradient>
    <pattern id="heat" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="18" fill="#0f6b4f" opacity="0.04"/>
      <circle cx="0" cy="0" r="12" fill="#0f6b4f" opacity="0.03"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#heat)"/>
  <g transform="translate(96 210) scale(4)">
    <path fill="#0f6b4f" d="M5 5v18h5.5v-3.5H8.5V5H5z"/>
    <path fill="#0f6b4f" d="M13.5 21L19.5 13 13.5 5v16z"/>
  </g>
  <text x="280" y="300" font-family="system-ui, sans-serif" font-size="72" font-weight="600" fill="#121212" letter-spacing="-1.5">LeaseUp</text>
  <text x="280" y="370" font-family="system-ui, sans-serif" font-size="32" fill="#45443f">Find the right stores for your empty retail space.</text>
</svg>`;

await sharp(Buffer.from(ogSvg)).png().toFile(join(publicDir, 'og-image.png'));

const comparisonSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="420" viewBox="0 0 1200 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="420" fill="#fafaf7"/>
  <text x="48" y="48" font-family="system-ui" font-size="24" font-weight="600" fill="#121212">Logo explorations at 32px</text>
  ${['A: doorway + arrow', 'B: L + chevron (selected)', 'C: pin + door']
    .map((label, i) => {
      const x = 48 + i * 380;
      const file = explorationFiles[i];
      const inner = readFileSync(join(explorationsDir, file), 'utf8')
        .replace(/#0F6B4F/gi, '#0f6b4f')
        .replace(/<svg[^>]*>/, '')
        .replace('</svg>', '');
      return `<g transform="translate(${x} 80)">
        <text x="0" y="0" font-family="system-ui" font-size="16" fill="#45443f">${label}</text>
        <g transform="translate(0 24) scale(2)">${inner}</g>
      </g>`;
    })
    .join('')}
</svg>`;

await sharp(Buffer.from(comparisonSvg)).png().toFile(join(brandDir, 'explorations-comparison.png'));

console.log('Brand assets rendered to apps/web/public and docs/brand/');
