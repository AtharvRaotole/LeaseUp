import { describe, expect, it } from 'vitest';
import { brandRealEstateDataset, brandRealEstateForEntity } from '../brand-real-estate.js';

describe('brand-real-estate dataset', () => {
  it('covers 60+ brands', () => {
    const data = brandRealEstateDataset();
    expect(data.entries.length).toBeGreaterThanOrEqual(60);
  });

  it('resolves Starbucks demo entity', () => {
    const row = brandRealEstateForEntity('B13C02E3-BA3C-4B39-85B4-ACF12FEBC892');
    expect(row).toBeDefined();
    expect(row?.status === 'verified' || row?.status === 'not_yet_found').toBe(true);
  });
});
