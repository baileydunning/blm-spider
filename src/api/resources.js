import { Resource, databases } from 'harperdb'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CampsitesTable = databases.Campsites.Campsite;

export class Campsites extends Resource {
    async get(target, data) {
        let campsites = await CampsitesTable.get();
            const state = target.get('state')?.toLowerCase();
            if (state) {
                campsites = campsites.filter(site => site.state?.toLowerCase() === state);
            }

            const activities = target.get('activities');
            if (activities) {
                const activityList = activities
                    .split(',')
                    .map(a => a.trim().toLowerCase())
                    .filter(Boolean);
                if (activityList.length) {
                    campsites = campsites.filter(site =>
                        Array.isArray(site.activities) &&
                        activityList.every(requested => {
                            const siteSet = new Set(site.activities?.map(a => a.trim().toLowerCase()));
                            return siteSet.has(requested);
                        })
                    );
                }
            }

            const rawLimit = target.get('limit');
            const rawOffset = target.get('offset');
            const offset = parseInt(rawOffset, 10) || 0;

            let sliced = campsites;
            if (rawLimit === 'all') {
                // do nothing, return all
            } else {
                const limit = parseInt(rawLimit, 10);
                const appliedLimit = isNaN(limit) ? 100 : limit;
                sliced = campsites.slice(offset, offset + appliedLimit);
            }

            const totalCount = Array.from(sliced).length;

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Total-Count': totalCount.toString(),
                },
                body: JSON.stringify(sliced),
            }
    }

    async post() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const filePath = path.resolve(__dirname, '../../data/blm-campsites.json');
        const data = fs.readFileSync(filePath);

        const campsites = JSON.parse(data);

        let inserted = 0;
        for (const campsite of campsites) {
            if (CampsitesTable.get({ name: campsite.name }).length === 0) {
                await CampsitesTable.create(campsite);
                inserted++;
            }
        }
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Campsites table refreshed', inserted })
        };
    }
}

export class Health extends Resource {
    async get() {
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        };
    }
}