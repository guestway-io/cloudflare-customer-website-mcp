/**
 * Cloudflare's edge closes idle SSE responses after ~5 minutes. The agents
 * framework arms keepalive on POST tool-call streams but not on the
 * standalone GET listen stream that Cursor keeps open while connected.
 * Without comment frames the client reconnects after ~7 minutes and may see
 * "Failed to open SSE stream: Internal Server Error".
 *
 * Mirrors agents/mcp/sse-keepalive.ts (cloudflare/agents#1583).
 */

/** Interval between SSE keepalive comment frames, in ms. */
export const KEEPALIVE_INTERVAL_MS = 25_000;

const KEEPALIVE_BYTES = new TextEncoder().encode(': keepalive\n\n');

/**
 * Merge periodic SSE comment frames into `body`. Parsers drop comments
 * before dispatch; clients stay connected under the edge idle watchdog.
 */
export function withSseKeepalive(
  body: ReadableStream<Uint8Array>,
  intervalMs = KEEPALIVE_INTERVAL_MS,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  return new ReadableStream({
    start(controller) {
      timer = setInterval(() => {
        try {
          controller.enqueue(KEEPALIVE_BYTES);
        } catch {
          stop();
        }
      }, intervalMs);

      (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          stop();
          reader.releaseLock();
        }
      })();
    },
    cancel(reason) {
      stop();
      return reader.cancel(reason);
    },
  });
}

/** True for the long-lived Streamable HTTP GET listener Cursor keeps open. */
export function isStandaloneMcpSse(
  request: Request,
  response: Response,
): boolean {
  if (request.method !== 'GET') return false;
  if (!request.headers.get('mcp-session-id')) return false;
  if (!response.ok || !response.body) return false;
  return (response.headers.get('content-type') ?? '').includes(
    'text/event-stream',
  );
}
