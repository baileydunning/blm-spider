import { describe, it, expect } from 'vitest';
import { excludePlaces } from './excludePlaces';

describe('excludePlaces', () => {
    it('returns false for coordinates (0,0)', () => {
        const result = excludePlaces({ lat: 0, lng: 0 });
        expect(result).toEqual({ ok: false, reason: 'Coordinates are (0,0)' });
    });

    it('excludes site with exclusion term in name and no camping terms', () => {
        const result = excludePlaces({ name: 'Shooting Range', lat: 1, lng: 1 });
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('shooting range');
    });

    it('includes site with exclusion term but also camping term', () => {
        const result = excludePlaces({ name: 'Day Use Campground', lat: 1, lng: 1 });
        expect(result.ok).toBe(true);
        expect(result.reason).toBe('included');
    });

    it('excludes site with exclusion term in description and no camping terms', () => {
        const result = excludePlaces({ description: 'This is a science center', lat: 1, lng: 1 });
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('science center');
    });

    it('includes site with camping term in activities', () => {
        const result = excludePlaces({ activities: ['Camping'], lat: 1, lng: 1 });
        expect(result.ok).toBe(true);
        expect(result.reason).toBe('included');
    });

    it('excludes site if stayLimit contains exclusion term', () => {
        const result = excludePlaces({ stayLimit: 'Day use only', lat: 1, lng: 1 });
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('stayLimit matches "day use"');
    });

    it('includes site with no exclusion terms and no camping terms', () => {
        const result = excludePlaces({ name: 'Picnic Area', lat: 1, lng: 1 });
        expect(result.ok).toBe(true);
        expect(result.reason).toBe('included');
    });

    it('handles mixed case exclusion and camping terms', () => {
        const result = excludePlaces({ name: 'ScIeNcE CeNtEr CaMpGrOuNd', lat: 1, lng: 1 });
        expect(result.ok).toBe(true);
        expect(result.reason).toBe('included');
    });

    it('excludes site with exclusion term in directions and no camping terms', () => {
        const result = excludePlaces({ directions: 'Go to the interpretive site', lat: 1, lng: 1 });
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('interpretive site');
    });

    it('includes site with camping term in stayLimit', () => {
        const result = excludePlaces({ stayLimit: 'Camping allowed for 14 days', lat: 1, lng: 1 });
        expect(result.ok).toBe(true);
        expect(result.reason).toBe('included');
    });
});