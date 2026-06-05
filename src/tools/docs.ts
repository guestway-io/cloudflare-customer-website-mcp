import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  fetchDocMarkdown,
  getDocsIndex,
  resolveDocUrl,
  type DocEntry,
} from '../lib/data';
import { rank } from '../lib/search';
import { fail, ok, guard } from '../lib/respond';

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
function expandDocsQuery(query: string): string {
  let q = query;
  if (/\bnest\b/i.test(q)) q += ' google nest google-nest smart thermostat';
  if (/\bbooking\.?com\b/i.test(q)) q += ' booking.com booking-com ota';
  return q;
}

export function registerDocsTool(server: McpServer, env: Env): void {
  server.registerTool(
    'search_docs',
    {
      title: 'Search the Guestway Academy (how-to docs)',
      description:
        'Search Guestway\'s customer Academy (docs.guestway.io) for how-to and ' +
        'setup articles: connecting a PMS, Nest thermostat, smart locks, ' +
        'automations, billing, user roles, and similar. Use this for ' +
        'existing-customer "how do I connect/configure/set up X" questions. ' +
        'The pre-sales FAQ (search_faq) does not contain in-app setup steps. ' +
        'Returns matching articles with title, a .md URL, and description. ' +
        'Call get_doc with that URL to return the full article text without ' +
        'guessing Academy paths.',
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe(
            'What the user is trying to do, e.g. "connect Nest thermostat" or "Mews PMS".',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(8)
          .describe('Maximum number of articles to return (1-20, default 8).'),
      },
    },
    async ({ query, limit }) =>
      guard(async () => {
        const index = await getDocsIndex(env);
        const hits = rank(index, expandDocsQuery(query), docHaystack, limit);
        return ok({
          query,
          source: `${env.DOCS_URL.replace(/\/+$/, '')}/llms.txt`,
          totalIndexed: index.length,
          resultCount: hits.length,
          results: hits.map((h) => ({
            title: h.item.title,
            url: h.item.url,
            description: h.item.description,
            relevance: Number(h.score.toFixed(3)),
          })),
          note:
            hits.length > 0
              ? 'Call get_doc with the top result\'s url to read setup steps. ' +
                'For account-specific issues docs do not resolve, contact info@guestway.io.'
              : 'No Academy article matched. Try a shorter query (brand name only) ' +
                'or call route_question if the topic is support/status/careers.',
        });
      }),
  );

  server.registerTool(
    'get_doc',
    {
      title: 'Fetch one Guestway Academy article',
      description:
        'Return the full markdown body of one Academy article. Pass either a ' +
        'complete .md URL from search_docs (recommended) or a path such as ' +
        '"integrations/smart-thermostats/google-nest". Use this instead of ' +
        'guessing docs.guestway.io URLs or calling GitBook ?ask= (which may time out).',
      inputSchema: {
        url: z
          .string()
          .min(4)
          .describe(
            'Full https://docs.guestway.io/.../page.md URL from search_docs, ' +
              'or a site-relative path without the origin.',
          ),
      },
    },
    async ({ url }) =>
      guard(async () => {
        try {
          const resolved = resolveDocUrl(env, url);
          const { url: fetchedUrl, markdown } = await fetchDocMarkdown(
            env,
            resolved,
          );
          return ok({
            url: fetchedUrl,
            markdown,
            charCount: markdown.length,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (e instanceof Error && e.name === 'AbortError') {
            return fail(
              'Academy article fetch timed out. Retry get_doc; if it persists, ' +
                'open the URL in a browser or contact info@guestway.io.',
            );
          }
          return fail(msg);
        }
      }),
  );
}
