import { databases, logger } from "harperdb";
import seedData from "../../data/blm-campsites.json";
import type { Campsite } from "../core/types/index"; 
import { GetCampsites, GetCampsiteById } from "./resources/campsites.js";
import { Health } from "./resources/health.js";
import { Docs } from "./resources/docs.js";

const { Campsite: CampsiteTable } = databases.Campsites;

// @ts-ignore
if (server?.workerIndex === 0) {
  (async () => {
    try {
      logger.info("Seeding Campsites database…");
      for (const item of seedData as Campsite[]) {
        const id = String(item.id ?? Math.random().toString(36).slice(2));
        await CampsiteTable.put({ ...item, id });
      }
      logger.info(`Seeded ${seedData.length} records.`);
    } catch (e: any) {
      logger.warn(`Seeding skipped/failed: ${e?.message ?? e}`);
    }
  })();
}

export const campsites = GetCampsites;
export const campsite = GetCampsiteById;
export const health = Health;
export const docs = Docs;