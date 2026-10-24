import { describe, it, expect } from 'vitest';
import { BLEECKER_NYC, REI_ENTITY_ID, REI_SOHO_OSM_NODE } from '../osm-brand-match-samples.js';
import { nearestStoreDistanceKm } from '../store-geo.js';

describe('Bleecker REI fixture (embedded demo stores)', () => {
  it('documents that demo-chip store extract does not cover NYC; worker geotiles own Bleecker', () => {
    const nearestEmbedded = nearestStoreDistanceKm(
      REI_ENTITY_ID,
      BLEECKER_NYC.latitude,
      BLEECKER_NYC.longitude
    );
    expect(nearestEmbedded).toBeGreaterThan(30);
    expect(REI_SOHO_OSM_NODE.source).toContain('openstreetmap.org/node/2483671757');
  });
});
