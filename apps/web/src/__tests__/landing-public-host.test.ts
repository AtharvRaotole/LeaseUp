import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANDING_PUBLIC_HOST } from '../lib/landing-public-host';

describe('landing public host', () => {
  it('uses the Pages deployment host, not leaseup.app', () => {
    expect(LANDING_PUBLIC_HOST).toBe('leaseup-59m.pages.dev');
    expect(LANDING_PUBLIC_HOST).not.toMatch(/leaseup\.app/i);
  });

  it('marketing step crops reference the Pages host', () => {
    const stepCrops = readFileSync(
      join(process.cwd(), 'src/components/landing/LandingStepCrops.tsx'),
      'utf8'
    );
    expect(stepCrops).toContain('LANDING_PUBLIC_HOST');
    expect(stepCrops).not.toMatch(/leaseup\.app/);
  });
});
