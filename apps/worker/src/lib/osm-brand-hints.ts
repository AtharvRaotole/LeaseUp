import { OSM_WIKIDATA_BY_ENTITY } from '../data/osm-wikidata-map';
import type { OverpassSearchBrand } from './overpass-query';

export function toOverpassSearchBrand(
  entityId: string,
  name: string,
  aliases?: string[]
): OverpassSearchBrand {
  return {
    entityId,
    name,
    wikidata: OSM_WIKIDATA_BY_ENTITY[entityId],
    aliases,
  };
}
