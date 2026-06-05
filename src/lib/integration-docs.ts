import type { DocEntry } from './data';

/**
 * Marketing integration slugs do not always match Academy URL segments
 * (e.g. slug `nest` -> .../google-nest.md). Extend this map when a new
 * integration page uses a non-obvious path.
 */
const ACADEMY_PATH_ALIASES: Record<string, string[]> = {
  nest: ['google-nest', 'nest'],
  'booking-com': ['booking.com', 'booking-com'],
  'trip-com': ['trip.com', 'trip-com'],
  igloohome: ['igloohome'],
  '4suites': ['4suites'],
  '33-lock': ['33-lock'],
};

function pathnameOf(docUrl: string): string {
  try {
    return new URL(docUrl).pathname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Best-effort link from a marketing integration slug to an Academy setup
 * article. Returns null when no integration how-to page is indexed.
 */
export function findIntegrationSetupDoc(
  integrationSlug: string,
  integrationName: string,
  docs: DocEntry[],
): DocEntry | null {
  const slug = integrationSlug.toLowerCase();
  const aliases = ACADEMY_PATH_ALIASES[slug] ?? [slug, slug.replace(/-/g, '')];
  const nameLower = integrationName.toLowerCase();

  let best: { entry: DocEntry; score: number } | null = null;

  for (const entry of docs) {
    const path = pathnameOf(entry.url);
    // Setup guides live under /integrations/... on the Academy.
    if (!path.includes('/integrations/')) continue;

    let s = 0;
    for (const alias of aliases) {
      if (path.includes(alias.toLowerCase())) s += 0.45;
    }
    if (path.includes(`/${slug}/`) || path.endsWith(`/${slug}.md`)) s += 0.35;

    const titleLower = entry.title.toLowerCase();
    if (titleLower === nameLower) s += 0.4;
    else if (titleLower.includes(nameLower) || nameLower.includes(titleLower)) {
      s += 0.25;
    }

    if (s <= 0) continue;
    if (!best || s > best.score) best = { entry, score: s };
  }

  return best?.entry ?? null;
}
