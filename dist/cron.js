"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const spider_1 = require("./spider/spider");
const fs_1 = require("fs");
async function runSpiderJob() {
    console.log('[CRON] Starting spider job...');
    const spider = new spider_1.Spider('dispersed');
    const sites = await spider.crawl();
    (0, fs_1.writeFileSync)('data/blm-campsites.json', JSON.stringify(sites, null, 2));
    console.log(`[CRON] Spider finished. Saved ${sites.length} sites to data/blm-campsites.json.`);
}
if (!process.env.GITHUB_ACTIONS) {
    node_cron_1.default.schedule('0 2 * * 0', runSpiderJob);
    console.log('Cronjob scheduled.');
}
// If run directly, execute the spider job once and exit
if (require.main === module) {
    runSpiderJob().then(() => {
        process.exit(0);
    });
}
