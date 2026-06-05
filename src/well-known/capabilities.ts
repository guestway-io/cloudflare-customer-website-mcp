/**
 * Capability descriptor served at /.well-known/mcp-capabilities.json. This is
 * the document a DNS-AID-aware agent fetches after following the SVCB record's
 * `cap` pointer: a static, human- and machine-readable inventory of what this
 * MCP exposes and how to connect. Keep it in sync with what init() registers.
 */

export const MCP_ENDPOINT = '/mcp';

export function buildCapabilities(origin: string) {
  return {
    name: 'Guestway Public MCP',
    description:
      'Read-only MCP server exposing Guestway\'s marketing surface: product ' +
      'modules, FAQs, integrations, industries and company info, sourced live ' +
      'from guestway.io. Includes a browser-handoff demo-booking flow.',
    provider: {
      name: 'Guestway BV',
      url: 'https://guestway.io',
    },
    protocol: {
      mcpVersion: '2025-06-18',
      transport: 'streamable-http',
      endpoint: `${origin}${MCP_ENDPOINT}`,
    },
    auth: 'none',
    tools: [
      'search_faq',
      'find_related_faqs',
      'search_solutions',
      'get_solution',
      'search_integrations',
      'get_integration',
      'get_company_info',
      'get_testimonials',
      'route_question',
    ],
    resources: [
      'guestway://overview',
      'guestway://catalog',
      'guestway://api-catalog',
      'guestway://faq',
      'guestway://faq/{slug}',
      'guestway://integrations',
      'guestway://integrations/{slug}',
      'guestway://solutions',
      'guestway://solutions/{slug}',
      'guestway://industries',
      'guestway://industries/{slug}',
      'guestway://testimonials',
      'guestway://pricing',
      'guestway://legal',
      'guestway://legal/{slug}',
      'guestway://skills/{slug}',
    ],
    prompts: ['route-question'],
    docs: 'https://guestway.io/llms.txt',
  };
}
