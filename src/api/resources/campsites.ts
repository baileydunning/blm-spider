// src/resources/campsites.ts
import { Resource, databases, logger } from "harperdb";
import { corsPreflight, json } from "../middleware/http.js";
import { safe, badRequest, notFound, tooMany } from "../middleware/errors.js";
import { rateLimit } from "../middleware/rateLimit.js";

const { Campsite: CampsiteTable } = databases.Campsites;

export class GetCampsites extends Resource {
  allowRead() { return true; }

  async options() {
    return corsPreflight();
  }

  async get(query: {
    state?: string;
    name__contains?: string;
    limit?: string | number;
    offset?: string | number;
  }) {
    return safe(async () => {
      const rl = rateLimit({ key: "public", max: 100, windowMs: 15 * 60 * 1000 });
      if (rl.blocked) return tooMany("Rate limit exceeded", rl.headers);

      const limit = Number(query.limit ?? 50);
      const offset = Number(query.offset ?? 0);
      const state = (query.state ?? "").trim();
      const nameContains = (query.name__contains ?? "").trim().toLowerCase();

      logger.info(`Listing campsites state=${state || "-"} contains=${nameContains || "-"} limit=${limit} offset=${offset}`);

      let rows = state
        ? await CampsiteTable.find({ where: { state }, limit, offset })
        : await CampsiteTable.find({ limit, offset });

      if (nameContains) {
        rows = rows.filter((r: any) => String(r.name ?? "").toLowerCase().includes(nameContains));
      }

      return json(rows, rl.headers);
    });
  }
}

export class GetCampsiteById extends Resource {
  allowRead() { return true; }

  async options() {
    return corsPreflight();
  }

  async get(params: { id?: string }) {
    return safe(async () => {
      if (!params?.id) return badRequest('Missing "id" param');

      const row = await CampsiteTable.get(params.id);
      if (!row) return notFound();

      return json(row);
    });
  }
}
