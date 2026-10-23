import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distAssets = join(process.cwd(), 'apps/web/dist/assets');
let files = [];
try {
  files = readdirSync(distAssets).filter(
    (f) => f.startsWith('index-') && f.endsWith('.js')
  );
} catch {
  console.error('Missing apps/web/dist/assets. Run pnpm --filter @leaseup/web build first.');
  process.exit(1);
}

const violations = [];
for (const file of files) {
  const text = readFileSync(join(distAssets, file), 'utf8');
  if (text.includes('\u2014') || text.includes('\u2013')) {
    violations.push(file);
  }
}

if (violations.length) {
  console.error('Em/en dash found in bundle:', violations.join(', '));
  process.exit(1);
}
console.log('Bundle dash check OK (' + files.length + ' files).');
