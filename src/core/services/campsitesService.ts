import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { loadCampsites } from '../loaders/loadCampsites';
import path from 'path';

export function getCampsites(req: Request, res: Response, next: NextFunction) {
  try {
    let campsites = loadCampsites();

    const state = (req.query.state as string)?.toLowerCase();
    if (state) {
      if (!/^[a-z]{2}$/.test(state)) {
        return res.status(400).json({ error: 'Invalid "state" parameter. Use 2-letter lowercase abbreviation (e.g. "co")' });
      }
      campsites = campsites.filter(site => site.state?.toLowerCase() === state);
    }

    const activities = req.query.activities as string;
    if (activities) {
      const activityList = activities
        .split(',')
        .map(a => a.trim().toLowerCase())
        .filter(Boolean);

      if (!activityList.length) {
        return res.status(400).json({ error: 'Invalid "activities" parameter. Provide a comma-separated list.' });
      }

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
      return res.sendFile(path.join(__dirname, '../../../data/blm-campsites.json'));
    }

    const limit = parseInt(rawLimit, 10);

    if (rawLimit && (isNaN(limit) || limit < 1)) {
      return res.status(400).json({ error: 'Invalid "limit" parameter' });
    }
    
    if (rawOffset && (isNaN(offset) || offset < 0)) {
      return res.status(400).json({ error: 'Invalid "offset" parameter' });
    }

    const appliedLimit = isNaN(limit) ? 100 : limit;
    const sliced = campsites.slice(offset, offset + appliedLimit);

    let i = 0;
    const stream = new Readable({
      read() {
        if (i === 0) this.push('[');
        if (i < sliced.length) {
          const item = JSON.stringify(sliced[i]);
          this.push(i > 0 ? ',' + item : item);
          i++;
          setImmediate(() => this.read());
        } else {
          this.push(']');
          this.push(null);
        }
      }
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export function getCampsiteById(req: Request, res: Response, next: NextFunction) {
  try {
    const campsite = loadCampsites().find(site => site.id === req.params.id);
    if (!campsite) return res.status(404).json({ error: 'Campsite not found' });
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(campsite);
  } catch (err) {
    next(err);
  }
}
