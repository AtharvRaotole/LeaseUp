#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_API_ORIGIN = 'https://leaseup-worker.issue-atharva.workers.dev';

const apiOrigin = (process.env.VITE_API_URL ?? '').trim().replace(/\/$/, '') || DEFAULT_API_ORIGIN;

const templatePath = join(__dirname, '../public/_headers.template');
const outPath = join(__dirname, '../public/_headers');

const template = readFileSync(templatePath, 'utf8');
const headers = template.replaceAll('{{API_ORIGIN}}', apiOrigin);
writeFileSync(outPath, headers, 'utf8');
console.log(`Wrote ${outPath} with API origin ${apiOrigin}`);
