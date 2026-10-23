import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const INDEX = join(import.meta.dirname, '../../index.html');

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__') continue;
      walk(p, files);
    } else if (/\.(tsx?|html)$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

describe('UI copy punctuation', () => {
  it('has no em or en dashes in apps/web UI sources', () => {
    const files = [...walk(ROOT), INDEX];
    const violations: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('\u2014') || text.includes('\u2013')) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
