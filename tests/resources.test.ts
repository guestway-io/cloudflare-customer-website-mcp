import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectClient, mockFetch } from './helpers';

/** Read the `text` off the first resource-content entry (union-typed in SDK). */
function firstText(res: { contents: Array<Record<string, unknown>> }): string {
  return String(res.contents[0].text);
}

describe('resources', () => {
  beforeEach(() => mockFetch());
  afterEach(() => vi.unstubAllGlobals());

  it('exposes the static resource set', async () => {
    const { client, close } = await connectClient();
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain('guestway://overview');
    expect(uris).toContain('guestway://catalog');
    expect(uris).toContain('guestway://faq');
    expect(uris).toContain('guestway://integrations');
    expect(uris).toContain('guestway://solutions');
    expect(uris).toContain('guestway://industries');
    expect(uris).toContain('guestway://pricing');
    expect(uris).toContain('guestway://legal');
    await close();
  });

  it('reads llms.txt via guestway://overview', async () => {
    const { client, close } = await connectClient();
    const res = await client.readResource({ uri: 'guestway://overview' });
    expect(res.contents[0].mimeType).toBe('text/plain');
    expect(firstText(res as any)).toMatch(/Guestway/);
    await close();
  });

  it('reads a single integration via the template', async () => {
    const { client, close } = await connectClient();
    const res = await client.readResource({
      uri: 'guestway://integrations/booking-com',
    });
    const data = JSON.parse(firstText(res as any));
    expect(data.slug).toBe('booking-com');
    await close();
  });

  it('reads a single FAQ category via the template', async () => {
    const { client, close } = await connectClient();
    const res = await client.readResource({ uri: 'guestway://faq/pricing' });
    const data = JSON.parse(firstText(res as any));
    expect(data.slug).toBe('pricing');
    expect(data.items.length).toBeGreaterThan(0);
    await close();
  });

  it('reads a skill markdown via the template', async () => {
    const { client, close } = await connectClient();
    const res = await client.readResource({
      uri: 'guestway://skills/resource-routing',
    });
    expect(res.contents[0].mimeType).toBe('text/markdown');
    expect(firstText(res as any)).toMatch(/resource-routing/);
    await close();
  });

  it('pricing resource carries the no-invented-numbers note and FAQs', async () => {
    const { client, close } = await connectClient();
    const res = await client.readResource({ uri: 'guestway://pricing' });
    const data = JSON.parse(firstText(res as any));
    expect(data.canonicalUrl).toContain('/pricing');
    expect(Array.isArray(data.faqs)).toBe(true);
    await close();
  });
});

describe('prompts', () => {
  beforeEach(() => mockFetch());
  afterEach(() => vi.unstubAllGlobals());

  it('route-question prompt injects the routing guide', async () => {
    const { client, close } = await connectClient();
    const res = await client.getPrompt({
      name: 'route-question',
      arguments: { question: 'how do I configure smart locks?' },
    });
    const text = (res.messages[0].content as { text: string }).text;
    expect(text).toMatch(/ROUTING GUIDE/);
    expect(text).toMatch(/configure smart locks/);
    await close();
  });
});
