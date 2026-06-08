import type { DocEntry } from './data';
import { rank, type Scored } from './search';

/**
 * When marketing names or topics do not match Academy URL segments, map query
 * shapes to path fragments (same idea as integration-docs.ts slug aliases).
 */
const TOPIC_PATH_ALIASES: { test: RegExp; pathIncludes: string }[] = [
  {
    test: /\bautomation/i,
    pathIncludes: '/automations',
  },
  {
    test: /\b(review|satisfaction|nps)\b/i,
    pathIncludes: '/review-center',
  },
  {
    test: /\bguest journey|pre-check-in|precheckin|check-in flow\b/i,
    pathIncludes: '/guest-journey',
  },
];

function docHaystack(d: DocEntry): string {
  let path = '';
  try {
    path = new URL(d.url).pathname.replace(/[/.-]/g, ' ');
  } catch {
    /* ignore */
  }
  return `${d.title} ${d.title} ${d.description} ${path}`;
}

/** Expand queries so marketing names match Academy URL segments. */
export function expandDocsQuery(query: string): string {
  let q = query;
  if (/\bnest\b/i.test(q)) q += ' google nest google-nest smart thermostat';
  if (/\bbooking\.?com\b/i.test(q)) q += ' booking.com booking-com ota';
  if (/\bautomation/i.test(q)) {
    q += ' automations guest message schedule condition satisfaction score';
  } else if (/\b(review|satisfaction|nps)\b/i.test(q)) {
    q += ' review center satisfaction score';
  }
  return q;
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

/** Boost articles whose URL path matches the query topic. */
function pathBoost(entry: DocEntry, query: string): number {
  const path = pathnameOf(entry.url);
  if (!path) return 0;

  let boost = 0;
  for (const { test, pathIncludes } of TOPIC_PATH_ALIASES) {
    if (test.test(query) && path.includes(pathIncludes)) boost += 0.35;
  }

  // Review + automation recipes live in the Automations guide, not Guest Journey.
  if (
    /\b(review|satisfaction)\b/i.test(query) &&
    /\bautomation/i.test(query) &&
    path.includes('/automations')
  ) {
    boost += 0.25;
  }

  return boost;
}

export function rankDocs(
  index: DocEntry[],
  query: string,
  limit: number,
): Scored<DocEntry>[] {
  const expanded = expandDocsQuery(query);
  const pool = rank(index, expanded, docHaystack, Math.min(index.length, limit * 3));

  return pool
    .map((hit) => ({
      item: hit.item,
      score: Math.min(1, hit.score + pathBoost(hit.item, query)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Suggest ask_doc when a full fetch would burn context on a guide-length page. */
export const LONG_DOC_CHAR_THRESHOLD = 8_000;

export function longDocNote(charCount: number): string | undefined {
  if (charCount <= LONG_DOC_CHAR_THRESHOLD) return undefined;
  return (
    'Long Academy page. Prefer ask_doc with a specific question unless you ' +
    'need the full guide. get_doc returned the entire body.'
  );
}
