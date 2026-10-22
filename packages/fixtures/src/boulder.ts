/**
 * Boulder fixture data - high accuracy example
 */
export const boulderFixture = {
  location: {
    address: '1125 Pearl St, Boulder, CO 80302',
    latitude: 40.0150,
    longitude: -105.2705,
    city: 'Boulder',
    neighborhood: 'Pearl Street',
    resolvedAddress: 'Boulder, CO',
  },
  
  insights: [
    {
      entityId: 'urn:qloo:entity:brand:whole_foods',
      name: 'Whole Foods',
      affinity: 0.925,
      affinityRank: 0.99,
      popularity: 0.92,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:rei',
      name: 'REI',
      affinity: 0.918,
      affinityRank: 0.98,
      popularity: 0.81,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:lululemon',
      name: 'Lululemon',
      affinity: 0.911,
      affinityRank: 0.97,
      popularity: 0.88,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:patagonia',
      name: 'Patagonia',
      affinity: 0.904,
      affinityRank: 0.96,
      popularity: 0.76,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:trader_joes',
      name: 'Trader Joe\'s',
      affinity: 0.897,
      affinityRank: 0.95,
      popularity: 0.85,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:allbirds',
      name: 'Allbirds',
      affinity: 0.890,
      affinityRank: 0.94,
      popularity: 0.58,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:alo_yoga',
      name: 'Alo Yoga',
      affinity: 0.883,
      affinityRank: 0.93,
      popularity: 0.61,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:athleta',
      name: 'Athleta',
      affinity: 0.876,
      affinityRank: 0.92,
      popularity: 0.73,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:blue_bottle_coffee',
      name: 'Blue Bottle Coffee',
      affinity: 0.869,
      affinityRank: 0.91,
      popularity: 0.66,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:sweetgreen',
      name: 'Sweetgreen',
      affinity: 0.862,
      affinityRank: 0.90,
      popularity: 0.78,
      present: true,
    },
  ],
  
  backtest: {
    totalStores: 28,
    predictedStores: 28,
    accuracy: 1.0,
    precisionAt10: 1.0,
    auc: 0.87,
    examples: [
      { name: 'Whole Foods', distance: 0.5, rank: 1, predicted: true },
      { name: 'REI', distance: 1.8, rank: 2, predicted: true },
      { name: 'Lululemon', distance: 0.3, rank: 3, predicted: true },
      { name: 'Patagonia', distance: 0.4, rank: 4, predicted: true },
      { name: 'Trader Joe\'s', distance: 2.1, rank: 5, predicted: true },
      { name: 'Athleta', distance: 0.6, rank: 8, predicted: true },
      { name: 'Sweetgreen', distance: 0.7, rank: 10, predicted: true },
    ],
  },
  
  demographics: {
    ageSkew: {
      '25-29': 0.35,
      '30-34': 0.29,
      '35-44': 0.12,
    },
    genderSkew: {
      'female': 0.05,
      'male': -0.05,
    },
  },
};
