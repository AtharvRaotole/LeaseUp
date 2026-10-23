export type MetroDefinition = {
  id: string;
  label: string;
  /** Qloo location query when not using point radius */
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
};

export const METROS: MetroDefinition[] = [
  {
    id: 'chicago',
    label: 'Chicago',
    query: 'Chicago, IL',
    latitude: 41.8781,
    longitude: -87.6298,
    radiusKm: 35,
  },
  {
    id: 'nyc',
    label: 'New York City',
    query: 'New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    radiusKm: 35,
  },
  {
    id: 'la',
    label: 'Los Angeles',
    query: 'Los Angeles, CA',
    latitude: 34.0522,
    longitude: -118.2437,
    radiusKm: 40,
  },
  {
    id: 'dallas',
    label: 'Dallas',
    query: 'Dallas, TX',
    latitude: 32.7767,
    longitude: -96.797,
    radiusKm: 35,
  },
  {
    id: 'denver',
    label: 'Denver',
    query: 'Denver, CO',
    latitude: 39.7392,
    longitude: -104.9903,
    radiusKm: 30,
  },
  {
    id: 'atlanta',
    label: 'Atlanta',
    query: 'Atlanta, GA',
    latitude: 33.749,
    longitude: -84.388,
    radiusKm: 35,
  },
  {
    id: 'seattle',
    label: 'Seattle',
    query: 'Seattle, WA',
    latitude: 47.6062,
    longitude: -122.3321,
    radiusKm: 30,
  },
  {
    id: 'miami',
    label: 'Miami',
    query: 'Miami, FL',
    latitude: 25.7617,
    longitude: -80.1918,
    radiusKm: 30,
  },
];

export function getMetro(id: string): MetroDefinition | undefined {
  return METROS.find((m) => m.id === id);
}
