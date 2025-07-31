import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cluster from 'cluster';
import os from 'os';
import { startServer } from './server';

vi.mock('./server', () => ({
    startServer: vi.fn(),
}));

describe('index.ts (clustering)', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fork workers if primary', async () => {
        vi.spyOn(cluster, 'isPrimary', 'get').mockReturnValue(true);
        const forkSpy = vi.spyOn(cluster, 'fork').mockImplementation(() => ({} as any));
        const onSpy = vi.spyOn(cluster, 'on').mockImplementation(() => cluster as any);

        await import('./index');

        expect(forkSpy).toHaveBeenCalledTimes(os.cpus().length);
        expect(onSpy).toHaveBeenCalledWith('exit', expect.any(Function));
    });

    it('should start server if worker', async () => {
        vi.spyOn(cluster, 'isPrimary', 'get').mockReturnValue(false);

        await import('./index');

        expect(startServer).toHaveBeenCalled();
    });
});