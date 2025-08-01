import { describe, it, expect } from 'vitest';
import { getStateFromCoordinates } from './getStateFromCoordinates';

const testCases = [
  { lat: 39.7392, lng: -104.9903, expected: 'Colorado' }, 
  { lat: 34.0522, lng: -118.2437, expected: 'California' }, 
  { lat: 40.7128, lng: -74.006, expected: 'New York' },
  { lat: 41.8781, lng: -87.6298, expected: 'Illinois' }, 
  { lat: 47.6062, lng: -122.3321, expected: 'Washington' }, 
];

describe('getStateFromCoordinates', () => {
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