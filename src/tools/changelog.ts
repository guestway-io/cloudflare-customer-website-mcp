import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ok, fail, guard } from '../lib/respond';

/** Pylon knowledge base article linked from resource-routing skill. */
const CHANGELOG_URL =
  'https://guestway-knowledge-base.help.usepylon.com/articles/3167002633-changelog';

const CHANGELOG_TIMEOUT_MS = 15_000;

/** Strip HTML to plain text for agent consumption. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Keep the most recent N month sections from the changelog body. */
function excerptRecentMonths(text: string, months: number): string {
  const monthHeader = /(?:^|\n)(?:##\s+🗓\s*)?([A-Z][a-z]+ 20\d{2})/gm;
  const indices: number[] = [];
  for (const match of text.matchAll(monthHeader)) {
    if (match.index !== undefined) indices.push(match.index);
  }
  if (indices.length <= months) return text;
  const cut = indices[months] ?? text.length;
  return text.slice(0, cut).trim();
}

export function registerChangelogTool(server: McpServer): void {
  server.registerTool(
    'get_changelog',
    {
      title: 'Recent Guestway product changelog',
      description:
        'Returns recent Guestway product releases from the public changelog ' +
        '(new features, improvements, bug fixes). Use for "what shipped ' +
        'recently", "latest updates", or monthly release notes. Not the same ' +
        'as status.guestway.io (incidents).',
      inputSchema: {
        months: z
          .number()
          .int()
          .min(1)
          .max(6)
          .default(2)
          .describe(
            'How many most-recent monthly sections to include (1-6, default 2).',
          ),
      },
    },
    async ({ months }) =>
      guard(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CHANGELOG_TIMEOUT_MS);
        try {
          const res = await fetch(CHANGELOG_URL, {
            signal: controller.signal,
            headers: { accept: 'text/html, text/plain;q=0.9' },
          });
          if (!res.ok) {
            return fail(
              `Changelog fetch failed (${res.status}). Open ${CHANGELOG_URL} directly.`,
            );
          }
          const raw = await res.text();
          const text = raw.includes('<html') ? htmlToText(raw) : raw;
          const excerpt = excerptRecentMonths(text, months);
          return ok({
            source: CHANGELOG_URL,
            monthsIncluded: months,
            excerpt,
            note:
              'Full history at the source URL. For outages use route_question ' +
              '→ status.guestway.io.',
          });
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') {
            return fail(
              `Changelog fetch timed out. Open ${CHANGELOG_URL} directly.`,
            );
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }
      }),
  );
}
