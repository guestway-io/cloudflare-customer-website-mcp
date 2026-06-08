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
  if (/\b(review|satisfaction|nps)\b/i.test(q)) {
    q += ' automations satisfaction score review request guest journey';
  }
  if (/\bautomation/i.test(q)) q += ' automations guest message schedule condition';
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

  server.registerTool(
    'ask_doc',
    {
      title: 'Ask a question against one Academy article',
      description:
        'Query a single Guestway Academy page with a natural-language question. ' +
        'Uses the GitBook ?ask= endpoint on the article .md URL. Prefer this ' +
        'when get_doc returned a long page but you need one specific answer ' +
        '(e.g. "automation review request only if satisfied"). Pass the same ' +
        '.md URL from search_docs or setupDocUrl.',
      inputSchema: {
        url: z
          .string()
          .min(4)
          .describe(
            'Academy .md URL or site-relative path (same as get_doc).',
          ),
        question: z
          .string()
          .min(4)
          .describe('Specific question to answer from that page.'),
      },
    },
    async ({ url, question }) =>
      guard(async () => {
        try {
          const resolved = resolveDocUrl(env, url);
          const askUrl = `${resolved}?ask=${encodeURIComponent(question)}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20_000);
          try {
            const res = await fetch(askUrl, {
              signal: controller.signal,
              headers: { accept: 'text/markdown, text/plain;q=0.9' },
            });
            if (!res.ok) {
              return fail(
                `Academy ask failed (${res.status}) for ${resolved}. ` +
                  'Try get_doc on the full article instead.',
              );
            }
            const answer = await res.text();
            return ok({
              url: resolved,
              question,
              answer,
              note:
                'Sourced via Academy ?ask=. For the full article body, call get_doc.',
            });
          } finally {
            clearTimeout(timeout);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (e instanceof Error && e.name === 'AbortError') {
            return fail(
              'Academy ask timed out. Retry ask_doc or use get_doc on the full page.',
            );
          }
          return fail(msg);
        }
      }),
  );
}
