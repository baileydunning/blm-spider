import fs from 'fs';
import path from 'path';
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

const statesGeoJSON: FeatureCollection = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/us-states.geojson'), 'utf8')
);

export function getStateFromCoordinates(lat: number, lng: number): string | null {
  const pt = point([lng, lat]);
  for (const feature of statesGeoJSON.features) {
    if (booleanPointInPolygon(pt, feature as Feature<Polygon | MultiPolygon>)) {
      return feature.properties?.name || null;
    }
  }
  return null;
}
