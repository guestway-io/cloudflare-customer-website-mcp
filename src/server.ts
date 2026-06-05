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
import { registerRouteTool } from './tools/route';
import { registerResources } from './resources/index';
import { registerPrompts } from './prompts/index';

export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: 'guestway-public-mcp',
    version: '1.0.0',
  });
  registerFaqTools(server, env);
  registerSolutionTools(server, env);
  registerIntegrationTools(server, env);
  registerCompanyTool(server, env);
  registerTestimonialTool(server, env);
  registerRouteTool(server, env);
  registerResources(server, env);
  registerPrompts(server, env);
  return server;
}
