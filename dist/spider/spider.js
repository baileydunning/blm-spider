"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spider = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const parseSearchPage_1 = require("./parseSearchPage");
const parseDetailPage_1 = require("./parseDetailPage");
const excludePlaces_1 = require("../utils/excludePlaces");
const uuid_1 = require("uuid");
const p_limit_1 = __importDefault(require("p-limit"));
const getStateFromCoordinates_1 = require("../utils/getStateFromCoordinates");
const cleanText_1 = require("../utils/cleanText");
const BASE_URL = 'https://www.blm.gov';
const axiosInstance = axios_1.default.create({
    timeout: 10000,
    httpAgent: new (require('http').Agent)({ keepAlive: true }),
    httpsAgent: new (require('https').Agent)({ keepAlive: true }),
});
async function fetchWithRetry(url, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axiosInstance.get(url);
            return response.data;
        }
        catch (err) {
            if (attempt === retries)
                throw err;
            await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
        }
    }
    throw new Error('Failed to fetch after retries');
}
class Spider {
    constructor(query) {
        this.startUrl = `${BASE_URL}/visit/search?query=${encodeURIComponent(query)}`;
    }
    async crawl() {
        const jobStart = performance.now();
        console.time('[Spider] Total crawl duration');
        const visited = new Set();
        const campsites = [];
        const campsiteUrls = new Set();
        const limit = (0, p_limit_1.default)(12);
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
        const crawlPages = async (baseUrl) => {
            console.time('[Spider] Page crawl duration');
            let page = 0;
            const allDetailLinks = [];
            while (true) {
                const pageUrl = `${baseUrl}&page=${page}`;
                if (visited.has(`search:${pageUrl}`))
                    break;
                visited.add(`search:${pageUrl}`);
                let html;
                try {
                    html = await fetchWithRetry(pageUrl);
                    stats.pagesFetched++;
                }
                catch (err) {
                    console.error(`[Spider] Failed to fetch search page: ${pageUrl}`, err);
                    break;
                }
                const $ = (0, cheerio_1.load)(html);
                const detailLinks = (0, parseSearchPage_1.parseSearchPage)($);
                stats.detailLinksFound += detailLinks.length;
                console.log(`[Spider] Page ${page}: found ${detailLinks.length} detail links.`);
                if (detailLinks.length === 0)
                    break;
                allDetailLinks.push(...detailLinks.map((relativeUrl, i) => ({ relativeUrl, page, i })));
                page++;
            }
            console.timeEnd('[Spider] Page crawl duration');
            console.log(`[Spider] Total detail links to process: ${allDetailLinks.length}`);
            console.time('[Spider] Detail fetch duration');
            const detailTasks = allDetailLinks.map(({ relativeUrl, page, i }) => limit(async () => {
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
                    site = await (0, parseDetailPage_1.parseDetailPage)(detailUrl);
                }
                catch (err) {
                    stats.errors++;
                    if (err.code === 'ECONNRESET') {
                        console.error(`[Spider] Socket hangup on ${detailUrl} — retrying may help.`);
                    }
                    else {
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
                const { ok, reason } = (0, excludePlaces_1.excludePlaces)(site);
                if (!ok) {
                    console.log(`[Spider] [${page}:${i}] Skipped: "${site.name || 'Unknown'}" — ${reason} (${detailUrl})`);
                    stats.skipped++;
                    return;
                }
                console.log(`[Spider] [${page}:${i}] Parsed site: ${site.name || 'Unknown'} (${detailUrl})`);
                campsites.push({
                    id: (0, uuid_1.v4)(),
                    name: (0, cleanText_1.cleanText)(site.name) ?? 'Unknown',
                    url: detailUrl,
                    description: site.description && (0, cleanText_1.cleanText)(site.description),
                    lat: site.lat ?? 0,
                    lng: site.lng ?? 0,
                    state: site.state || (0, getStateFromCoordinates_1.getStateFromCoordinates)(site.lat ?? 0, site.lng ?? 0) || '',
                    mapLink: site.mapLink || '',
                    directions: site.directions && (0, cleanText_1.cleanText)(site.directions),
                    campgrounds: site.campgrounds,
                    activities: site.activities,
                    wildlife: site.wildlife,
                    fees: site.fees && (0, cleanText_1.cleanText)(site.fees),
                    stayLimit: site.stayLimit && (0, cleanText_1.cleanText)(site.stayLimit),
                    images: site.images?.map((img) => ({
                        src: img.src,
                        alt: img.alt ? (0, cleanText_1.cleanText)(img.alt) : undefined,
                        credit: img.credit ? (0, cleanText_1.cleanText)(img.credit) : undefined,
                    })),
                    source: 'BLM',
                });
            }));
            await Promise.allSettled(detailTasks);
            if (stats.detailsFetched > 0) {
                stats.durations.avg = parseFloat((stats.durations.avg / stats.detailsFetched).toFixed(1));
            }
            else {
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
exports.Spider = Spider;
