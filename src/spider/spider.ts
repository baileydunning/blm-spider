import axios from 'axios';
import { load } from 'cheerio';
import { parseSearchPage } from './parseSearchPage';
import { parseDetailPage } from './parseDetailPage';
import { Campsite } from '../types';
import { excludePlaces } from '../utils/excludePlaces';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import { getStateFromCoordinates } from '../utils/getStateFromCoordinates';
import { cleanText } from '../utils/cleanText';

const BASE_URL = 'https://www.blm.gov';

const axiosInstance = axios.create({
  timeout: 10000,
  httpAgent: new (require('http').Agent)({ keepAlive: true }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true }),
});

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Failed to fetch after retries');
}

export class Spider {
  private startUrl: string;

  constructor(query: string) {
    this.startUrl = `${BASE_URL}/visit/search?query=${encodeURIComponent(query)}`;
  }

  public async crawl(): Promise<Campsite[]> {
    const jobStart = performance.now();
    console.time('[Spider] Total crawl duration');

    const visited = new Set<string>();
    const campsites: Campsite[] = [];
    const campsiteUrls = new Set<string>();
    const limit = pLimit(12);

    const stats = {
      pagesFetched: 0,
      detailLinksFound: 0,
      detailsFetched: 0,
      duplicates: 0,
      skipped: 0,
      errors: 0,
      durations: {
        avg: 0,
        min: Infinity,
        max: 0,
      },
    };

    const crawlPages = async (baseUrl: string) => {
      console.time('[Spider] Page crawl duration');

      let page = 0;
      const allDetailLinks: { relativeUrl: string; page: number; i: number }[] = [];

      while (true) {
        const pageUrl = `${baseUrl}&page=${page}`;
        if (visited.has(`search:${pageUrl}`)) break;
        visited.add(`search:${pageUrl}`);

        let html: string;
        try {
          html = await fetchWithRetry(pageUrl);
          stats.pagesFetched++;
        } catch (err) {
          console.error(`[Spider] Failed to fetch search page: ${pageUrl}`, err);
          break;
        }

        const $ = load(html);
        const detailLinks = parseSearchPage($);
        stats.detailLinksFound += detailLinks.length;

        console.log(`[Spider] Page ${page}: found ${detailLinks.length} detail links.`);
        if (detailLinks.length === 0) break;

        allDetailLinks.push(...detailLinks.map((relativeUrl, i) => ({ relativeUrl, page, i })));
        page++;
      }

      console.timeEnd('[Spider] Page crawl duration');
      console.log(`[Spider] Total detail links to process: ${allDetailLinks.length}`);

      console.time('[Spider] Detail fetch duration');

      const detailTasks = allDetailLinks.map(({ relativeUrl, page, i }) =>
        limit(async () => {
          const detailUrl = BASE_URL + relativeUrl;
          if (visited.has(`detail:${detailUrl}`)) {
            stats.duplicates++;
            return;
          }

          visited.add(`detail:${detailUrl}`);
          campsiteUrls.add(detailUrl);

          const start = performance.now();
          let site;
          try {
            site = await parseDetailPage(detailUrl);
          } catch (err: any) {
            stats.errors++;
            if (err.code === 'ECONNRESET') {
              console.error(`[Spider] Socket hangup on ${detailUrl} — retrying may help.`);
            } else {
              console.error(`[Spider] Error parsing detail page: ${detailUrl}`, err);
            }
            return;
          }

          const duration = performance.now() - start;

          // Track timing stats
          stats.detailsFetched++;
          stats.durations.avg += duration;
          stats.durations.min = Math.min(stats.durations.min, duration);
          stats.durations.max = Math.max(stats.durations.max, duration);

          if (!site) {
            console.warn(`[Spider] [${page}:${i}] No site data found for: ${detailUrl}`);
            return;
          }

          const { ok, reason } = excludePlaces(site);
          if (!ok) {
            console.log(`[Spider] [${page}:${i}] Skipped: "${site.name || 'Unknown'}" — ${reason} (${detailUrl})`);
            stats.skipped++;
            return;
          }

          console.log(`[Spider] [${page}:${i}] Parsed site: ${site.name || 'Unknown'} (${detailUrl})`);

          campsites.push({
            id: uuidv4(),
            name: cleanText(site.name) ?? 'Unknown',
            url: detailUrl,
            description: site.description && cleanText(site.description),
            lat: site.lat ?? 0,
            lng: site.lng ?? 0,
            state: site.state || getStateFromCoordinates(site.lat ?? 0, site.lng ?? 0) || '',
            directions: site.directions && cleanText(site.directions),
            campgrounds: site.campgrounds,
            activities: site.activities,
            wildlife: site.wildlife,
            fees: site.fees && cleanText(site.fees),
            stayLimit: site.stayLimit && cleanText(site.stayLimit),
            images: site.images?.map((img) => ({
              src: img.src,
              alt: img.alt ? cleanText(img.alt) : undefined,
              credit: img.credit ? cleanText(img.credit) : undefined,
            })),
            source: 'BLM',
          });
        })
      );

      await Promise.allSettled(detailTasks);

      if (stats.detailsFetched > 0) {
        stats.durations.avg = parseFloat((stats.durations.avg / stats.detailsFetched).toFixed(1));
      } else {
        stats.durations.avg = 0;
        stats.durations.min = 0;
        stats.durations.max = 0;
      }

      console.timeEnd('[Spider] Detail fetch duration');
    };

    const urlParams = new URLSearchParams(this.startUrl.split('?')[1]);
    const query = urlParams.get('query') || '';
    const baseUrl = `${BASE_URL}/visit/search?query=${query}`;

    console.log('[Spider] Starting crawl...');
    await crawlPages(baseUrl);
    const jobEnd = performance.now();
    const totalMs = jobEnd - jobStart;
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    console.log('--- Performance Summary ---');
    console.log(`Pages fetched: ${stats.pagesFetched}`);
    console.log(`Detail links found: ${stats.detailLinksFound}`);
    console.log(`Campsites parsed: ${stats.detailsFetched}`);
    console.log(`Duplicates: ${stats.duplicates}`);
    console.log(`Skipped due to exclusion: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Detail fetch durations (ms): avg=${stats.durations.avg}, min=${stats.durations.min.toFixed(1)}, max=${stats.durations.max.toFixed(1)}`);
    console.log(`Total time: ${minutes}m ${seconds}s`);
    console.log(`Final campsite count: ${campsites.length}`);

    console.timeEnd('[Spider] Total crawl duration');
    return campsites;
  }
}
