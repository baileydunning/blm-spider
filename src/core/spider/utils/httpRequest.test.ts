import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, axiosInstance } from './httpRequest';

describe('fetchWithRetry', () => {
    const url = 'http://example.com/data';
    let getMock: any;

    beforeEach(() => {
        getMock = vi.spyOn(axiosInstance, 'get');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns data on first attempt', async () => {
        getMock.mockResolvedValueOnce({ data: 'success' });

        const result = await fetchWithRetry(url);

        expect(result).toBe('success');
        expect(getMock).toHaveBeenCalledTimes(1);
        expect(getMock).toHaveBeenCalledWith(url);
    });

    it('retries on failure and succeeds', async () => {
        getMock
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockResolvedValueOnce({ data: 'recovered' });

        const result = await fetchWithRetry(url, 2);

        expect(result).toBe('recovered');
        expect(getMock).toHaveBeenCalledTimes(2);
    });

    it('throws error after all retries fail', async () => {
        getMock.mockRejectedValue(new Error('fail'));

        await expect(fetchWithRetry(url, 2)).rejects.toThrow('fail');
        expect(getMock).toHaveBeenCalledTimes(3);
    });

    it('waits between retries', async () => {
        vi.useFakeTimers();
        getMock
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockResolvedValueOnce({ data: 'ok' });

        const promise = fetchWithRetry(url, 2);

        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);

        const result = await promise;
        expect(result).toBe('ok');
        vi.useRealTimers();
    });
});