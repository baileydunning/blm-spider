import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { getStateFromCoordinates } from './getStateFromCoordinates';
import fs from 'fs';

const testCases = [
  { lat: 39.7392, lng: -104.9903, expected: 'Colorado' }, 
  { lat: 34.0522, lng: -118.2437, expected: 'California' }, 
  { lat: 40.7128, lng: -74.006, expected: 'New York' },
  { lat: 41.8781, lng: -87.6298, expected: 'Illinois' }, 
  { lat: 47.6062, lng: -122.3321, expected: 'Washington' }, 
];

describe('getStateFromCoordinates', () => {
  const minimalGeoJSON = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Colorado' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-105, 39], [-104, 39], [-104, 40], [-105, 40], [-105, 39]]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'California' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-119, 34], [-118, 34], [-118, 35], [-119, 35], [-119, 34]]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'New York' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-75, 40], [-74, 40], [-74, 41], [-75, 41], [-75, 40]]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Illinois' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-88, 41], [-87, 41], [-87, 42], [-88, 42], [-88, 41]]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Washington' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-123, 47], [-122, 47], [-122, 48], [-123, 48], [-123, 47]]]
        }
      }
    ]
  });

  let readFileSyncSpy: any;
  beforeAll(() => {
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => minimalGeoJSON);
  });
  afterAll(() => {
    readFileSyncSpy.mockRestore();
  });

  it('returns the correct state for known coordinates', () => {
    for (const { lat, lng, expected } of testCases) {
      const result = getStateFromCoordinates(lat, lng);
      expect(result).toBe(expected);
    }
  });

  it('returns null for out-of-bounds coordinates', () => {
    const result = getStateFromCoordinates(0, 0); // Not in US
    expect(result).toBeNull();
  });
});