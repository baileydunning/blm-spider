import fs from 'fs';
import path from 'path';
import { Campsite } from '../types';

let cachedCampsites: Campsite[] = [];

export function loadCampsites(): Campsite[] {
  if (cachedCampsites.length) return cachedCampsites;
  const dataPath = path.join(__dirname, '../../../data/blm-campsites.json');
  cachedCampsites = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return cachedCampsites;
}