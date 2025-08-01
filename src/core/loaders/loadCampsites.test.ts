import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mockCampsites } from '../types/mockCampsites';

vi.mock('fs');
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        ...actual,
        join: (...args: string[]) => actual.join(...args),
    };
});

describe('loadCampsites', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('reads and parses campsites from file on first call', async () => {
        const readFileSyncMock = vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockCampsites));
        const { loadCampsites } = await import('./loadCampsites');
        const campsites = loadCampsites();
        expect(readFileSyncMock).toHaveBeenCalledTimes(1);
        expect(campsites).toEqual(mockCampsites);
    });

    it('returns cached campsites on subsequent calls', async () => {
        const readFileSyncMock = vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockCampsites));
        const { loadCampsites } = await import('./loadCampsites');
        const campsites1 = loadCampsites();
        const campsites2 = loadCampsites();
        expect(readFileSyncMock).toHaveBeenCalledTimes(1);
        expect(campsites2).toBe(campsites1);
        expect(campsites2).toEqual(mockCampsites);
    });

    it('uses the correct data path', async () => {
        const joinSpy = vi.spyOn(path, 'join');
        vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockCampsites));
        const { loadCampsites } = await import('./loadCampsites');
        loadCampsites();
        expect(joinSpy).toHaveBeenCalledWith(__dirname, '../../../data/blm-campsites.json');
    });
});