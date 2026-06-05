/**
 * Shared shaping for tool results. Every tool returns the same envelope: a
 * pretty-printed JSON text block (so clients that only render text still show
 * the full answer) plus `structuredContent` (so clients that parse structured
 * output get typed data). Errors return `isError: true` with a plain message.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function ok(data: unknown): CallToolResult {
  const json = JSON.stringify(data, null, 2);
  return {
    content: [{ type: 'text', text: json }],
    structuredContent: data as Record<string, unknown>,
  };
}

export function fail(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/**
 * Wraps a tool handler so an UpstreamError (or any throw) becomes a clean
 * `isError` result instead of a 500 that the client surfaces as a transport
 * failure. Keeps the model able to recover ("the catalogue is briefly
 * unavailable, try again") rather than seeing an opaque crash.
 */
export async function guard(
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Unexpected error fetching data.';
    return fail(`Could not complete the request: ${msg}`);
  }
}
