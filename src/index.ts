import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Campsite } from './types';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import compression from 'compression';
import { Readable } from 'stream';

dotenv.config();
const PORT = process.env.PORT || 8080;
export const app = express();
const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));

app.use(compression({
  level: 9,
  threshold: 0,
}));

app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

let cachedCampsites: Campsite[] = [];
const dataPath = path.join(__dirname, '../data/blm-campsites.json');
function loadCampsites(): Campsite[] {
  if (cachedCampsites.length) return cachedCampsites;
  cachedCampsites = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return cachedCampsites;
}

app.get('/api/v1/campsites', (req, res, next) => {
  try {
    let campsites = loadCampsites();

    const state = (req.query.state as string)?.toLowerCase();
    if (state) {
      campsites = campsites.filter(site => site.state?.toLowerCase() === state);
    }

    const activities = (req.query.activities as string);
    if (activities) {
      const activityList = activities.split(',').map(a => a.trim().toLowerCase());
      campsites = campsites.filter(site =>
        Array.isArray(site.activities) &&
        activityList.every(requested => {
          const siteSet = new Set(site.activities?.map(a => a.trim().toLowerCase()));
          return siteSet.has(requested);
        })
      );
    }

    const rawLimit = req.query.limit as string;
    const rawOffset = req.query.offset as string;
    const offset = parseInt(rawOffset, 10) || 0;

    if (rawLimit === 'all') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      const fileStream = fs.createReadStream(dataPath);
      fileStream.on('error', err => {
        console.error('File stream error:', err);
        next(err);
      });
      fileStream.pipe(res);
      return;
    } else {
      const limit = parseInt(rawLimit, 10);
      if (rawLimit && (isNaN(limit) || limit < 1)) {
        console.warn(`Invalid limit param: "${rawLimit}"`);
        return res.status(400).json({ error: 'Invalid "limit" parameter' });
      }
      if (rawOffset && (isNaN(offset) || offset < 0)) {
        console.warn(`Invalid offset param: "${rawOffset}"`);
        return res.status(400).json({ error: 'Invalid "offset" parameter' });
      }

      const appliedLimit = isNaN(limit) ? 100 : limit;
      campsites = campsites.slice(offset, offset + appliedLimit);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');

    let i = 0;
    const readable = new Readable({
      read() {
        if (i === 0) {
          this.push('[');
        }

        if (i < campsites.length) {
          const campsite = JSON.stringify(campsites[i]);
          this.push(i > 0 ? ',' + campsite : campsite);
          if (i % 100 === 0) console.log(`Streamed ${i + 1} of ${campsites.length}`);
          i++;
          setImmediate(() => this.read());
        } else {
          this.push(']');
          this.push(null);
        }
      }
    });

    readable.pipe(res);
  } catch (err) {
    console.error('Streaming error:', err);
    next(err);
  }
});


app.get('/api/v1/campsites/:id', (req, res, next) => {
  try {
    const site = loadCampsites().find(site => site.id === req.params.id);
    if (!site) return res.status(404).json({ error: 'Campsite not found' });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(site);
  } catch (err) {
    next(err);
  }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});