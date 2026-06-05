/**
 * Data layer. The Worker holds no marketing facts of its own; it fetches the
 * JSON feeds and plain-text resources the marketing site already publishes,
 * and caches them at the edge via the Cache API. A site deploy therefore
 * propagates to the MCP within `EDGE_TTL_SECONDS` with no Worker redeploy.
 *
 * Every loader is keyed off `env.SITE_URL` so tests can point at a mock origin
 * and prod points at https://guestway.io.
 */

import type {
  CatalogFeed,
  FaqFeed,
  IndustriesFeed,
  IntegrationsFeed,
  LegalFeed,
  SolutionsFeed,
  TestimonialsFeed,
} from '../types/feeds';

/** How long a fetched feed/text stays warm in the edge cache. */
const EDGE_TTL_SECONDS = 300;

/** Guard against a hung origin holding an MCP tool call open. */
const ORIGIN_TIMEOUT_MS = 5000;

/** Academy pages can be slower than JSON feeds; allow a bit more headroom. */
const DOCS_BODY_TIMEOUT_MS = 12_000;

export class UpstreamError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
  ) {
    super(`Upstream ${url} responded ${status}`);
    this.name = 'UpstreamError';
  }
}

/**
 * Fetch a URL through the Cloudflare edge cache. `cacheTtl` + `cacheEverything`
 * make Workers cache the response regardless of the origin's own headers, so
 * the marketing site's short `Cache-Control` doesn't force a miss on every
 * tool call.
 */
async function cachedFetch(
  url: string,
  timeoutMs = ORIGIN_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cf: {
        cacheTtl: EDGE_TTL_SECONDS,
        cacheEverything: true,
      },
      headers: { accept: 'application/json, text/plain;q=0.9, */*;q=0.1' },
    });
    if (!res.ok) throw new UpstreamError(url, res.status);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await cachedFetch(url);
  return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const res = await cachedFetch(url);
  return await res.text();
}

/** Normalises a configured SITE_URL into a clean origin with no trailing slash. */
function origin(env: Env): string {
  return env.SITE_URL.replace(/\/+$/, '');
}

export function getFaqFeed(env: Env): Promise<FaqFeed> {
  return fetchJson<FaqFeed>(`${origin(env)}/data/faq.json`);
}

export function getIntegrationsFeed(env: Env): Promise<IntegrationsFeed> {
  return fetchJson<IntegrationsFeed>(`${origin(env)}/data/integrations.json`);
}

export function getSolutionsFeed(env: Env): Promise<SolutionsFeed> {
  return fetchJson<SolutionsFeed>(`${origin(env)}/data/solutions.json`);
}

export function getIndustriesFeed(env: Env): Promise<IndustriesFeed> {
  return fetchJson<IndustriesFeed>(`${origin(env)}/data/industries.json`);
}

export function getCatalogFeed(env: Env): Promise<CatalogFeed> {
  return fetchJson<CatalogFeed>(`${origin(env)}/data/catalog.json`);
}

export function getTestimonialsFeed(env: Env): Promise<TestimonialsFeed> {
  return fetchJson<TestimonialsFeed>(`${origin(env)}/data/testimonials.json`);
}

export function getLegalFeed(env: Env): Promise<LegalFeed> {
  return fetchJson<LegalFeed>(`${origin(env)}/data/legal.json`);
}

export function getLlmsTxt(env: Env): Promise<string> {
  return fetchText(`${origin(env)}/llms.txt`);
}

export function getApiCatalog(env: Env): Promise<string> {
  return fetchText(`${origin(env)}/.well-known/api-catalog`);
}

/** One of the four published agent skills. */
export type SkillSlug =
  | 'guestway-overview'
  | 'resource-routing'
  | 'sales-faq'
  | 'book-demo';

export function getSkill(env: Env, slug: SkillSlug): Promise<string> {
  return fetchText(
    `${origin(env)}/.well-known/agent-skills/${slug}/SKILL.md`,
  );
}

export interface DocEntry {
  title: string;
  url: string;
  description: string;
}

/**
 * Parse the GitBook Academy `llms.txt`, a markdown list of
 * `- [Title](https://docs.guestway.io/path.md): optional description` lines,
 * into a flat doc index. Lines without a markdown link are skipped (headings,
 * blanks). The `.md` URL is the clean-text twin an agent should fetch for the
 * full article body.
 */
export async function getDocsIndex(env: Env): Promise<DocEntry[]> {
  const docsOrigin = env.DOCS_URL.replace(/\/+$/, '');
  const text = await fetchText(`${docsOrigin}/llms.txt`);
  return parseDocsLlmsTxt(text);
}

/** Parse a GitBook `llms.txt` index into doc entries (shared by loader + tests). */
export function parseDocsLlmsTxt(text: string): DocEntry[] {
  const entries: DocEntry[] = [];
  const line = /^- \[([^\]]+)\]\((https?:\/\/[^)]+)\)(?::\s*(.*))?$/;
  for (const raw of text.split('\n')) {
    const m = raw.match(line);
    if (!m) continue;
    entries.push({
      title: m[1].trim(),
      url: m[2].trim(),
      description: (m[3] ?? '').trim(),
    });
  }
  return entries;
}

/** Normalise a user-supplied Academy path or URL into a fetchable `.md` URL. */
export function resolveDocUrl(env: Env, urlOrPath: string): string {
  const docsOrigin = env.DOCS_URL.replace(/\/+$/, '');
  const raw = urlOrPath.trim();
  if (/^https?:\/\//i.test(raw)) {
    const parsed = new URL(raw);
    if (!parsed.href.startsWith(`${docsOrigin}/`)) {
      throw new Error(
        `Doc URL must be on ${docsOrigin} (got ${parsed.origin}).`,
      );
    }
    if (!parsed.pathname.endsWith('.md')) {
      parsed.pathname = parsed.pathname.replace(/\/?$/, '') + '.md';
    }
    return parsed.href;
  }
  const path = raw.replace(/^\/+/, '').replace(/\.md$/, '');
  return `${docsOrigin}/${path}.md`;
}

/** Fetch one Academy article as markdown (clean-text `.md` twin). */
export async function fetchDocMarkdown(
  env: Env,
  urlOrPath: string,
): Promise<{ url: string; markdown: string }> {
  const url = resolveDocUrl(env, urlOrPath);
  const res = await cachedFetch(url, DOCS_BODY_TIMEOUT_MS);
  const markdown = await res.text();
  return { url, markdown };
}
