/**
 * MCP Server Card (SEP-1649 / SEP-2127). A static metadata document that lets
 * MCP clients discover and one-click-connect to this server without a full
 * initialize handshake.
 *
 * The path is not yet settled across the ecosystem, so the Worker serves this
 * same card at every known variant:
 *   - /.well-known/mcp-server-card        (ratified SEP-2127)
 *   - /.well-known/mcp/server-card.json   (isitagentready scanner)
 *   - /.well-known/mcp.json               (agent-ready validator)
 *
 * The shape is a superset: it carries both the registry-aligned fields
 * (name, remotes) and the SEP-1649 draft fields (serverInfo, transport,
 * capabilities, authentication) so either reader is satisfied. Primitive
 * lists stay "dynamic" — clients enumerate tools/resources/prompts at runtime.
 */

export const SERVER_CARD_PATHS = [
  '/.well-known/mcp-server-card',
  '/.well-known/mcp/server-card.json',
  '/.well-known/mcp.json',
];

export function buildServerCard(origin: string) {
  const endpoint = `${origin}/mcp`;
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    version: '1.0',
    protocolVersion: '2025-06-18',
    name: 'io.guestway/public-mcp',
    title: 'Guestway Public MCP',
    description:
      "Read-only Model Context Protocol server exposing Guestway's marketing " +
      'surface: product modules, FAQs, integrations, industries, testimonials ' +
      'and company info, sourced live from guestway.io. No authentication required.',
    websiteUrl: 'https://guestway.io/llms.txt',
    documentationUrl: 'https://guestway.io/llms.txt',
    serverInfo: {
      name: 'guestway-public-mcp',
      title: 'Guestway Public MCP',
      version: '1.0.0',
    },
    transport: {
      type: 'streamable-http',
      endpoint,
    },
    remotes: [
      {
        type: 'streamable-http',
        url: endpoint,
        supportedProtocolVersions: ['2025-06-18'],
      },
    ],
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      prompts: { listChanged: false },
    },
    authentication: {
      required: false,
    },
    tools: ['dynamic'],
    resources: ['dynamic'],
    prompts: ['dynamic'],
  };
}
