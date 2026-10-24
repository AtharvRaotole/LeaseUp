/** Recorded OSM tag shapes for brand matching tests (no live Overpass). */

export const REI_SOHO_OSM_NODE = {
  source: 'https://www.openstreetmap.org/node/2483671757',
  lat: 40.72483,
  lon: -73.99522,
  tags: {
    brand: 'REI',
    'brand:wikidata': 'Q3414933',
    name: 'REI Co-op',
    shop: 'outdoor',
  },
};

export const REI_QID = 'Q3414933';

/** Same display name but a different Wikidata brand (must not match REI). */
export const UNRELATED_REI_NAME_TAGS = {
  tags: {
    brand: 'REI',
    'brand:wikidata': 'Q9999999',
    name: 'REI',
    shop: 'outdoor',
  },
};

/** Legacy tagging without brand:wikidata (name fallback). */
export const REI_NAME_ONLY_TAGS = {
  tags: {
    brand: 'REI',
    name: 'REI',
    shop: 'outdoor',
  },
};

export const BLEECKER_NYC = {
  address: '350 Bleecker St, New York, NY 10014',
  latitude: 40.73352,
  longitude: -74.00271,
};

export const REI_ENTITY_ID = '205AF33F-118E-4C49-9721-6BDBAF981DA0';
