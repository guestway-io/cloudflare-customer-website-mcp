/**
 * Guestway Public MCP — Cloudflare Worker entry point.
 *
 * Exposes Guestway's marketing surface to AI agents over the Model Context
 * Protocol (Streamable HTTP). All content is fetched live from guestway.io's
 * published feeds and cached at the edge, so the marketing site stays the
 * single source of truth and a site deploy propagates without redeploying this
 * Worker.
 *
 * Routes:
 *   /mcp                               → MCP endpoint (Streamable HTTP)
 *   /.well-known/mcp-capabilities.json → capability descriptor (DNS-AID target)
 *   /icon.svg, /icon-{48,96,128}.png   → brand icons for MCP clients (SEP-973)
 *   /                                  → human-readable info page
 */

import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from './server';
import { buildCapabilities, MCP_ENDPOINT } from './well-known/capabilities';
import { ICON_ASSET_PATHS } from './well-known/icons';
import { buildServerCard, SERVER_CARD_PATHS } from './well-known/server-card';

export class GuestwayMCP extends McpAgent<Env> {
  // Real server is built in init() once env is available; this placeholder
  // satisfies the abstract `server` field before initialisation runs.
  server = new McpServer({ name: 'guestway-public-mcp', version: '1.0.0' });

  async init(): Promise<void> {
    this.server = createServer(this.env);
  }
}

const mcpHandler = GuestwayMCP.serve(MCP_ENDPOINT);

const INFO_PAGE = `Guestway Public MCP
====================

This is a Model Context Protocol server. Point an MCP client at:

  POST ${MCP_ENDPOINT}   (Streamable HTTP transport)

Capability descriptor:
  /.well-known/mcp-capabilities.json

It exposes Guestway's product modules, FAQs, integrations, industries and
company info, sourced live from https://guestway.io. Read-only, no auth.

Docs: https://guestway.io/llms.txt
`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === MCP_ENDPOINT || url.pathname.startsWith(`${MCP_ENDPOINT}/`)) {
      return mcpHandler.fetch(request, env, ctx);
    }

    if (url.pathname === '/.well-known/mcp-capabilities.json') {
      return Response.json(buildCapabilities(url.origin), {
        headers: { 'cache-control': 'public, max-age=3600' },
      });
    }

    // MCP Server Card (SEP-1649/2127). Served at every known path variant with
    // a permissive CORS header so browser-based MCP clients can fetch it.
    if (SERVER_CARD_PATHS.includes(url.pathname)) {
      return Response.json(buildServerCard(url.origin), {
        headers: {
          'cache-control': 'public, max-age=3600',
          'access-control-allow-origin': '*',
        },
      });
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(INFO_PAGE, {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    if (
      ICON_ASSET_PATHS.includes(
        url.pathname as (typeof ICON_ASSET_PATHS)[number],
      )
    ) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
