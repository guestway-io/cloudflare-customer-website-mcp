import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getFaqFeed, getSolutionsFeed } from '../lib/data';
import { rank } from '../lib/search';
import { ok, fail, guard } from '../lib/respond';

export function registerSolutionTools(server: McpServer, env: Env): void {
  server.registerTool(
    'search_solutions',
    {
      title: 'Search Guestway product modules',
      description:
        'List or search Guestway\'s 9 product modules (the "solutions"). ' +
        'Modules split into two categories: guest-journey (AI Inbox, Guest ' +
        'App, Access Management, Multi-calendar, Review Center) and ' +
        'smart-operations (Cleaning Management, Climate Control, Automations, ' +
        'AI Operations Center). Omit the query to list all modules. Returns ' +
        'title, one-line description and the canonical URL for each.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Optional free-text filter, e.g. "messaging" or "locks".'),
        category: z
          .enum(['guest-journey', 'smart-operations'])
          .optional()
          .describe('Restrict to one of the two module categories.'),
      },
    },
    async ({ query, category }) =>
      guard(async () => {
        const feed = await getSolutionsFeed(env);
        let pool = feed.solutions;
        if (category) pool = pool.filter((s) => s.category === category);

        const items = query
          ? rank(
              pool,
              query,
              (s) => `${s.title} ${s.title} ${s.menu.label} ${s.menu.description}`,
              pool.length,
            ).map((h) => h.item)
          : pool;

        return ok({
          query: query ?? null,
          category: category ?? 'all',
          source: feed.source,
          total: items.length,
          solutions: items.map((s) => ({
            slug: s.slug,
            title: s.title,
            category: s.category,
            description: s.menu.description,
            url: s.url,
          })),
        });
      }),
  );

  server.registerTool(
    'get_solution',
    {
      title: 'Get a product module',
      description:
        'Fetch one Guestway product module by slug, with its description, ' +
        'canonical URL, SEO summary, and the FAQs the site shows on that ' +
        "module's page. Use after search_solutions to go deeper. Valid slugs " +
        'are the module slugs, e.g. "ai-inbox", "guest-app", ' +
        '"access-management", "multi-calendar", "review-center", ' +
        '"cleaning-management", "climate-control", "automations", ' +
        '"ai-operations-center".',
      inputSchema: {
        slug: z
          .string()
          .min(2)
          .describe('Module slug, e.g. "ai-inbox".'),
      },
    },
    async ({ slug }) =>
      guard(async () => {
        const [solutions, faqs] = await Promise.all([
          getSolutionsFeed(env),
          getFaqFeed(env),
        ]);
        const solution = solutions.solutions.find((s) => s.slug === slug);
        if (!solution) {
          const known = solutions.solutions.map((s) => s.slug).join(', ');
          return fail(
            `No module with slug "${slug}". Known slugs: ${known}.`,
          );
        }
        const pageSlug = `solutions/${slug}`;
        const relatedFaqs = faqs.categories
          .filter((c) => c.showOn.includes(pageSlug))
          .flatMap((c) =>
            c.items.map((i) => ({ category: c.slug, q: i.q, a: i.a })),
          );
        return ok({
          slug: solution.slug,
          title: solution.title,
          category: solution.category,
          description: solution.menu.description,
          url: solution.url,
          seo: solution.seo,
          faqs: relatedFaqs,
        });
      }),
  );
}
