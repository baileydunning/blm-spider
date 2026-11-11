import { load } from 'cheerio';

// Returns every <loc> URL in a sitemap or sitemap index.
export function parseSitemapLocs(xml: string): string[] {
  const $ = load(xml, { xmlMode: true });
  return $('loc')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

// Keeps only top-level BLM "visit" pages (/visit/<slug>), which is what the
// search results used to list. Sub-pages like /visit/<slug>/rules are dropped.
export function visitPaths(urls: string[]): string[] {
  const paths = new Set<string>();
  for (const url of urls) {
    let path: string;
    try {
      path = new URL(url).pathname.replace(/\/+$/, '');
    } catch {
      continue;
    }
    const match = path.match(/^\/visit\/([^/]+)$/);
    if (match && match[1] !== 'search') paths.add(path);
  }
  return [...paths];
}
