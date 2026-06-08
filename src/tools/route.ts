import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSkill } from '../lib/data';
import { ok, guard } from '../lib/respond';

/**
 * Surfaces the canonical resource-routing decision table (the same SKILL.md
 * the site publishes at /.well-known/agent-skills/resource-routing) so an
 * agent can decide WHERE a question belongs: marketing site, Academy docs,
 * status page, changelog, careers, referral program, mobile apps, or support.
 *
 * We return the skill verbatim rather than re-implementing the table here, so
 * the marketing site stays the single source of truth and edits there
 * propagate without a Worker deploy.
 */
export function registerRouteTool(server: McpServer, env: Env): void {
  server.registerTool(
    'route_question',
    {
      title: 'Route a question to the right Guestway resource',
      description:
        'Given a user question, returns the canonical decision table for ' +
        'choosing the correct Guestway destination (marketing site, customer ' +
        'Academy at docs.guestway.io, status page, changelog, careers, ' +
        'referral program, mobile apps, or support email). Call this when you ' +
        'are unsure which surface should answer a question, especially for ' +
        'support, docs, careers, partnerships or status queries that the ' +
        'marketing data tools do not cover.',
      inputSchema: {
        question: z
          .string()
          .min(2)
          .describe('The user question to route.'),
      },
    },
    async ({ question }) =>
      guard(async () => {
        const table = await getSkill(env, 'resource-routing');
        const payload: Record<string, unknown> = {
          question,
          routingGuide: table,
          note:
            'Match the question shape to a row in routingGuide, then use the ' +
            'matching tool or destination URL.',
        };
        if (
          /changelog|shipped recently|what(?:'s| is) new|latest (?:feature|update)/i.test(
            question,
          )
        ) {
          payload.suggestedTool = 'get_changelog';
        }
        if (/status|down|degraded|outage|incident/i.test(question)) {
          payload.suggestedUrl = 'https://status.guestway.io/';
        }
        return ok(payload);
      }),
  );
}
