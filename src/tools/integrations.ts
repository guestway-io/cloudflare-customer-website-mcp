import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getDocsIndex, getIntegrationsFeed } from '../lib/data';
import { findIntegrationSetupDoc } from '../lib/integration-docs';
import { resolveIntegrationSlug } from '../lib/integration-slugs';
import { rank } from '../lib/search';
import { ok, fail, guard } from '../lib/respond';
import type { Integration } from '../types/feeds';

function flatten(
  feed: Awaited<ReturnType<typeof getIntegrationsFeed>>,
): (Integration & { categoryLabel: string })[] {
  return feed.categories.flatMap((c) =>
    c.integrations.map((i) => ({ ...i, categoryLabel: c.label })),
  );
}

async function setupDocFields(
  env: Env,
  slug: string,
  name: string,
): Promise<{ setupDocUrl: string | null; setupDocTitle: string | null }> {
  const docs = await getDocsIndex(env);
  const doc = findIntegrationSetupDoc(slug, name, docs);
  return {
    setupDocUrl: doc?.url ?? null,
    setupDocTitle: doc?.title ?? null,
  };
}

export function registerIntegrationTools(server: McpServer, env: Env): void {
  server.registerTool(
    'search_integrations',
    {
      title: 'Search Guestway integrations',
      description:
        'Search or filter the 57 systems Guestway connects to, across PMS, ' +
        'OTA/channel, guest communication, smart climate and smart locks. ' +
        'Each result carries a status: "live" (in production), "early" (early ' +
        'access) or "soon" (on the roadmap). ALWAYS use this tool to answer ' +
        '"is X integrated?"; never assert integration status from memory, it ' +
        'changes. Omit query/filters to list everything.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Brand or keyword, e.g. "booking.com", "salto", "mews".'),
        status: z
          .enum(['live', 'early', 'soon'])
          .optional()
          .describe('Filter by connection status.'),
        category: z
          .enum(['pms', 'ota', 'communication', 'climate', 'locks'])
          .optional()
          .describe('Filter by integration category.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(60)
          .describe('Max results (default 60, i.e. all).'),
      },
    },
    async ({ query, status, category, limit }) =>
      guard(async () => {
        const feed = await getIntegrationsFeed(env);
        let pool = flatten(feed);
        if (status) pool = pool.filter((i) => i.status === status);
        if (category) pool = pool.filter((i) => i.category === category);

        const items = query
          ? rank(pool, query, (i) => `${i.name} ${i.name} ${i.description}`, limit).map(
              (h) => h.item,
            )
          : pool.slice(0, limit);

        return ok({
          query: query ?? null,
          status: status ?? 'any',
          category: category ?? 'all',
          source: feed.source,
          totals: {
            all: feed.total,
            live: feed.liveCount,
            early: feed.earlyCount,
            soon: feed.soonCount,
          },
          resultCount: items.length,
          integrations: await Promise.all(
            items.map(async (i) => ({
              slug: i.slug,
              name: i.name,
              category: i.category,
              categoryLabel: i.categoryLabel,
              status: i.status,
              variant: i.variant,
              description: i.description,
              ...(await setupDocFields(env, i.slug, i.name)),
            })),
          ),
        });
      }),
  );

  server.registerTool(
    'get_integration',
    {
      title: 'Get one integration',
      description:
        'Fetch a single integration by its slug (e.g. "booking-com", ' +
        '"mews", "nest"), returning category, status, description, and ' +
        'setupDocUrl when an Academy how-to exists. For setup steps call ' +
        'get_doc(setupDocUrl). Use search_integrations first if you do not ' +
        'know the exact slug.',
      inputSchema: {
        slug: z
          .string()
          .min(2)
          .describe('Integration slug, e.g. "booking-com".'),
      },
    },
    async ({ slug }) =>
      guard(async () => {
        const feed = await getIntegrationsFeed(env);
        const all = flatten(feed);
        const canonical = resolveIntegrationSlug(slug);
        const found = all.find((i) => i.slug === canonical);
        if (!found) {
          const hint =
            canonical !== slug
              ? ` (resolved from "${slug}")`
              : '';
          return fail(
            `No integration with slug "${canonical}"${hint}. Use ` +
              `search_integrations to find the correct slug (there are ` +
              `${feed.total} systems). Marketing slug for Google Nest is ` +
              `"nest", not "google-nest".`,
          );
        }
        const setup = await setupDocFields(env, found.slug, found.name);
        return ok({
          slug: found.slug,
          ...(canonical !== slug ? { resolvedFrom: slug } : {}),
          name: found.name,
          category: found.category,
          categoryLabel: found.categoryLabel,
          status: found.status,
          variant: found.variant,
          description: found.description,
          source: feed.source,
          ...setup,
          ...(setup.setupDocUrl
            ? {
                setupNote:
                  'Call get_doc with setupDocUrl for step-by-step connection ' +
                  'instructions from the Academy.',
              }
            : {}),
        });
      }),
  );
}
