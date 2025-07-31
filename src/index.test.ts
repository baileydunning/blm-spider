import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from './index'; 

const mockDataPath = path.join(__dirname, '../data/blm-campsites.json');
const mockCampsites = [
  {
    id: '123',
    name: 'Mock Camp',
    state: 'CO',
    activities: ['Hiking', 'Camping'],
    lat: 39.7392,
    lng: -104.9903,
    mapLink: 'https://example.com/map',
    source: 'BLM'
  }
];

beforeAll(() => {
  fs.writeFileSync(mockDataPath, JSON.stringify(mockCampsites, null, 2));
});

afterAll(() => {
  fs.writeFileSync(mockDataPath, JSON.stringify([], null, 2));
});

describe('Campsite API', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/campsites returns all campsites', async () => {
    const res = await request(app).get('/api/v1/campsites');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/campsites with state filter', async () => {
    const res = await request(app).get('/api/v1/campsites?state=co');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].state).toBe('CO');
  });

  it('GET /api/v1/campsites with activity filter', async () => {
    const res = await request(app).get('/api/v1/campsites?activities=camping');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('GET /api/v1/campsites/:id with valid ID', async () => {
    const res = await request(app).get('/api/v1/campsites/123');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('123');
  });

  it('GET /api/v1/campsites/:id with invalid ID returns 404', async () => {
    const res = await request(app).get('/api/v1/campsites/bad-id');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/campsites with invalid limit returns 400', async () => {
    const res = await request(app).get('/api/v1/campsites?limit=zero');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('GET unknown route returns 404', async () => {
    const res = await request(app).get('/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});