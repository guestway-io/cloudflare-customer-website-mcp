import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getFaqFeed } from '../lib/data';
import { rank } from '../lib/search';
import { ok, guard } from '../lib/respond';
import type { FaqCategory } from '../types/feeds';

/** The 14 FAQ category slugs, for the `category` enum on search_faq. */
const FAQ_CATEGORIES = [
  'general',
  'pricing',
  'demo-and-onboarding',
  'integrations',
  'ai-inbox',
  'guest-app',
  'access-management',
  'cleaning-management',
  'climate-control',
  'multi-calendar',
  'review-center',
  'automations',
  'ai-operations-center',
  'referral-program',
] as const;

interface FlatFaq {
  category: string;
  categoryTitle: string;
  q: string;
  a: string;
}

function flatten(categories: FaqCategory[]): FlatFaq[] {
  const out: FlatFaq[] = [];
  for (const c of categories) {
    for (const item of c.items) {
      out.push({
        category: c.slug,
        categoryTitle: c.title,
        q: item.q,
        a: item.a,
      });
    }
  }
  return out;
}

export function registerFaqTools(server: McpServer, env: Env): void {
  server.registerTool(
    'search_faq',
    {
      title: 'Search Guestway FAQs',
      description:
        'Full-text search across every Guestway FAQ (about 80 Q&As in 14 ' +
        'categories: general, pricing, demo-and-onboarding, integrations, and ' +
        'one per product module). Use this first for any "does Guestway do X", ' +
        '"how does Y work", or pre-sales objection question. Returns the most ' +
        'relevant question/answer pairs with their category. Do not answer ' +
        'pre-sales questions from memory; cite these answers.',
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe('Free-text search query, e.g. "two-way calendar sync".'),
        category: z
          .enum(FAQ_CATEGORIES)
          .optional()
          .describe('Restrict the search to a single FAQ category.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(8)
          .describe('Maximum number of Q&As to return (1-20, default 8).'),
      },
    },
    async ({ query, category, limit }) =>
      guard(async () => {
        const feed = await getFaqFeed(env);
        const pool = flatten(
          category
            ? feed.categories.filter((c) => c.slug === category)
            : feed.categories,
        );
        const hits = rank(pool, query, (f) => `${f.q} ${f.q} ${f.a}`, limit);
        return ok({
          query,
          category: category ?? 'all',
          source: feed.source,
          resultCount: hits.length,
          results: hits.map((h) => ({
            category: h.item.category,
            categoryTitle: h.item.categoryTitle,
            question: h.item.q,
            answer: h.item.a,
            relevance: Number(h.score.toFixed(3)),
          })),
        });
      }),
  );

  server.registerTool(
    'find_related_faqs',
    {
      title: 'Find FAQs shown on a page',
      description:
        'Return every FAQ that the marketing site surfaces on a given page, ' +
        'by the page slug. Useful to mirror exactly what a human sees in the ' +
        'accordion on that page. Valid slugs include "pricing", ' +
        '"integrations", "book-a-demo", "referral-program", and ' +
        '"solutions/<module>" (e.g. "solutions/ai-inbox").',
      inputSchema: {
        slug: z
          .string()
          .min(2)
          .describe(
            'Page slug whose FAQ accordion to return, e.g. "pricing" or ' +
              '"solutions/ai-inbox".',
          ),
      },
    },
    async ({ slug }) =>
      guard(async () => {
        const feed = await getFaqFeed(env);
        const matching = feed.categories.filter((c) =>
          c.showOn.includes(slug),
        );
        return ok({
          slug,
          source: feed.source,
          categoryCount: matching.length,
          questionCount: matching.reduce((n, c) => n + c.items.length, 0),
          categories: matching.map((c) => ({
            category: c.slug,
            title: c.title,
            items: c.items,
          })),
        });
      }),
  );
}
