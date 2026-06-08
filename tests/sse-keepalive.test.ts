import { describe, expect, it } from 'vitest';
import { isStandaloneMcpSse, withSseKeepalive } from '../src/lib/sse-keepalive';

describe('withSseKeepalive', () => {
  it('forwards source chunks and injects comment frames while open', async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
      },
    });

    const wrapped = withSseKeepalive(source, 15);
    const reader = wrapped.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe('data: hello\n\n');

    await new Promise((r) => setTimeout(r, 30));
    const second = await reader.read();
    expect(second.done).toBe(false);
    expect(new TextDecoder().decode(second.value!)).toBe(': keepalive\n\n');

    await reader.cancel();
  });
});

describe('isStandaloneMcpSse', () => {
  it('matches GET + mcp-session-id + event-stream', () => {
    const request = new Request('https://example.com/mcp', {
      method: 'GET',
      headers: {
        'mcp-session-id': 'abc',
        accept: 'text/event-stream',
      },
    });
    const response = new Response(new ReadableStream(), {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
    expect(isStandaloneMcpSse(request, response)).toBe(true);
  });

  it('ignores POST responses', () => {
    const request = new Request('https://example.com/mcp', {
      method: 'POST',
      headers: { 'mcp-session-id': 'abc' },
    });
    const response = new Response(new ReadableStream(), {
      headers: { 'content-type': 'text/event-stream' },
    });
    expect(isStandaloneMcpSse(request, response)).toBe(false);
  });
});
