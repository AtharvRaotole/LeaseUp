import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

describe('Anti-fabrication tests', () => {
  it('should not use Math.random in production code', async () => {
    // Find all TypeScript files in src/ excluding __tests__
    const files = await glob('src/**/*.ts', {
      cwd: join(__dirname, '..'),
      ignore: ['**/__tests__/**', '**/*.test.ts'],
    });

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(join(__dirname, '..', file), 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('Math.random')) {
          violations.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `Math.random() found in production code (fabricated data):\n${violations.join('\n')}`
      );
    }
  });
});
