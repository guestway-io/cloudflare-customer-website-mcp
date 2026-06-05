import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTestimonialsFeed } from '../lib/data';
import { ok, guard } from '../lib/respond';

export function registerTestimonialTool(server: McpServer, env: Env): void {
  server.registerTool(
    'get_testimonials',
    {
      title: 'Get customer testimonials',
      description:
        'Return Guestway customer testimonials (the quotes shown on the ' +
        'homepage), each with the author, company, market segment and full ' +
        'quote text. Use for social proof, "what do customers say", or to ' +
        'cite real named references during a pre-sales conversation. Quotes ' +
        'are customer-approved and verbatim; do not paraphrase as if quoting.',
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Maximum number of testimonials to return.'),
      },
    },
    async ({ limit }) =>
      guard(async () => {
        const feed = await getTestimonialsFeed(env);
        const list = limit
          ? feed.testimonials.slice(0, limit)
          : feed.testimonials;
        return ok({
          source: feed.source,
          total: feed.total,
          returned: list.length,
          testimonials: list,
        });
      }),
  );
}
