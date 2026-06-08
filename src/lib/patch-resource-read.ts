/**
 * Wrap resources/read so bare slugs and scheme-less paths resolve instead of
 * crashing inside the SDK's `new URL(request.params.uri)`.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ErrorCode,
  McpError,
  ReadResourceRequestSchema,
  type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import { resourceUriCandidates } from './resource-uri';

type RawHandler = (
  request: unknown,
  extra: unknown,
) => Promise<ReadResourceResult>;

type ProtocolWithHandlers = {
  _requestHandlers: Map<string, RawHandler>;
  removeRequestHandler: (method: string) => void;
  setRequestHandler: (
    schema: typeof ReadResourceRequestSchema,
    handler: (
      request: { params: { uri: string } },
      extra: unknown,
    ) => Promise<ReadResourceResult>,
  ) => void;
};

const READ_METHOD = 'resources/read';

function isRetriableReadError(err: unknown): boolean {
  if (err instanceof McpError) {
    if (err.code === ErrorCode.InvalidParams) return true;
  }
  if (err instanceof TypeError && /Invalid URL/i.test(err.message)) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid url')) return true;
    if (msg.includes('not found')) return true;
  }
  return false;
}

/** Install after all resources are registered on the server. */
export function patchResourceReadHandler(mcp: McpServer): void {
  const protocol = mcp.server as unknown as ProtocolWithHandlers;
  const original = protocol._requestHandlers.get(READ_METHOD);
  if (!original) return;

  protocol.removeRequestHandler(READ_METHOD);
  protocol.setRequestHandler(
    ReadResourceRequestSchema,
    async (request, extra) => {
      const candidates = resourceUriCandidates(request.params.uri);
      if (candidates.length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Empty resource URI. Use guestway://… (e.g. guestway://integrations/nest).`,
        );
      }

      let lastError: unknown;
      for (const uri of candidates) {
        try {
          return await original(
            { method: READ_METHOD, params: { uri } },
            extra,
          );
        } catch (err) {
          lastError = err;
          if (!isRetriableReadError(err)) throw err;
        }
      }

      if (lastError instanceof McpError) throw lastError;
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown resource "${request.params.uri}". Use a full guestway:// URI ` +
          `(e.g. guestway://integrations/nest), or call get_integration / ` +
          `search_integrations instead of a bare slug.`,
      );
    },
  );
}
