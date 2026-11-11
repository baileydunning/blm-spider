import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Spider, campsiteId } from './spider';
import { axiosInstance } from './utils/httpRequest';
import * as parseDetailModule from './utils/parseDetailPage';
import * as excludePlacesModule from './utils/excludePlaces';
import * as stateUtils from '../loaders/getStateFromCoordinates';

describe('Spider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should crawl and return parsed campsites', async () => {
    vi.spyOn(axiosInstance, 'get').mockImplementation((url: string) => {
      if (url === 'https://www.blm.gov/sitemap.xml') {
        return Promise.resolve({ data: '<sitemapindex><sitemap><loc>https://www.blm.gov/sitemap.xml?page=1</loc></sitemap></sitemapindex>' });
      }
      if (url === 'https://www.blm.gov/sitemap.xml?page=1') {
        return Promise.resolve({ data: '<urlset><url><loc>https://www.blm.gov/visit/test-detail</loc></url><url><loc>https://www.blm.gov/about</loc></url></urlset>' });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    vi.spyOn(parseDetailModule, 'parseDetailPage').mockResolvedValue({
      id: 'mock-id',
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
      id: campsiteId('https://www.blm.gov/visit/test-detail'),
      name: 'Mock Site',
      state: 'Colorado',
      source: 'BLM',
      url: expect.stringContaining('blm.gov'),
    });
  });

  it('gives the same campsite the same id on every crawl', () => {
    const url = 'https://www.blm.gov/visit/alfalfa-curves-highway-vehicle-staging-area';
    expect(campsiteId(url)).toBe(campsiteId(url));
    expect(campsiteId(url)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(campsiteId(url)).not.toBe(campsiteId('https://www.blm.gov/visit/another-site'));
  });
});
