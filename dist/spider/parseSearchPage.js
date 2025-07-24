"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSearchPage = parseSearchPage;
function parseSearchPage($) {
    const links = [];
    $('div.field.contact-block.-title a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            links.push(href);
        }
    });
    return links;
}
