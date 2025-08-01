import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import { parseSearchPage } from './parseSearchPage';

describe('parseSearchPage', () => {
    it('should return an array of hrefs from matching anchor tags', () => {
        const html = `
            <div class="field contact-block -title">
                <a href="/link1">Link 1</a>
                <a href="/link2">Link 2</a>
            </div>
            <div class="field contact-block -title">
                <a href="/link3">Link 3</a>
            </div>
        `;
        const $ = load(html);
        const result = parseSearchPage($);
        expect(result).toEqual(['/link1', '/link2', '/link3']);
    });

    it('should ignore anchor tags without href', () => {
        const html = `
            <div class="field contact-block -title">
                <a>Link 1</a>
                <a href="/link2">Link 2</a>
            </div>
        `;
        const $ = load(html);
        const result = parseSearchPage($);
        expect(result).toEqual(['/link2']);
    });

    it('should return an empty array if no matching elements', () => {
        const html = `
            <div class="other-class">
                <a href="/link1">Link 1</a>
            </div>
        `;
        const $ = load(html);
        const result = parseSearchPage($);
        expect(result).toEqual([]);
    });

    it('should handle empty input', () => {
        const html = ``;
        const $ = load(html);
        const result = parseSearchPage($);
        expect(result).toEqual([]);
    });
});