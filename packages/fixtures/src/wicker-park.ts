/**
 * Wicker Park fixture data from round2/neigh_test_10km.json
 */
export const wickerParkFixture = {
  location: {
    address: '1574 N Milwaukee Ave, Chicago, IL 60622',
    latitude: 41.9088,
    longitude: -87.6776,
    city: 'Chicago',
    neighborhood: 'Wicker Park',
    resolvedAddress: 'Wicker Park, Chicago, IL',
  },
  
  insights: [
    {
      entityId: 'urn:qloo:entity:brand:trader_joes',
      name: 'Trader Joe\'s',
      affinity: 0.892,
      affinityRank: 0.95,
      popularity: 0.85,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:whole_foods',
      name: 'Whole Foods',
      affinity: 0.885,
      affinityRank: 0.94,
      popularity: 0.92,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:sweetgreen',
      name: 'Sweetgreen',
      affinity: 0.878,
      affinityRank: 0.93,
      popularity: 0.78,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:lululemon',
      name: 'Lululemon',
      affinity: 0.871,
      affinityRank: 0.92,
      popularity: 0.88,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:madewell',
      name: 'Madewell',
      affinity: 0.865,
      affinityRank: 0.91,
      popularity: 0.71,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:everlane',
      name: 'Everlane',
      affinity: 0.858,
      affinityRank: 0.90,
      popularity: 0.65,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:reformation',
      name: 'Reformation',
      affinity: 0.851,
      affinityRank: 0.89,
      popularity: 0.69,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:aritzia',
      name: 'Aritzia',
      affinity: 0.844,
      affinityRank: 0.88,
      popularity: 0.72,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:bluemercury',
      name: 'Bluemercury',
      affinity: 0.837,
      affinityRank: 0.87,
      popularity: 0.58,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:warby_parker',
      name: 'Warby Parker',
      affinity: 0.830,
      affinityRank: 0.86,
      popularity: 0.74,
      present: true,
    },
  ],
  
  backtest: {
    totalStores: 36,
    predictedStores: 36,
    accuracy: 1.0,
    precisionAt10: 1.0,
    auc: 0.797,
    examples: [
      { name: 'Trader Joe\'s', distance: 0.8, rank: 1, predicted: true },
      { name: 'Whole Foods', distance: 1.2, rank: 2, predicted: true },
      { name: 'Sweetgreen', distance: 0.5, rank: 3, predicted: true },
      { name: 'Lululemon', distance: 0.6, rank: 4, predicted: true },
      { name: 'Madewell', distance: 0.9, rank: 5, predicted: true },
      { name: 'Aritzia', distance: 1.1, rank: 8, predicted: true },
      { name: 'Warby Parker', distance: 0.7, rank: 10, predicted: true },
    ],
  },
  
  demographics: {
    ageSkew: {
      '25-29': 0.32,
      '30-34': 0.28,
      '35-44': 0.15,
    },
    genderSkew: {
      'female': 0.08,
      'male': -0.08,
    },
  },
};
