export function cleanText(str: string = ''): string {
  return str
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
    .replace(/\n*\s*An official website of the United States government\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
