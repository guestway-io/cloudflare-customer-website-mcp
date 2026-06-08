/**
 * Builds a fully-registered McpServer. Extracted from the Worker entry so both
 * the runtime (McpAgent.init) and the test suite (in-memory client) construct
 * the exact same tool/resource/prompt surface.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFaqTools } from './tools/faq';
import { registerSolutionTools } from './tools/solutions';
import { registerIntegrationTools } from './tools/integrations';
import { registerCompanyTool } from './tools/company';
import { registerTestimonialTool } from './tools/testimonials';
import { registerDocsTool } from './tools/docs';
import { registerChangelogTool } from './tools/changelog';
import { registerRouteTool } from './tools/route';
import { registerResources } from './resources/index';
import { registerPrompts } from './prompts/index';
import { patchResourceReadHandler } from './lib/patch-resource-read';
import { buildServerIcons } from './well-known/icons';

/**
 * Sent to clients in the initialize result. Steers a fresh agent toward the
 * right call order before it has seen any tool, and sets the read-only,
 * marketing-scope expectation so it does not try to mutate or fabricate.
 */
const SERVER_INSTRUCTIONS = `Guestway public MCP: read-only access to Guestway's marketing surface (product modules, FAQs, integrations, industries, testimonials, company info) plus public Academy how-to docs. Guestway is an AI-native operating system for property managers and hospitality teams that sits on top of the PMS.

How to use:
- Pre-sales / "does Guestway do X?": call search_faq first, then get_solution for module depth.
- "Is <system> integrated?": ALWAYS call search_integrations or get_integration; never assert integration status from memory.
- In-app setup ("how do I connect Nest / Mews / a lock"): get_integration (check setupDocUrl) or search_docs, then get_doc or ask_doc on the returned .md URL. Do not use search_faq for step-by-step setup; do not guess docs.guestway.io paths.
- Resources use guestway:// URIs (e.g. guestway://integrations/nest). Bare slugs like "nest" are accepted as a fallback but tools are clearer.
- "What shipped recently" / changelog: get_changelog. Live incidents: route_question → status.guestway.io.
- Pricing: there is no pricing tool by design; route the user to https://guestway.io/pricing or a demo. Never invent prices.
- Status, careers, partnerships, or account-specific support: call route_question (status page, support email, etc.).
- Company / apps / socials: get_company_info. Testimonials: get_testimonials (quote verbatim, do not paraphrase as a quote).

All marketing data is sourced live from guestway.io; Academy articles from docs.guestway.io. Unauthenticated; no customer account data.`;

export function createServer(env: Env, origin = 'https://public-mcp.guestway.io'): McpServer {
  const server = new McpServer(
    {
      name: 'guestway-public-mcp',
      title: 'Guestway Public MCP',
      version: '1.0.0',
      websiteUrl: 'https://guestway.io/mcp',
      icons: buildServerIcons(origin),
    },
    { instructions: SERVER_INSTRUCTIONS },
  );
  registerFaqTools(server, env);
  registerSolutionTools(server, env);
  registerIntegrationTools(server, env);
  registerCompanyTool(server, env);
  registerTestimonialTool(server, env);
  registerDocsTool(server, env);
  registerChangelogTool(server);
  registerRouteTool(server, env);
  registerResources(server, env);
  registerPrompts(server, env);
  patchResourceReadHandler(server);
  return server;
}
