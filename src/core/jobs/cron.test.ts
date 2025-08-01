import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');

  return {
    ...actual,
    writeFileSync: vi.fn(),
    readFileSync: vi.fn((filePath: string | Buffer) => {
      const pathStr = typeof filePath === 'string' ? filePath : '';
      if (pathStr.includes('us-states.geojson')) {
        return JSON.stringify({ type: 'FeatureCollection', features: [] });
      }
      return '';
    }),
  };
});

import { runSpiderJob } from './cron';
import * as spiderModule from '../spider/spider';
import { mockCampsites } from '../types/mockCampsites';
import { writeFileSync } from 'fs';

describe('runSpiderJob', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  let spiderConstructorSpy: ReturnType<typeof vi.spyOn>;
  let crawlMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    crawlMock = vi.fn().mockResolvedValue(mockCampsites);
    spiderConstructorSpy = (vi.spyOn(spiderModule, 'Spider') as unknown as any).mockImplementation(function (this: any) {
      this.crawl = crawlMock;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the spider and writes output to file', async () => {
    await runSpiderJob();

    expect(spiderConstructorSpy).toHaveBeenCalledWith('dispersed');
    expect(crawlMock).toHaveBeenCalled();

    expect(writeFileSync).toHaveBeenCalledWith(
      'data/blm-campsites.json',
      JSON.stringify(mockCampsites, null, 2)
    );

    expect(consoleSpy).toHaveBeenCalledWith('[CRON] Starting spider job...');
    expect(consoleSpy).toHaveBeenCalledWith(
      `[CRON] Spider finished. Saved ${mockCampsites.length} sites to data/blm-campsites.json.`
    );
  });
});
