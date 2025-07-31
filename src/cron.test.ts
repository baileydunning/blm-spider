import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';
import { Spider } from './spider/spider';
import { writeFileSync } from 'fs';

vi.mock('node-cron', () => ({
    default: {
        schedule: vi.fn(),
    },
}));

vi.mock('./spider/spider', () => ({
    Spider: vi.fn().mockImplementation(() => ({
        crawl: vi.fn().mockResolvedValue([{ id: '1', name: 'Test Site', url: 'https://example.com' }]),
    })),
}));

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        writeFileSync: vi.fn(),
    };
});

describe('cron.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should schedule a cron job if not running in GitHub Actions', async () => {
        process.env.GITHUB_ACTIONS = '';
        await import('./cron');
        expect(cron.schedule).toHaveBeenCalledWith('0 2 * * 0', expect.any(Function));
    });

    it('should run spider and write file when runSpiderJob is called', async () => {
        const cronModule = await import('./cron');
        await cronModule.runSpiderJob();

        expect(writeFileSync).toHaveBeenCalledTimes(1);

        const [filePath, data] = (writeFileSync as any).mock.calls[0];
        expect(filePath).toBe('data/blm-campsites.json');
        const parsed = JSON.parse(data);
        expect(parsed).toEqual([
            { id: '1', name: 'Test Site', url: 'https://example.com' }
        ]);
    });
});