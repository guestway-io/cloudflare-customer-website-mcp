/**
 * Resource registration. Resources are readable URIs the model can pull for
 * context, distinct from tools (which it calls). Every resource here is backed
 * by data the marketing site actually publishes as machine-readable text/JSON,
 * so nothing returns invented or HTML-scraped content.
 *
 * Every resource is backed by a published feed: solutions/faq/integrations/
 * industries/testimonials as JSON and legal Privacy/Terms as markdown. The
 * contract-only DPA/MSA expose metadata + canonical link (no body), mirroring
 * the site's sitemap/llms.txt exclusion of those documents.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getApiCatalog,
  getCatalogFeed,
  getDocsIndex,
  getFaqFeed,
  getIndustriesFeed,
  getIntegrationsFeed,
  getLegalFeed,
  getLlmsTxt,
  getSkill,
  getSolutionsFeed,
  getTestimonialsFeed,
  type SkillSlug,
} from '../lib/data';
import { findIntegrationSetupDoc } from '../lib/integration-docs';

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
      description:
        'A single integration by slug. URI must be guestway://integrations/{slug} ' +
        '(e.g. guestway://integrations/nest), not a bare slug. Includes setupDocUrl ' +
        'when an Academy how-to exists.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const feed = await getIntegrationsFeed(env);
      const found = feed.categories
        .flatMap((c) => c.integrations)
        .find((i) => i.slug === slug);
      if (!found) {
        return jsonContents(uri.href, { error: `Unknown integration "${slug}"` });
      }
      const docs = await getDocsIndex(env);
      const setupDoc = findIntegrationSetupDoc(found.slug, found.name, docs);
      return jsonContents(uri.href, {
        ...found,
        setupDocUrl: setupDoc?.url ?? null,
        setupDocTitle: setupDoc?.title ?? null,
      });
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

  // ---- Testimonials --------------------------------------------------------
  server.registerResource(
    'testimonials',
    'guestway://testimonials',
    {
      title: 'Customer testimonials',
      description:
        'Customer quotes shown on the homepage, with author, company, segment ' +
        'and full verbatim quote text.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getTestimonialsFeed(env)),
  );

  // ---- Legal ---------------------------------------------------------------
  server.registerResource(
    'legal',
    'guestway://legal',
    {
      title: 'Legal documents',
      description:
        'Legal documents index. Public Privacy and Terms ship full markdown; ' +
        'contract-only DPA and MSA expose metadata + canonical link only.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri.href, await getLegalFeed(env)),
  );

  server.registerResource(
    'legal-doc',
    new ResourceTemplate('guestway://legal/{slug}', {
      list: async () => {
        const feed = await getLegalFeed(env);
        return {
          resources: feed.documents.map((d) => ({
            uri: `guestway://legal/${d.slug}`,
            name: d.title,
            mimeType: d.markdown ? 'text/markdown' : 'application/json',
          })),
        };
      },
    }),
    {
      title: 'Legal document',
      description:
        'A single legal document by slug (privacy, terms, dpa, msa). Returns ' +
        'full markdown for public docs; a metadata pointer for contract-only ' +
        'docs.',
      mimeType: 'text/markdown',
    },
    async (uri, { slug }) => {
      const feed = await getLegalFeed(env);
      const doc = feed.documents.find((d) => d.slug === slug);
      if (!doc) return jsonContents(uri.href, { error: `Unknown doc "${slug}"` });
      if (doc.markdown) return textContents(uri.href, doc.markdown, 'text/markdown');
      return jsonContents(uri.href, {
        slug: doc.slug,
        title: doc.title,
        url: doc.url,
        effectiveDate: doc.effectiveDate,
        note: 'Contract-only document. Full text is provided on request, not in this feed.',
      });
    },
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
