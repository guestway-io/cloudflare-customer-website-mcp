/**
 * Tiny token-overlap scorer. The marketing corpus is small (about 80 FAQs,
 * 57 integrations, 9 solutions), so a dependency-free relevance score over
 * lowercased word tokens is enough; we do not need a full inverted index or a
 * fuzzy-match library on the edge.
 *
 * Scoring favours, in order: exact phrase substring, then the ratio of query
 * tokens that appear in the haystack. Field weighting (e.g. title over body)
 * is the caller's job via `weightedHaystack`.
 */

const WORD = /[a-z0-9]+/g;

function tokenize(s: string): string[] {
  const lower = s.toLowerCase();
  return lower.match(WORD) ?? [];
}

/**
 * Returns a 0..1 relevance score for `query` against `haystack`.
 * 0 means no query token matched. Callers should drop zero-score hits.
 */
export function score(query: string, haystack: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const hayLower = haystack.toLowerCase();

  // Strong signal: the whole query appears verbatim.
  const phraseBonus = hayLower.includes(q) ? 0.5 : 0;

  const qTokens = tokenize(q);
  if (qTokens.length === 0) return phraseBonus;

  const hayTokens = new Set(tokenize(haystack));
  let hits = 0;
  for (const t of qTokens) {
    if (hayTokens.has(t)) hits++;
  }
  const overlap = hits / qTokens.length;

  // Cap at 1.0. Phrase match alone (0.5) + full token overlap (0.5) saturates.
  return Math.min(1, overlap * 0.5 + phraseBonus);
}

/**
 * Builds a single haystack string by repeating higher-weight fields so they
 * contribute more to token overlap. `[["AI Inbox", 3], ["one inbox…", 1]]`
 * makes a title-token worth 3x a body-token.
 */
export function weightedHaystack(fields: [string, number][]): string {
  const parts: string[] = [];
  for (const [text, weight] of fields) {
    for (let i = 0; i < weight; i++) parts.push(text);
  }
  return parts.join(' ');
}

export interface Scored<T> {
  item: T;
  score: number;
}

/**
 * Scores every item, drops zero-score hits, sorts by score desc (stable on the
 * original order for ties), and returns the top `limit`.
 */
export function rank<T>(
  items: T[],
  query: string,
  haystackOf: (item: T) => string,
  limit: number,
): Scored<T>[] {
  const scored = items.map((item, index) => ({
    item,
    score: score(query, haystackOf(item)),
    index,
  }));
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item, score }) => ({ item, score }));
}
