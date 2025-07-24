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
// Run every 2 weeks on Sunday at 2:00 AM
node_cron_1.default.schedule('0 2 */14 * *', runSpiderJob);
if (require.main === module) {
    runSpiderJob();
}
console.log('Cronjob scheduled.');
