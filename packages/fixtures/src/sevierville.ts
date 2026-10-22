/**
 * Sevierville fixture data - contrasting example showing different brand affinity
 */
export const seviervilleFixture = {
  location: {
    address: '125 Collier Dr, Sevierville, TN 37862',
    latitude: 35.8681,
    longitude: -83.5618,
    city: 'Sevierville',
    neighborhood: 'Sevierville',
    resolvedAddress: 'Sevierville, TN',
  },
  
  insights: [
    {
      entityId: 'urn:qloo:entity:brand:bass_pro_shops',
      name: 'Bass Pro Shops',
      affinity: 0.912,
      affinityRank: 0.98,
      popularity: 0.68,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:cracker_barrel',
      name: 'Cracker Barrel',
      affinity: 0.905,
      affinityRank: 0.97,
      popularity: 0.82,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:hobby_lobby',
      name: 'Hobby Lobby',
      affinity: 0.898,
      affinityRank: 0.96,
      popularity: 0.75,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:altard_state',
      name: 'Altar\'d State',
      affinity: 0.885,
      affinityRank: 0.94,
      popularity: 0.45,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:marley_lilly',
      name: 'Marley Lilly',
      affinity: 0.878,
      affinityRank: 0.93,
      popularity: 0.38,
      present: false,
    },
    {
      entityId: 'urn:qloo:entity:brand:old_navy',
      name: 'Old Navy',
      affinity: 0.871,
      affinityRank: 0.92,
      popularity: 0.89,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:tj_maxx',
      name: 'TJ Maxx',
      affinity: 0.864,
      affinityRank: 0.91,
      popularity: 0.91,
      present: true,
    },
    {
      entityId: 'urn:qloo:entity:brand:academy_sports',
      name: 'Academy Sports + Outdoors',
      affinity: 0.857,
      affinityRank: 0.90,
      popularity: 0.65,
      present: false,
    },
  ],
  
  backtest: {
    totalStores: 29,
    predictedStores: 25,
    accuracy: 0.86,
    precisionAt10: 0.8,
    auc: 0.742,
    examples: [
      { name: 'Bass Pro Shops', distance: 2.1, rank: 1, predicted: true },
      { name: 'Cracker Barrel', distance: 1.8, rank: 2, predicted: true },
      { name: 'Hobby Lobby', distance: 2.5, rank: 3, predicted: true },
      { name: 'Old Navy', distance: 1.9, rank: 6, predicted: true },
      { name: 'TJ Maxx', distance: 2.0, rank: 7, predicted: true },
    ],
  },
  
  demographics: {
    ageSkew: {
      '45-54': 0.28,
      '55-64': 0.24,
      '35-44': 0.18,
    },
    genderSkew: {
      'female': 0.12,
      'male': -0.12,
    },
  },
};
