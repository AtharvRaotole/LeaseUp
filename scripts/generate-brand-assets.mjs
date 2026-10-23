/**
 * Renders LeaseUp brand PNGs and favicon set from SVG sources.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';
import satori from 'satori';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'docs/brand');
const publicDir = join(root, 'apps/web/public');
const fontDir = join(root, 'apps/web/public/fonts/schibsted-grotesk');

mkdirSync(join(brand, 'generated'), { recursive: true });

const FONT_FILES = [
  join(fontDir, 'schibsted-grotesk-latin-400-normal.woff2'),
  join(fontDir, 'schibsted-grotesk-latin-600-normal.woff2'),
];

const COLORS = {
  light: { bg: '#FAFAF7', fg: '#0F6B4F' },
  dark: { bg: '#0B0B0C', fg: '#3FBF8F' },
};

function resvgOpts(extra = {}) {
  return {
    font: {
      loadSystemFonts: false,
      defaultFontFamily: 'Schibsted Grotesk',
      fontFiles: FONT_FILES,
    },
    ...extra,
  };
}

function renderSvgToPng(svgString, size, { bg, fg }) {
  const tinted = svgString.replace(/currentColor/g, fg);
  const resvg = new Resvg(tinted, {
    ...resvgOpts({
      fitTo: { mode: 'width', value: size },
      background: bg,
    }),
  });
  return resvg.render().asPng();
}

function renderMarkFile(svgPath, size, theme) {
  const { bg, fg } = COLORS[theme];
  const svg = readFileSync(svgPath, 'utf8');
  const tinted = svg.replace(/currentColor/g, fg);
  const resvg = new Resvg(tinted, {
    ...resvgOpts({
      fitTo: { mode: 'width', value: size },
      background: bg,
    }),
  });
  return resvg.render().asPng();
}

async function renderMarkOnBg(svgPath, size, theme) {
  const png = renderMarkFile(svgPath, size, theme);
  return sharp(png).png().toBuffer();
}

function h(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== false && c != null);
  if (flat.length === 0) {
    return { type, props };
  }
  const next = { ...props };
  if (flat.length === 1 && (typeof flat[0] === 'string' || typeof flat[0] === 'number')) {
    next.children = flat[0];
  } else {
    next.children = flat;
  }
  return { type, props: next };
}

function ogFonts() {
  return [
    {
      name: 'Schibsted Grotesk',
      data: readFileSync(join(fontDir, 'schibsted-grotesk-latin-400-normal.woff2')),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Schibsted Grotesk',
      data: readFileSync(join(fontDir, 'schibsted-grotesk-latin-600-normal.woff2')),
      weight: 600,
      style: 'normal',
    },
  ];
}

function buildOgTextTree() {
  return h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        backgroundColor: '#FAFAF7',
        display: 'flex',
        flexDirection: 'row',
      },
    },
    h(
      'div',
      {
        style: {
          width: 640,
          height: 630,
          padding: '0 72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
        },
      },
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 } },
      h(
        'div',
        {
          style: {
            width: 28,
            height: 28,
            borderRadius: 3,
            border: '2.4px solid #0F6B4F',
            position: 'relative',
          },
        },
        h('div', {
          style: {
            position: 'absolute',
            left: 3,
            bottom: 3,
            width: 6,
            height: 14,
            backgroundColor: '#0F6B4F',
          },
        }),
        h('div', {
          style: {
            position: 'absolute',
            left: 3,
            bottom: 3,
            width: 17,
            height: 6,
            backgroundColor: '#0F6B4F',
          },
        })
      ),
      h('div', {
        style: {
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#121212',
        },
        children: 'LeaseUp',
      })
    ),
    h('div', {
      style: {
        fontFamily: 'Schibsted Grotesk',
        fontSize: 48,
        fontWeight: 600,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        color: '#121212',
        width: 560,
      },
      children: 'Find the right stores for your empty retail space.',
    }),
    h('div', {
      style: {
        fontSize: 20,
        lineHeight: 1.45,
        letterSpacing: '-0.01em',
        color: '#77756E',
        width: 500,
      },
      children: 'Brands people nearby love but cannot find close by.',
    })
    )
  );
}

function buildOgGridTree() {
  const prospectDots = [
    { left: 120, top: 72 },
    { left: 240, top: 160 },
    { left: 320, top: 48 },
    { left: 180, top: 240 },
    { left: 380, top: 300 },
    { left: 60, top: 190 },
  ].map(({ left, top }) =>
    h('div', {
      style: {
        position: 'absolute',
        left,
        top,
        width: 14,
        height: 14,
        borderRadius: 999,
        backgroundColor: '#0F6B4F',
        border: '3px solid #FAFAF7',
      },
    })
  );

  return h(
    'div',
    {
      style: {
        width: 560,
        height: 630,
        position: 'relative',
        backgroundColor: '#F7F6F2',
        backgroundImage:
          'linear-gradient(#E7E5DF 1px, transparent 1px), linear-gradient(90deg, #E7E5DF 1px, transparent 1px)',
        backgroundSize: '68px 48px',
      },
    },
      h('div', {
        style: {
          position: 'absolute',
          left: -30,
          top: 80,
          width: 620,
          height: 4,
          backgroundColor: '#D6D3CB',
          transform: 'rotate(24deg)',
        },
      }),
      h('div', {
        style: {
          position: 'absolute',
          left: 10,
          top: 20,
          width: 520,
          height: 3,
          backgroundColor: '#D6D3CB',
          transform: 'rotate(18deg)',
        },
      }),
      h('div', {
        style: {
          position: 'absolute',
          left: -20,
          top: 380,
          width: 500,
          height: 3,
          backgroundColor: '#D6D3CB',
          transform: 'rotate(-22deg)',
        },
      }),
      ...prospectDots
  );
}

async function renderOgPng() {
  const textSvg = await satori(buildOgTextTree(), {
    width: 1200,
    height: 630,
    fonts: ogFonts(),
  });
  const gridSvg = await satori(buildOgGridTree(), {
    width: 560,
    height: 630,
    fonts: [],
  });
  writeFileSync(
    join(brand, 'assets', 'og-template.svg'),
    `<!-- LeaseUp OG: text layer (Satori + Schibsted Grotesk) composited with grid layer -->\n${textSvg}\n`
  );
  if (!textSvg.includes('fill=\"#121212\"')) {
    throw new Error('OG text SVG from satori missing headline paths; fonts may not have loaded.');
  }
  const textPng = new Resvg(textSvg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { loadSystemFonts: false },
  }).render().asPng();
  const gridPng = new Resvg(gridSvg, {
    fitTo: { mode: 'width', value: 560 },
    font: { loadSystemFonts: false },
  }).render().asPng();
  return sharp({
    create: { width: 1200, height: 630, channels: 4, background: '#FAFAF7' },
  })
    .composite([
      { input: textPng, left: 0, top: 0 },
      { input: gridPng, left: 640, top: 0 },
    ])
    .png()
    .toBuffer();
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
      const displayScale = size === 16 || size === 32 ? 4 : 1;
      const displayBuf =
        displayScale > 1
          ? await sharp(buf)
              .resize(size * displayScale, size * displayScale, { kernel: 'nearest' })
              .png()
              .toBuffer()
          : buf;
      const padded = await sharp(displayBuf)
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
const mark16Svg = readFileSync(join(brand, 'assets/mark-16.svg'), 'utf8');

writeFileSync(
  join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <style>
    .fg { fill: #0F6B4F; }
    @media (prefers-color-scheme: dark) {
      .fg { fill: #3FBF8F; }
    }
  </style>
  <path class="fg" fill-rule="evenodd" clip-rule="evenodd" d="M9 5h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Zm-1.1 3.9h14.2a2.1 2.1 0 0 1 2.1 2.1v14.2a2.1 2.1 0 0 1-2.1 2.1H7.9a2.1 2.1 0 0 1-2.1-2.1V11a2.1 2.1 0 0 1 2.1-2.1ZM5 25.15V11.05h9.35v7.2H27v7.9H5Z" />
</svg>\n`
);

const ico16 = renderSvgToPng(mark16Svg, 16, { bg: '#FAFAF7', fg: '#0F6B4F' });
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

const ogPng = await renderOgPng();
const ogInkLeft = await sharp(ogPng).extract({ left: 72, top: 160, width: 520, height: 180 }).stats();
if (ogInkLeft.channels[0].min > 80) {
  console.error('OG headline region lacks dark ink; serif may not have rendered.');
  process.exit(1);
}
await sharp(ogPng).png().toFile(join(publicDir, 'og.png'));
console.log('OG PNG verified (satori paths + headline ink sample)');

writeFileSync(
  join(publicDir, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'LeaseUp',
      short_name: 'LeaseUp',
      description:
        "Type in an address. LeaseUp shows which brands people nearby love but can't find close by, and helps you pitch them.",
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
