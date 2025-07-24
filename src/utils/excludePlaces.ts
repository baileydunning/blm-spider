import { Campsite } from '../types';

export function excludePlaces(site: Partial<Campsite>): { ok: boolean; reason: string } {
  const exclusionTerms = [
    'shooting range',
    'day use',
    'day-use',
    'day use only',
    'day-use only',
    'science center',
    'interpretive site',
    'habitat management',
    'schoolhouse'
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

  const allText = [
    site.name,
    site.description,
    site.stayLimit,
    site.directions,
    ...(site.activities || [])
  ]
    .filter((val): val is string => typeof val === 'string')
    .map(val => val.toLowerCase())
    .join(' ');

  const hasCamping = campingTerms.some(term => allText.includes(term));
  const match = exclusionTerms.find(term => allText.includes(term));

  if (site.stayLimit && typeof site.stayLimit === 'string') {
    const stayLimitLower = site.stayLimit.toLowerCase();
    const stayLimitExclusion = exclusionTerms.find(term => stayLimitLower.includes(term));
    if (stayLimitExclusion) {
      return { ok: false, reason: `stayLimit matches "${stayLimitExclusion}"` };
    }
  }

  if (match && !hasCamping) {
    return { ok: false, reason: `Matches "${match}" and has no camping-related content` };
  }

  return { ok: true, reason: 'included' };
}
