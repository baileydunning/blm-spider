import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Spider, axiosInstance } from './spider';
import * as parseSearchModule from './parseSearchPage';
import * as parseDetailModule from './parseDetailPage';
import * as excludePlacesModule from '../utils/excludePlaces';
import * as stateUtils from '../utils/getStateFromCoordinates';
import * as uuid from 'uuid';

vi.mock('uuid', async () => ({
  ...((await vi.importActual('uuid')) as any),
  v4: vi.fn(() => 'mock-uuid'),
}));

describe('Spider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should crawl and return parsed campsites', async () => {
    vi.spyOn(axiosInstance, 'get').mockImplementation((url: string) => {
      if (url.includes('page=0')) {
        return Promise.resolve({ data: '<html>page 0</html>' });
      }
      if (url.includes('page=1')) {
        return Promise.resolve({ data: '<html>no results</html>' });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    vi.spyOn(parseSearchModule, 'parseSearchPage')
      .mockReturnValueOnce(['/test-detail'])
      .mockReturnValueOnce([]);

    vi.spyOn(parseDetailModule, 'parseDetailPage').mockResolvedValue({
      name: 'Mock Site',
      description: 'A wonderful place.',
      lat: 39.7392,
      lng: -104.9903,
      state: '',
      mapLink: 'https://example.com/map',
      directions: 'Take a left.',
      campgrounds: ['Campground A'],
      activities: ['Hiking'],
      wildlife: ['Deer'],
      fees: '$5',
      stayLimit: '14 days',
      images: [
        {
          src: 'https://example.com/image.jpg',
          alt: 'a campsite',
          credit: 'BLM',
        },
      ],
    });

    vi.spyOn(stateUtils, 'getStateFromCoordinates').mockReturnValue('Colorado');
    vi.spyOn(excludePlacesModule, 'excludePlaces').mockReturnValue({ ok: true, reason: '' });

    const spider = new Spider('dispersed');
    const campsites = await spider.crawl();

    expect(parseDetailModule.parseDetailPage).toHaveBeenCalled();
    expect(excludePlacesModule.excludePlaces).toHaveBeenCalled();
    expect(campsites).toHaveLength(1);
    expect(campsites[0]).toMatchObject({
      id: 'mock-uuid',
      name: 'Mock Site',
      state: 'Colorado',
      source: 'BLM',
      url: expect.stringContaining('blm.gov'),
    });
  });
});