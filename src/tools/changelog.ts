import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { processChangelogBody } from '../lib/changelog-text';
import { ok, fail, guard } from '../lib/respond';

/** Pylon knowledge base article linked from resource-routing skill. */
const CHANGELOG_URL =
  'https://guestway-knowledge-base.help.usepylon.com/articles/3167002633-changelog';

const CHANGELOG_TIMEOUT_MS = 15_000;

export function registerChangelogTool(server: McpServer): void {
  server.registerTool(
    'get_changelog',
    {
      title: 'Recent Guestway product changelog',
      annotations: { readOnlyHint: true, openWorldHint: true },
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
          const excerpt = processChangelogBody(raw, months);
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
