/**
 * Prompt registration. Prompts are user-invokable templates a client can
 * surface (e.g. a slash-command). V1 ships one: route-question, which seeds the
 * conversation with the canonical resource-routing skill so the model picks the
 * right Guestway surface for a question.
 *
 * Remaining prompts (assess-fit, objection-handle, compare-to-pms-stack) land
 * in V2 alongside the demo-booking tools.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { getSkill } from '../lib/data';

export function registerPrompts(server: McpServer, env: Env): void {
  server.registerPrompt(
    'route-question',
    {
      title: 'Route a Guestway question',
      description:
        'Seeds the model with the canonical resource-routing decision table ' +
        'so it sends a question to the correct Guestway surface (marketing ' +
        'site, Academy docs, status, changelog, careers, referrals, mobile ' +
        'apps, or support).',
      argsSchema: {
        question: z
          .string()
          .min(2)
          .describe('The question to route.'),
      },
    },
    async ({ question }): Promise<GetPromptResult> => {
      const table = await getSkill(env, 'resource-routing');
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                `Use this Guestway resource-routing guide to decide where the ` +
                `question belongs, then either call the matching MCP tool or ` +
                `give the destination URL.\n\n` +
                `--- ROUTING GUIDE ---\n${table}\n--- END GUIDE ---\n\n` +
                `Question: ${question}`,
            },
          },
        ],
      };
    },
  );
}
