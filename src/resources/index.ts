/**
 * Resource registration. Resources are readable URIs the model can pull for
 * context, distinct from tools (which it calls). Every resource here is backed
 * by data the marketing site actually publishes as machine-readable text/JSON,
 * so nothing returns invented or HTML-scraped content.
 *
 * Not yet exposed (needs a site-side feed first; tracked as follow-up):
 *   - guestway://testimonials  — quotes live inside solutions YAML, not in the
 *     slim /data/solutions.json projection.
 *   - full legal text          — /privacy etc. render HTML only; no .md/.json
 *     endpoint exists yet, so guestway://legal returns canonical pointers.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getApiCatalog,
  getCatalogFeed,
  getFaqFeed,
  getIndustriesFeed,
  getIntegrationsFeed,
  getLlmsTxt,
  getSkill,
  getSolutionsFeed,
  type SkillSlug,
} from '../lib/data';

const SKILL_SLUGS: SkillSlug[] = [
  'guestway-overview',
  'resource-routing',
  'sales-faq',
  'book-demo',
];

function jsonContents(uri: string, data: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function textContents(
  uri: string,
  text: string,
  mimeType = 'text/plain',
): ReadResourceResult {
  return { contents: [{ uri, mimeType, text }] };
}

export function registerResources(server: McpServer, env: Env): void {
  // ---- Site-wide overviews -------------------------------------------------
  server.registerResource(
    'overview',
    'guestway://overview',
    {
      title: 'Guestway site overview (llms.txt)',
      description:
        'Plain-text LLM summary of the whole site: what Guestway is, modules, ' +
        'pricing shape, sales funnel, top objections, FAQ index and links.',
      mimeType: 'text/plain',
    },
    async (uri) => textContents(uri.href, await getLlmsTxt(env)),
  );

  server.registerResource(
    'catalog',
    'guestway://catalog',
    {
      title: 'Machine-readable resource catalog',
      description:
        'JSON index of every data feed, major page, external resource, mobile ' +
        'app and social profile.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getCatalogFeed(env)),
  );

  server.registerResource(
    'api-catalog',
    'guestway://api-catalog',
    {
      title: 'RFC 9727 API catalog (linkset)',
      description:
        'The site\'s /.well-known/api-catalog linkset advertising discovery ' +
        'endpoints to agents.',
      mimeType: 'application/linkset+json',
    },
    async (uri) =>
      textContents(uri.href, await getApiCatalog(env), 'application/linkset+json'),
  );

  // ---- FAQ -----------------------------------------------------------------
  server.registerResource(
    'faq',
    'guestway://faq',
    {
      title: 'All FAQs',
      description: 'Every Q&A grouped by category (about 80 across 14 categories).',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getFaqFeed(env)),
  );

  server.registerResource(
    'faq-category',
    new ResourceTemplate('guestway://faq/{slug}', {
      list: async () => {
        const feed = await getFaqFeed(env);
        return {
          resources: feed.categories.map((c) => ({
            uri: `guestway://faq/${c.slug}`,
            name: c.title,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: 'FAQ category',
      description: 'A single FAQ category by slug, e.g. guestway://faq/pricing.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const feed = await getFaqFeed(env);
      const cat = feed.categories.find((c) => c.slug === slug);
      return jsonContents(uri.href, cat ?? { error: `Unknown category "${slug}"` });
    },
  );

  // ---- Integrations --------------------------------------------------------
  server.registerResource(
    'integrations',
    'guestway://integrations',
    {
      title: 'All integrations',
      description:
        'The 57 systems Guestway connects to, grouped by category with status.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getIntegrationsFeed(env)),
  );

  server.registerResource(
    'integration',
    new ResourceTemplate('guestway://integrations/{slug}', {
      list: async () => {
        const feed = await getIntegrationsFeed(env);
        return {
          resources: feed.categories.flatMap((c) =>
            c.integrations.map((i) => ({
              uri: `guestway://integrations/${i.slug}`,
              name: i.name,
              mimeType: 'application/json',
            })),
          ),
        };
      },
    }),
    {
      title: 'Integration',
      description: 'A single integration by slug, e.g. guestway://integrations/mews.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const feed = await getIntegrationsFeed(env);
      const found = feed.categories
        .flatMap((c) => c.integrations)
        .find((i) => i.slug === slug);
      return jsonContents(uri.href, found ?? { error: `Unknown integration "${slug}"` });
    },
  );

  // ---- Solutions -----------------------------------------------------------
  server.registerResource(
    'solutions',
    'guestway://solutions',
    {
      title: 'All product modules',
      description: 'The 9 product modules with description, category and URL.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getSolutionsFeed(env)),
  );

  server.registerResource(
    'solution',
    new ResourceTemplate('guestway://solutions/{slug}', {
      list: async () => {
        const feed = await getSolutionsFeed(env);
        return {
          resources: feed.solutions.map((s) => ({
            uri: `guestway://solutions/${s.slug}`,
            name: s.title,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: 'Product module',
      description: 'A single module by slug, e.g. guestway://solutions/ai-inbox.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const feed = await getSolutionsFeed(env);
      const found = feed.solutions.find((s) => s.slug === slug);
      return jsonContents(uri.href, found ?? { error: `Unknown module "${slug}"` });
    },
  );

  // ---- Industries ----------------------------------------------------------
  server.registerResource(
    'industries',
    'guestway://industries',
    {
      title: 'All industries',
      description: 'The 4 segments Guestway sells into, with positioning bullets.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getIndustriesFeed(env)),
  );

  server.registerResource(
    'industry',
    new ResourceTemplate('guestway://industries/{slug}', {
      list: async () => {
        const feed = await getIndustriesFeed(env);
        return {
          resources: feed.industries.map((i) => ({
            uri: `guestway://industries/${i.slug}`,
            name: i.label,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: 'Industry segment',
      description:
        'A single segment by slug, e.g. guestway://industries/aparthotels.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const feed = await getIndustriesFeed(env);
      const found = feed.industries.find((i) => i.slug === slug);
      return jsonContents(uri.href, found ?? { error: `Unknown industry "${slug}"` });
    },
  );

  // ---- Pricing (FAQ-backed; no standalone pricing feed exists yet) ---------
  server.registerResource(
    'pricing',
    'guestway://pricing',
    {
      title: 'Pricing FAQs and canonical page',
      description:
        'Pricing is not machine-published as its own feed. This returns the ' +
        'pricing-category FAQs plus the canonical /pricing URL. For exact ' +
        'quotes, direct the user to a demo; do not invent numbers.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const feed = await getFaqFeed(env);
      const pricing = feed.categories.find((c) => c.slug === 'pricing');
      return jsonContents(uri.href, {
        canonicalUrl: 'https://guestway.io/pricing',
        note:
          'Volume-based per-listing tiers for STR; hotels and 200+ unit ' +
          'portfolios are quote-only. Always route exact pricing to a demo.',
        faqs: pricing?.items ?? [],
      });
    },
  );

  // ---- Legal (pointers; HTML-only pages, no machine-readable text yet) -----
  server.registerResource(
    'legal',
    'guestway://legal',
    {
      title: 'Legal documents (canonical links)',
      description:
        'Canonical URLs for Guestway\'s legal documents. Full text renders as ' +
        'HTML on the site; there is no markdown/JSON endpoint to inline here.',
      mimeType: 'application/json',
    },
    async (uri) =>
      jsonContents(uri.href, {
        documents: [
          { name: 'Privacy Policy', url: 'https://guestway.io/privacy' },
          { name: 'Terms of Service', url: 'https://guestway.io/terms' },
          {
            name: 'Data Processing Agreement',
            url: 'https://guestway.io/contract-terms/dpa',
          },
          {
            name: 'Master Service Agreement',
            url: 'https://guestway.io/contract-terms/msa',
          },
        ],
      }),
  );

  // ---- Agent skills --------------------------------------------------------
  server.registerResource(
    'skill',
    new ResourceTemplate('guestway://skills/{slug}', {
      list: async () => ({
        resources: SKILL_SLUGS.map((slug) => ({
          uri: `guestway://skills/${slug}`,
          name: slug,
          mimeType: 'text/markdown',
        })),
      }),
    }),
    {
      title: 'Agent skill',
      description:
        'One of the published agent skills as markdown: guestway-overview, ' +
        'resource-routing, sales-faq, book-demo.',
      mimeType: 'text/markdown',
    },
    async (uri, { slug }) => {
      if (!SKILL_SLUGS.includes(slug as SkillSlug)) {
        return jsonContents(uri.href, { error: `Unknown skill "${slug}"` });
      }
      return textContents(
        uri.href,
        await getSkill(env, slug as SkillSlug),
        'text/markdown',
      );
    },
  );
}
