import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Campsite } from './types';
import { readFileSync } from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();
app.use(cors());
app.use(express.json());

const swaggerDocument = YAML.load(__dirname + '/../openapi.yaml');
dotenv.config();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

function loadCampsites(): Campsite[] {
  try {
    const data = readFileSync('data/blm-campsites.json', 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    throw new Error('Failed to load campsite data.');
  }
}

app.get('/api/v1/campsites', (req: Request, res: Response, next: NextFunction) => {
  try {
    let campsites = loadCampsites();
    
    const state = req.query.state as string | undefined;
    if (state) {
      campsites = campsites.filter(
        (site) => site.state?.toLowerCase() === state.toLowerCase()
      );
    }
    
    const limitParam = req.query.limit;
    const offsetParam = req.query.offset;
    let limit: number | undefined;
    let offset: number | undefined;
    
    if (limitParam !== undefined) {
      limit = parseInt(limitParam as string, 10);
      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'Invalid "limit" parameter' });
      }
    }
    
    if (offsetParam !== undefined) {
      offset = parseInt(offsetParam as string, 10);
      if (isNaN(offset) || offset < 0) {
        return res.status(400).json({ error: 'Invalid "offset" parameter' });
      }
    }
    
    if (limit !== undefined && offset !== undefined) {
      campsites = campsites.slice(offset, offset + limit);
    }
    
    res.json(campsites);
  } catch (err) {
    next(err);
  }
});

app.get('/api/v1/campsites/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const campsites = loadCampsites();
    const site = campsites.find((site) => site.id === req.params.id);
    
    if (!site) {
      return res.status(404).json({ error: 'Campsite not found' });
    }
    
    res.json(site);
  } catch (err) {
    next(err);
  }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
