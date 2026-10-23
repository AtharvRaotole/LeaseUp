/**
 * Renders LeaseUp brand PNGs and favicon set from SVG sources.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'docs/brand');
const publicDir = join(root, 'apps/web/public');

mkdirSync(join(brand, 'generated'), { recursive: true });

const COLORS = {
  light: { bg: '#FAFAF7', fg: '#0F6B4F' },
  dark: { bg: '#0B0B0C', fg: '#3FBF8F' },
};

function renderSvgToPng(svgString, size, { bg, fg }) {
  const tinted = svgString.replace(/currentColor/g, fg);
  const resvg = new Resvg(tinted, {
    fitTo: { mode: 'width', value: size },
    background: bg,
  });
  return resvg.render().asPng();
}

async function renderMarkOnBg(svgPath, size, theme) {
  const { bg, fg } = COLORS[theme];
  const svg = readFileSync(svgPath, 'utf8');
  const icon = renderSvgToPng(svg, size, { bg, fg });
  return sharp(icon).png().toBuffer();
}

const concepts = [
  { id: 'aperture', file: 'concept-aperture.svg' },
  { id: 'corner-l', file: 'concept-corner-l.svg' },
  { id: 'beacon', file: 'concept-beacon.svg' },
];

const sizes = [16, 32, 64, 256];
const cellPad = 24;
const labelH = 28;
const cols = sizes.length;
const rows = concepts.length * 2;

const cellW = 256 + cellPad * 2;
const cellH = 256 + cellPad * 2 + labelH;
const sheetW = cols * cellW + 40;
const sheetH = rows * cellH + 80;

const composites = [];
let row = 0;
for (const concept of concepts) {
  const svgPath = join(brand, 'concepts', concept.file);
  for (const theme of ['light', 'dark']) {
    for (let col = 0; col < sizes.length; col++) {
      const size = sizes[col];
      const buf = await renderMarkOnBg(svgPath, size, theme);
      const padded = await sharp(buf)
        .extend({
          top: cellPad,
          bottom: cellPad + labelH,
          left: cellPad,
          right: cellPad,
          background: theme === 'light' ? COLORS.light.bg : COLORS.dark.bg,
        })
        .png()
        .toBuffer();
      composites.push({
        input: padded,
        left: 20 + col * cellW,
        top: 40 + row * cellH,
      });
    }
    row += 1;
  }
}

const contactPath = join(brand, 'generated', 'contact-sheet.png');
await sharp({
  create: {
    width: sheetW,
    height: sheetH,
    channels: 4,
    background: '#F3F2EE',
  },
})
  .composite(composites)
  .png()
  .toFile(contactPath);
console.log('Wrote', contactPath);

const markSvg = readFileSync(join(brand, 'assets/mark.svg'), 'utf8');

writeFileSync(
  join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <style>
    .fg { stroke: #0F6B4F; fill: #0F6B4F; }
    @media (prefers-color-scheme: dark) {
      .fg { stroke: #3FBF8F; fill: #3FBF8F; }
    }
  </style>
  <rect class="fg" x="5" y="5" width="22" height="22" rx="5.5" fill="none" stroke-width="2.25" />
  <path class="fg" d="M10 23V12h4.25v6.75H21v4.25H10z" />
</svg>\n`
);

const ico16 = renderSvgToPng(markSvg, 16, { bg: '#FAFAF7', fg: '#0F6B4F' });
const ico32 = renderSvgToPng(markSvg, 32, { bg: '#FAFAF7', fg: '#0F6B4F' });
const ico48 = renderSvgToPng(markSvg, 48, { bg: '#FAFAF7', fg: '#0F6B4F' });

await sharp(ico16).png().toFile(join(publicDir, 'favicon-16.png'));
await sharp(ico32).png().toFile(join(publicDir, 'favicon-32.png'));
await sharp(ico48).png().toFile(join(publicDir, 'favicon-48.png'));

const icoBuf = await pngToIco([
  join(publicDir, 'favicon-16.png'),
  join(publicDir, 'favicon-32.png'),
  join(publicDir, 'favicon-48.png'),
]);
writeFileSync(join(publicDir, 'favicon.ico'), icoBuf);

await sharp(renderSvgToPng(markSvg, 180, { bg: '#FAFAF7', fg: '#0F6B4F' }))
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));

for (const size of [192, 512]) {
  const pad = Math.round(size * 0.1);
  const inner = size - pad * 2;
  const innerPng = renderSvgToPng(markSvg, inner, { bg: '#FAFAF7', fg: '#0F6B4F' });
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#FAFAF7' },
  })
    .composite([{ input: innerPng, left: pad, top: pad }])
    .png()
    .toFile(join(publicDir, `icon-${size}.png`));
}

const ogSvg = readFileSync(join(brand, 'assets/og-template.svg'), 'utf8');
const ogPng = new Resvg(ogSvg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
await sharp(ogPng).png().toFile(join(publicDir, 'og.png'));

writeFileSync(
  join(publicDir, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'LeaseUp',
      short_name: 'LeaseUp',
      description: 'Find the tenants your neighborhood already wants.',
      start_url: '/',
      display: 'standalone',
      background_color: '#FAFAF7',
      theme_color: '#0F6B4F',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2
  ) + '\n'
);

console.log('Wrote public brand assets');
