/** Plain-text helpers for the Pylon-hosted public changelog. */

/** Strip HTML to plain text for agent consumption. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Drop Pylon KB chrome that survives htmlToText. */
export function stripChangelogChrome(text: string): string {
  let body = text;

  const cutoffs = [
    /(?:^|\n)\s*Related Articles\b/i,
    /(?:^|\n)\s*Powered by Pylon\b/i,
  ];
  for (const re of cutoffs) {
    const idx = body.search(re);
    if (idx >= 0) body = body.slice(0, idx).trim();
  }

  // Nav breadcrumbs before the first month section.
  const firstMonth = body.search(
    /(?:^|\n)\s*(?:##\s*)?(?:🗓\s*)?[A-Z][a-z]+ 20\d{2}\b/m,
  );
  if (firstMonth > 0) {
    const prefix = body.slice(0, firstMonth);
    if (/All Collections|Last updated/i.test(prefix)) {
      body = body.slice(firstMonth).trimStart();
    }
  }

  return body.trim();
}

/**
 * Month headers from Pylon plain text (`🗓 May 2026: …`) and from simpler
 * fixtures (`<h2>May 2026</h2>` → `May 2026`).
 */
const MONTH_HEADER =
  /(?:^|\n)\s*(?:##\s*)?(?:🗓\s*)?([A-Z][a-z]+ 20\d{2})\b/gm;

/** Keep the most recent N month sections from the changelog body. */
export function excerptRecentMonths(text: string, months: number): string {
  const indices: number[] = [];
  for (const match of text.matchAll(MONTH_HEADER)) {
    if (match.index !== undefined) indices.push(match.index);
  }
  if (indices.length <= months) return text;
  const cut = indices[months] ?? text.length;
  return text.slice(0, cut).trim();
}

/** Full pipeline from raw HTML or plain text to a bounded excerpt. */
export function processChangelogBody(
  raw: string,
  months: number,
): string {
  const text = raw.includes('<html') ? htmlToText(raw) : raw;
  return excerptRecentMonths(stripChangelogChrome(text), months);
}
