export interface OverpassBrand {
  name: string;
  brand?: string;
  brandWikidata?: string;
  lat: number;
  lon: number;
}

export interface OverpassDemoRecording {
  recordedAt: string;
  endpoint: string;
  query: string;
  brands: OverpassBrand[];
}
