import { describe, it, expect } from 'vitest';
import {
  GEOCODE_NON_US_MESSAGE,
  GEOCODE_PO_BOX_MESSAGE,
  GEOCODE_UNRECOGNIZED_MESSAGE,
  rejectAddressInput,
} from '../lib/address-input-validation';

describe('rejectAddressInput', () => {
  it('rejects PO boxes', () => {
    const r = rejectAddressInput('PO Box 441, Austin, TX 78701');
    expect(r?.code).toBe('GEOCODE_PO_BOX');
    expect(r?.message).toBe(GEOCODE_PO_BOX_MESSAGE);
  });

  it('rejects non-US hints', () => {
    const r = rejectAddressInput('10 Downing Street, London, England');
    expect(r?.code).toBe('GEOCODE_NON_US');
    expect(r?.message).toBe(GEOCODE_NON_US_MESSAGE);
  });

  it('rejects gibberish', () => {
    const r = rejectAddressInput('xkjq mxzq qwerty');
    expect(r?.code).toBe('GEOCODE_UNRECOGNIZED');
    expect(r?.message).toBe(GEOCODE_UNRECOGNIZED_MESSAGE);
  });

  it('allows a normal US storefront line', () => {
    expect(
      rejectAddressInput('1574 N Milwaukee Ave, Chicago, IL 60622')
    ).toBeNull();
  });

  it('allows partial street lines for geocoder disambiguation', () => {
    expect(rejectAddressInput('Main St')).toBeNull();
    expect(rejectAddressInput('1574 N Milwaukee Ave, Chicago')).toBeNull();
  });
});
