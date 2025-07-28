import cron from 'node-cron';
import { Spider } from './spider/spider';
import { writeFileSync } from 'fs';

async function runSpiderJob() {
  console.log('[CRON] Starting spider job...');
  const spider = new Spider('dispersed');
  const sites = await spider.crawl();
  writeFileSync('data/blm-campsites.json', JSON.stringify(sites, null, 2));
  console.log(`[CRON] Spider finished. Saved ${sites.length} sites to data/blm-campsites.json.`);
}

if (!process.env.GITHUB_ACTIONS) {
  // Run every 2 weeks on Sunday at 2:00 AM
  cron.schedule('0 2 */14 * *', runSpiderJob);
  console.log('Cronjob scheduled.');
}

// If run directly, execute the spider job once and exit
if (require.main === module) {
  runSpiderJob().then(() => {
    process.exit(0);
  });
}
