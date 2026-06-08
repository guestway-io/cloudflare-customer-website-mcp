/**
 * Test harness. Stubs global fetch to serve the committed fixtures in
 * tests/fixtures/ for any https://test.guestway.io/... URL, and wires an
 * in-memory MCP client to a freshly-built server so tests exercise the real
 * registered tool/resource/prompt surface (not the handlers in isolation).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

export const TEST_SITE = 'https://test.guestway.io';
export const TEST_DOCS = 'https://test-docs.guestway.io';
export const TEST_ENV = {
  SITE_URL: TEST_SITE,
  DOCS_URL: TEST_DOCS,
} as unknown as Env;

/**
 * Maps an upstream URL to a fixture. The docs Academy and the marketing site
 * both expose `/llms.txt`, so we disambiguate on hostname before path.
 */
function fixtureFor(
  host: string,
  path: string,
): { file: string; type: string } | null {
  if (host.includes('docs')) {
    if (path === '/llms.txt') {
      return { file: 'docs-llms.txt', type: 'text/markdown' };
    }
    if (path.endsWith('.md')) {
      const rel = path.replace(/^\//, '').split('?')[0];
      return { file: `docs/${rel}`, type: 'text/markdown' };
    }
  }
  return fixtureForPath(path);
}

function fixtureForPath(path: string): { file: string; type: string } | null {
  const map: Record<string, { file: string; type: string }> = {
    '/data/faq.json': { file: 'faq.json', type: 'application/json' },
    '/data/integrations.json': {
      file: 'integrations.json',
      type: 'application/json',
    },
    '/data/solutions.json': { file: 'solutions.json', type: 'application/json' },
    '/data/industries.json': {
      file: 'industries.json',
      type: 'application/json',
    },
    '/data/catalog.json': { file: 'catalog.json', type: 'application/json' },
    '/data/testimonials.json': {
      file: 'testimonials.json',
      type: 'application/json',
    },
    '/data/legal.json': { file: 'legal.json', type: 'application/json' },
    '/llms.txt': { file: 'llms.txt', type: 'text/plain' },
    '/.well-known/api-catalog': {
      file: 'api-catalog',
      type: 'application/linkset+json',
    },
  };
  if (map[path]) return map[path];

  const skill = path.match(
    /^\/\.well-known\/agent-skills\/([a-z-]+)\/SKILL\.md$/,
  );
  if (skill) return { file: `skills/${skill[1]}.md`, type: 'text/markdown' };

  return null;
}

/**
 * Installs a global.fetch stub for the duration of a test. Returns the spy so
 * tests can assert on call counts (e.g. edge-cache behaviour). Unknown URLs
 * resolve to 404 so a typo in a loader surfaces loudly.
 */
export function mockFetch() {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input && typeof (input as Request).url === 'string'
            ? (input as Request).url
            : String(input);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      // Anything that isn't an absolute URL is not one of our feed loaders.
      return new Response('bad request', { status: 400 });
    }
    if (parsed.hostname.includes('usepylon.com')) {
      return new Response(
        '<html><body><h2>May 2026</h2><p>New charges feature.</p>' +
          '<h2>April 2026</h2><p>Journey editor refresh.</p>' +
          '<h2>March 2026</h2><p>Older month.</p></body></html>',
        { status: 200, headers: { 'content-type': 'text/html' } },
      );
    }

    const hit = fixtureFor(parsed.hostname, parsed.pathname);
    if (!hit) {
      return new Response('not found', { status: 404 });
    }
    const body = readFileSync(join(FIXTURES, hit.file), 'utf8');
    return new Response(body, {
      status: 200,
      headers: { 'content-type': hit.type },
    });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** Build a server + connect an in-memory client. Caller closes via `close()`. */
export async function connectClient(env: Env = TEST_ENV) {
  const server = createServer(env);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

/** Parse a tool result's first text block as JSON. */
export function parseToolJson(result: {
  content?: Array<{ type: string; text?: string }>;
}): any {
  const text = result.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('tool result had no text content');
  return JSON.parse(text);
}
