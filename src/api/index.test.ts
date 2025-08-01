import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './index';

describe('Express API', () => {
  it('should return 200 and health status on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  it('should serve OpenAPI docs on /docs', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="swagger-ui"></div>');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/some/unknown/route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('should apply rate limiting', async () => {
    for (let i = 0; i < 101; i++) {
      await request(app).get('/health');
    }
    const res = await request(app).get('/health');
    expect(res.status).toBe(429);
  });
});