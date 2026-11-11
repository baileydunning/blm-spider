import { describe, it, expect } from 'vitest';
import { parseSitemapLocs, visitPaths } from './parseSitemap';

describe('parseSitemapLocs', () => {
  it('reads loc entries from a sitemap index', () => {
    const xml = `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://www.blm.gov/sitemap.xml?page=1</loc></sitemap><sitemap><loc>https://www.blm.gov/sitemap.xml?page=2</loc></sitemap></sitemapindex>`;
    expect(parseSitemapLocs(xml)).toEqual([
      'https://www.blm.gov/sitemap.xml?page=1',
      'https://www.blm.gov/sitemap.xml?page=2',
    ]);
  });
});

describe('visitPaths', () => {
  it('keeps top-level visit pages only', () => {
    expect(
      visitPaths([
        'https://www.blm.gov/visit/alvord-desert',
        'https://www.blm.gov/visit/alvord-desert',
        'https://www.blm.gov/visit/search',
        'https://www.blm.gov/visit/white-mountains/trail-update',
        'https://www.blm.gov/about',
      ])
    ).toEqual(['/visit/alvord-desert']);
  });
});
