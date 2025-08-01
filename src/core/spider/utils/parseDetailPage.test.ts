import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { parseDetailPage } from './parseDetailPage';

vi.mock('axios');

const mockedAxios = axios as unknown as { get: (url: string) => Promise<{ data: string }> };

describe('parseDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('parses name from div.field.contact-block.-title h4 a', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <div class="field contact-block -title">
                    <h4><a>Test Campsite Name</a></h4>
                </div>
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.name).toBe('Test Campsite Name');
    });

    it('falls back to h1.page-title for name', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<h1 class="page-title">Fallback Name</h1>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.name).toBe('Fallback Name');
    });

    it('falls back to title tag for name', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<title>Title Name</title>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.name).toBe('Title Name');
    });

    it('removes "| Bureau of Land Management" from name', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<div class="field contact-block -title"><h4><a>Camp | Bureau of Land Management</a></h4></div>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.name).toBe('Camp');
    });

    it('parses description from Overview heading and paragraphs', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <div class="field contact-block -body">
                    <h2>Overview</h2>
                    <p>First paragraph.</p>
                    <p>Second paragraph.</p>
                </div>
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.description).toContain('First paragraph.');
        expect(result?.description).toContain('Second paragraph.');
    });

    it('parses meta description if present', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <meta name="description" content="Meta description here.">
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.description).toContain('Meta description here.');
    });

    it('parses state from .field.contact-block.-state', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<div class="field contact-block -state">CA</div>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.state).toBe('CA');
    });

    it('parses directions from .field.contact-block.-directions', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<div class="field contact-block -directions"><p>Go north.</p></div>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.directions).toBe('Go north.');
    });

    it('parses wildlife from heading and list', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <h3>Wildlife</h3>
                <ul>
                    <li>Deer</li>
                    <li>Bear</li>
                </ul>
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.wildlife).toEqual(['Deer', 'Bear']);
    });

    it('parses fees from .field.contact-block.-fee-description', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<div class="field contact-block -fee-description">Fee info</div>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.fees).toBe('Fee info');
    });

    it('parses stayLimit from .field.contact-block.-stay-limit', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<div class="field contact-block -stay-limit">14 days</div>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.stayLimit).toBe('14 days');
    });

    it('parses activities from body text', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `<div class="field contact-block -body">Camping, hiking, fishing.</div>`
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.activities).toContain('CAMPING');
        expect(result?.activities).toContain('HIKING');
        expect(result?.activities).toContain('FISHING');
    });

    it('parses campgrounds from h3 and u tags', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <div class="field contact-block -body">
                    <h3>Main Campground</h3>
                    <u>Secondary Campground</u>
                </div>
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.campgrounds).toContain('Main Campground');
        expect(result?.campgrounds).toContain('Secondary Campground');
    });

    it('parses lat/lng and generates mapLink', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <div>
                    <h2>Geographic Coordinates</h2>
                    <div class="views-field-field-latitude"><span class="field-content">40.123</span></div>
                    <div class="views-field-field-longitude"><span class="field-content">-120.456</span></div>
                </div>
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.lat).toBeCloseTo(40.123);
        expect(result?.lng).toBeCloseTo(-120.456);
        expect(result?.mapLink).toContain('openstreetmap.org');
    });

    it('parses images from div.ridb-image-content', async () => {
        mockedAxios.get = vi.fn().mockResolvedValue({
            data: `
                <div class="ridb-image-content">
                    <img src="img1.jpg" alt="Image 1"/>
                    <div class="field-credit">Photo by John</div>
                </div>
                <div class="ridb-image-content">
                    <img src="img2.jpg" alt="Image 2"/>
                </div>
            `
        });
        const result = await parseDetailPage('http://example.com');
        expect(result?.images?.[0]).toEqual({
            src: 'img1.jpg',
            alt: 'Image 1',
            credit: 'Photo by John'
        });
        expect(result?.images?.[1]).toEqual({
            src: 'img2.jpg',
            alt: 'Image 2',
            credit: undefined
        });
    });

    it('returns null and logs error on axios failure', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'));
        const result = await parseDetailPage('http://example.com');
        expect(result).toBeNull();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});