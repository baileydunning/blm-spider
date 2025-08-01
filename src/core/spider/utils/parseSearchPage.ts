import { CheerioAPI } from 'cheerio';

export function parseSearchPage($: CheerioAPI): string[] {
  const links: string[] = [];

  $('div.field.contact-block.-title a').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      links.push(href);
    }
  });

  return links;
}