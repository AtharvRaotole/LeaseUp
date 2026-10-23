/**
 * Copy Schibsted Grotesk woff2 (latin, 400/500/600) into apps/web/public/fonts
 * and apps/worker/src/og/fonts for share-card rendering.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontRoot = join(root, 'apps/web/node_modules/@fontsource/schibsted-grotesk/files');
const slug = 'schibsted-grotesk';
const weights = [400, 500, 600];

const targets = [
  join(root, 'apps/web/public/fonts', slug),
  join(root, 'apps/worker/src/og/fonts'),
];

for (const dir of targets) {
  mkdirSync(dir, { recursive: true });
  for (const w of weights) {
    const name = `${slug}-latin-${w}-normal.woff2`;
    const src = join(fontRoot, name);
    if (!existsSync(src)) {
      throw new Error(`Missing ${src}; run pnpm add -D @fontsource/schibsted-grotesk in apps/web`);
    }
    copyFileSync(src, join(dir, name));
  }
}

const licenseSrc = join(root, 'apps/web/node_modules/@fontsource/schibsted-grotesk/LICENSE');
const licenseDest = join(root, 'apps/web/public/fonts/licenses/SCHIBSTED-GROTESK-OFL.txt');
mkdirSync(dirname(licenseDest), { recursive: true });
copyFileSync(licenseSrc, licenseDest);

console.log('Synced Schibsted Grotesk fonts');
