import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FeatureCollection } from 'geojson';

const mockGeoJSON: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: { name: 'MockState' },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-105.1, 39.9],
                        [-104.9, 39.9],
                        [-104.9, 40.1],
                        [-105.1, 40.1],
                        [-105.1, 39.9],
                    ],
                ],
            },
        },
    ],
};

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        readFileSync: vi.fn(() => JSON.stringify(mockGeoJSON)),
    };
});

vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        ...actual,
        join: vi.fn(() => 'mock/path/us-states.geojson'),
    };
});

vi.resetModules();

import { getStateFromCoordinates } from './getStateFromCoordinates';

describe('getStateFromCoordinates', () => {
  it('returns the correct state name when point is inside polygon', async () => {
    vi.resetModules();
    const { getStateFromCoordinates, __clearStateCache } = await import('./getStateFromCoordinates');
    __clearStateCache();
    const result = getStateFromCoordinates(40.0, -105.0);
    expect(result).toBe('MockState');
  });

  it('returns null if feature has no name', async () => {
    mockGeoJSON.features[0].properties = {};
    vi.resetModules();
    const { getStateFromCoordinates, __clearStateCache } = await import('./getStateFromCoordinates');
    __clearStateCache();
    const result = getStateFromCoordinates(40.0, -105.0);
    expect(result).toBeNull();
    mockGeoJSON.features[0].properties = { name: 'MockState' };
  });

  it('returns null if feature has no name', async () => {
    mockGeoJSON.features[0].properties = {};
    vi.resetModules();
    const { getStateFromCoordinates, __clearStateCache } = await import('./getStateFromCoordinates');
    __clearStateCache();
    const result = getStateFromCoordinates(40.0, -105.0);
    expect(result).toBeNull();

    mockGeoJSON.features[0].properties = { name: 'MockState' };
  });
});
