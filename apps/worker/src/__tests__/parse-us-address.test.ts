import { describe, it, expect } from 'vitest';
import { parseUsAddress, streetForGeocodeSearch } from '../lib/parse-us-address';

describe('parseUsAddress', () => {
  it('parses Bleecker St NYC', () => {
    expect(parseUsAddress('350 Bleecker St, New York, NY')).toEqual({
      street: '350 Bleecker St',
      city: 'New York',
      state: 'NY',
    });
  });

  it('parses Milwaukee Ave Chicago with ZIP', () => {
    expect(parseUsAddress('1574 N Milwaukee Ave, Chicago, IL 60622')).toEqual({
      street: '1574 N Milwaukee Ave',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60622',
    });
  });

  it('parses Pearl St Boulder', () => {
    expect(parseUsAddress('1125 Pearl St, Boulder, CO 80302')).toEqual({
      street: '1125 Pearl St',
      city: 'Boulder',
      state: 'CO',
      postalCode: '80302',
    });
  });

  it('strips suite and address ranges for geocode search', () => {
    expect(streetForGeocodeSearch('5085 Westheimer Rd Ste 2500')).toBe('5085 Westheimer Rd');
    expect(streetForGeocodeSearch('1600-1630 NE Alberta St')).toBe('1600 NE Alberta St');
  });
});
