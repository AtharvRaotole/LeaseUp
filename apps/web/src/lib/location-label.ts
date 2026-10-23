import type { Location } from '@leaseup/contracts';
import type { DemoFixtureId } from '@leaseup/fixtures';
import { matchDemoChipWithinMeters } from '@leaseup/fixtures';
import { DEMO_EXAMPLES } from '../data/demo-examples';

const ZIP_RE = /\b\d{5}(-\d{4})?\b/;
const STATE_ZIP_RE = /\b[A-Z]{2}\s+\d{5}/;

function stripZipFromPart(part: string): string {
  return part
    .replace(ZIP_RE, '')
    .replace(STATE_ZIP_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/,\s*$/, '');
}

function demoChipHeadline(chipId: DemoFixtureId): string | null {
  const row = DEMO_EXAMPLES.find((e) => e.id === chipId);
  return row ? `${row.neighborhood}, ${row.city}` : null;
}

/** Short place label for headlines: neighborhood + city, never a ZIP. */
export function placeHeadlineLabel(location: Location, chipSlug?: string | null): string {
  const chip = chipSlug as DemoFixtureId | undefined;
  if (chip === 'wicker' || chip === 'boulder' || chip === 'sevierville') {
    const label = demoChipHeadline(chip);
    if (label) return label;
  }

  const nearChip = matchDemoChipWithinMeters(location.latitude, location.longitude);
  if (nearChip) {
    const label = demoChipHeadline(nearChip.id);
    if (label) return label;
  }

  const hood = location.neighborhood?.trim();
  const city = location.city?.trim();
  if (hood && city && hood !== city) {
    return `${stripZipFromPart(hood)}, ${stripZipFromPart(city)}`;
  }
  if (hood) return stripZipFromPart(hood);
  if (city) return stripZipFromPart(city);

  const parts = location.address.split(',').map((p) => stripZipFromPart(p.trim())).filter(Boolean);
  const withoutZip = parts.filter((p) => !ZIP_RE.test(p) && !STATE_ZIP_RE.test(p));
  if (withoutZip.length >= 2) {
    const cityPart = withoutZip[withoutZip.length - 1]!;
    const hoodPart = withoutZip[withoutZip.length - 2]!;
    if (/^\d/.test(hoodPart)) return cityPart;
    return `${hoodPart}, ${cityPart}`;
  }
  if (withoutZip.length === 1) return withoutZip[0]!;
  return stripZipFromPart(location.address);
}

/** Bold neighborhood for sticky header. */
export function placeNeighborhoodBold(location: Location, chipSlug?: string | null): string {
  const chip = chipSlug as DemoFixtureId | undefined;
  if (chip === 'wicker' || chip === 'boulder' || chip === 'sevierville') {
    const row = DEMO_EXAMPLES.find((e) => e.id === chip);
    if (row) return row.neighborhood;
  }
  const nearChip = matchDemoChipWithinMeters(location.latitude, location.longitude);
  if (nearChip) return nearChip.neighborhood;
  return location.neighborhood || location.city || 'Location';
}
