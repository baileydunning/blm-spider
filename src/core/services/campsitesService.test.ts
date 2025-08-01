import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCampsites } from './campsitesService';
import { mockCampsites } from '../types/mockCampsites';
import * as loaders from '../loaders/loadCampsites';
import { Writable } from 'stream';
import path from 'path';
import type { Response, Request } from 'express';

type MockResponse = Partial<Response> & Writable;

function createMockReq(query: Record<string, string> = {}): Partial<Request> {
  return { query };
}

function createWritableRes(onData: (data: string) => void, onEnd?: () => void): MockResponse {
  const chunks: Buffer[] = [];

  const writable = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
    final(callback) {
      const combined = Buffer.concat(chunks).toString();
      onData(combined);
      if (onEnd) onEnd();
      callback();
    }
  }) as MockResponse;

  writable.setHeader = vi.fn();
  writable.status = vi.fn().mockReturnThis();
  writable.json = vi.fn();
  writable.sendFile = vi.fn();

  return writable;
}

describe('getCampsites', () => {
  let loadCampsitesSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loadCampsitesSpy = vi.spyOn(loaders, 'loadCampsites').mockReturnValue([...mockCampsites]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all campsites as a stream with default limit', async () => {
    const req = createMockReq();
    const next = vi.fn();

    const res = createWritableRes((data) => {
      const parsed = JSON.parse(data);
      expect(parsed).toEqual(mockCampsites.slice(0, 100));
    });

    getCampsites(req as Request, res as Response, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
    expect(next).not.toHaveBeenCalled();
  });

  it('filters by state', async () => {
    const req = createMockReq({ state: 'ca' });
    const next = vi.fn();

    const res = createWritableRes((data) => {
      const parsed = JSON.parse(data);
      expect(parsed).toEqual([mockCampsites[0], mockCampsites[2]]);
    });

    getCampsites(req as Request, res as Response, next);
    await new Promise(resolve => setImmediate(resolve));
  });

  it('filters by activities', async () => {
    const req = createMockReq({ activities: 'camping,photography' });
    const next = vi.fn();

    const res = createWritableRes((data) => {
      const parsed = JSON.parse(data);
      expect(parsed).toEqual([mockCampsites[2]]);
    });

    getCampsites(req as Request, res as Response, next);
    await new Promise(resolve => setImmediate(resolve));
  });

  it('applies limit and offset', async () => {
    const req = createMockReq({ limit: '1', offset: '1' });
    const next = vi.fn();

    const res = createWritableRes((data) => {
      const parsed = JSON.parse(data);
      expect(parsed).toEqual([mockCampsites[1]]);
    });

    getCampsites(req as Request, res as Response, next);
    await new Promise(resolve => setImmediate(resolve));
  });

  it('returns 400 for invalid limit', () => {
    const req = createMockReq({ limit: 'foo' });
    const next = vi.fn();

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    getCampsites(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid "limit" parameter' });
  });

  it('returns 400 for invalid offset', () => {
    const req = createMockReq({ offset: '-1' });
    const next = vi.fn();

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    getCampsites(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid "offset" parameter' });
  });

  it('sends file if limit is "all"', () => {
    const req = createMockReq({ limit: 'all' });
    const next = vi.fn();

    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn()
    } as unknown as Response;

    getCampsites(req as Request, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
    expect(res.sendFile).toHaveBeenCalledWith(
      path.join(__dirname, '../../../data/blm-campsites.json')
    );
  });

  it('calls next(err) on exception', () => {
    loadCampsitesSpy.mockImplementationOnce(() => {
      throw new Error('fail');
    });

    const req = createMockReq();
    const next = vi.fn();

    const res = {
      setHeader: vi.fn()
    } as unknown as Response;

    getCampsites(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });
});
