"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excludePlaces = excludePlaces;
function excludePlaces(site) {
    const exclusionTerms = [
        'shooting range',
        'day use',
        'science center'
    ];
    const campingTerms = [
        'camp',
        'camping',
        'campground',
        'tent',
        'rv'
    ];
    if (site.lat === 0 && site.lng === 0) {
        return { ok: false, reason: 'Coordinates are (0,0)' };
    }
    const nameAndActivities = [site.name, ...(site.activities || [])]
        .filter((val) => typeof val === 'string')
        .map(val => val.toLowerCase())
        .join(' ');
    const hasCamping = campingTerms.some(term => nameAndActivities.includes(term));
    const match = exclusionTerms.find(term => nameAndActivities.includes(term));
    if (match && !hasCamping) {
        return { ok: false, reason: `Matches "${match}" and has no camping-related content` };
    }
    return { ok: true, reason: 'included' };
}
