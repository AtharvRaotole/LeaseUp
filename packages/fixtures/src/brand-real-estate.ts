import data from './brand-real-estate.json';

export type BrandRealEstateStatus = 'verified' | 'not_yet_found';

export interface BrandRealEstateVerified {
  entityId: string;
  name: string;
  status: 'verified';
  url: string;
  source: string;
}

export interface BrandRealEstateNotFound {
  entityId: string;
  name: string;
  status: 'not_yet_found';
  searchUrl: string;
}

export type BrandRealEstateEntry = BrandRealEstateVerified | BrandRealEstateNotFound;

export interface BrandRealEstateDataset {
  version: number;
  updatedAt: string;
  entries: BrandRealEstateEntry[];
}

const dataset = data as BrandRealEstateDataset;

const byEntityId = new Map<string, BrandRealEstateEntry>();
for (const entry of dataset.entries) {
  byEntityId.set(entry.entityId.toUpperCase(), entry);
}

export function brandRealEstateDataset(): BrandRealEstateDataset {
  return dataset;
}

export function brandRealEstateForEntity(entityId: string): BrandRealEstateEntry | undefined {
  return byEntityId.get(entityId.toUpperCase());
}

export function brandRealEstateContactLine(entry: BrandRealEstateEntry): string {
  if (entry.status === 'verified') {
    return `How to reach them: submit sites at ${entry.url} (source: ${entry.source}).`;
  }
  return `How to reach them: official real-estate page not yet found in our dataset. Search the brand site: ${entry.searchUrl}`;
}
