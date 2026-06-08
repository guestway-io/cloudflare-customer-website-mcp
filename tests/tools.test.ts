import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { connectClient, mockFetch, parseToolJson } from './helpers';

describe('tools', () => {
  beforeEach(() => mockFetch());
  afterEach(() => vi.unstubAllGlobals());

  it('lists exactly the 13 tools', async () => {
    const { client, close } = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'ask_doc',
        'find_related_faqs',
        'get_changelog',
        'get_company_info',
        'get_doc',
        'get_integration',
        'get_solution',
        'get_testimonials',
        'route_question',
        'search_docs',
        'search_faq',
        'search_integrations',
        'search_solutions',
      ].sort(),
    );
    await close();
  });

  it('search_docs finds Nest thermostat setup (slug alias google-nest)', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_docs',
      arguments: { query: 'connect Nest thermostat', limit: 5 },
    });
    const data = parseToolJson(res as any);
    expect(data.resultCount).toBeGreaterThan(0);
    const nest = data.results.find((r: { url: string }) =>
      r.url.includes('google-nest'),
    );
    expect(nest).toBeTruthy();
    await close();
  });

  it('get_integration attaches setupDocUrl for nest', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_integration',
      arguments: { slug: 'nest' },
    });
    const data = parseToolJson(res as any);
    expect(data.slug).toBe('nest');
    expect(data.setupDocUrl).toMatch(/google-nest\.md$/);
    expect(data.setupDocTitle).toMatch(/Google Nest/i);
    await close();
  });

  it('get_integration resolves google-nest alias to nest', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_integration',
      arguments: { slug: 'google-nest' },
    });
    const data = parseToolJson(res as any);
    expect(data.slug).toBe('nest');
    expect(data.resolvedFrom).toBe('google-nest');
    await close();
  });

  it('ask_doc returns an answer from the Academy ask endpoint', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'ask_doc',
      arguments: {
        url: 'integrations/smart-thermostats/google-nest',
        question: 'How do I connect Google Nest?',
      },
    });
    const data = parseToolJson(res as any);
    expect(data.answer).toMatch(/Organization Settings|Integrations/i);
    await close();
  });

  it('get_doc returns Academy markdown for nest setup path', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_doc',
      arguments: {
        url: 'integrations/smart-thermostats/google-nest',
      },
    });
    const data = parseToolJson(res as any);
    expect(data.url).toMatch(/google-nest\.md$/);
    expect(data.markdown).toMatch(/Organization Settings/i);
    await close();
  });

  it('search_faq hints search_docs when setup query has no FAQ hit', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_faq',
      arguments: { query: 'connect Nest thermostat', category: 'integrations' },
    });
    const data = parseToolJson(res as any);
    expect(data.resultCount).toBe(0);
    expect(data.hint).toMatch(/search_docs/);
    await close();
  });

  it('search_docs ranks Academy articles from the docs index', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_docs',
      arguments: { query: 'connect Mews PMS' },
    });
    const data = parseToolJson(res as any);
    expect(data.totalIndexed).toBeGreaterThan(20);
    expect(data.resultCount).toBeGreaterThan(0);
    // A relevant hit should be a real docs.guestway.io .md URL.
    expect(data.results[0].url).toMatch(/docs\.guestway\.io.*\.md$/);
    const anyMews = data.results.some((r: any) =>
      `${r.title} ${r.description}`.toLowerCase().includes('mews'),
    );
    expect(anyMews).toBe(true);
    await close();
  });

  it('advertises server instructions (call-order guidance) on connect', async () => {
    const { client, close } = await connectClient();
    const instructions = client.getInstructions();
    expect(instructions).toBeTruthy();
    expect(instructions).toMatch(/search_integrations/);
    expect(instructions).toMatch(/get_doc/);
    expect(instructions).toMatch(/guestway:\/\//);
    expect(instructions).toMatch(/read-only/i);
    await close();
  });

  it('get_testimonials returns customer quotes with author + company', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_testimonials',
      arguments: {},
    });
    const data = parseToolJson(res as any);
    expect(data.total).toBe(5);
    expect(data.testimonials[0].author).toBeTruthy();
    expect(data.testimonials[0].company).toBeTruthy();
    expect(data.testimonials.some((t: any) => t.featured)).toBe(true);
    await close();
  });

  it('search_faq finds smart-lock answers and ranks them', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_faq',
      arguments: { query: 'smart lock codes' },
    });
    const data = parseToolJson(res as any);
    expect(data.resultCount).toBeGreaterThan(0);
    expect(data.results[0].relevance).toBeGreaterThan(0);
    // Results are sorted by relevance, descending.
    const scores = data.results.map((r: any) => r.relevance);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // At least one hit should actually be about locks/codes/access.
    const anyRelevant = data.results.some((r: any) =>
      `${r.question} ${r.answer}`.toLowerCase().match(/lock|code|access/),
    );
    expect(anyRelevant).toBe(true);
    await close();
  });

  it('search_faq honours the category filter', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_faq',
      arguments: { query: 'demo', category: 'pricing' },
    });
    const data = parseToolJson(res as any);
    for (const r of data.results) expect(r.category).toBe('pricing');
    await close();
  });

  it('find_related_faqs returns the pricing-page accordion', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'find_related_faqs',
      arguments: { slug: 'pricing' },
    });
    const data = parseToolJson(res as any);
    expect(data.questionCount).toBeGreaterThan(0);
    await close();
  });

  it('search_integrations returns status-typed results and totals', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_integrations',
      arguments: {},
    });
    const data = parseToolJson(res as any);
    expect(data.totals.all).toBe(57);
    expect(
      data.totals.live + data.totals.early + data.totals.soon,
    ).toBe(57);
    for (const i of data.integrations)
      expect(['live', 'early', 'soon']).toContain(i.status);
    await close();
  });

  it('search_integrations filters by status', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_integrations',
      arguments: { status: 'live' },
    });
    const data = parseToolJson(res as any);
    expect(data.resultCount).toBe(data.totals.live);
    for (const i of data.integrations) expect(i.status).toBe('live');
    await close();
  });

  it('get_integration returns a clean error for an unknown slug', async () => {
    const { client, close } = await connectClient();
    const res: any = await client.callTool({
      name: 'get_integration',
      arguments: { slug: 'definitely-not-real' },
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/No integration/);
    await close();
  });

  it('get_solution attaches the module FAQs', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_solution',
      arguments: { slug: 'ai-inbox' },
    });
    const data = parseToolJson(res as any);
    expect(data.slug).toBe('ai-inbox');
    expect(data.url).toContain('/solutions/ai-inbox');
    expect(Array.isArray(data.faqs)).toBe(true);
    // Enriched fields from the richer solutions feed.
    expect(data.intro.statement).toBeTruthy();
    expect(data.stories.length).toBeGreaterThan(0);
    expect(data.capabilities.length).toBeGreaterThan(0);
    expect(Array.isArray(data.related)).toBe(true);
    await close();
  });

  it('get_company_info merges static facts with feed apps/socials', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_company_info',
      arguments: {},
    });
    const data = parseToolJson(res as any);
    expect(data.legalName).toBe('Guestway BV');
    expect(data.apps.length).toBe(2);
    expect(data.socials.map((s: any) => s.name)).toContain('LinkedIn');
    await close();
  });

  it('get_changelog returns a recent-month excerpt', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_changelog',
      arguments: { months: 1 },
    });
    const data = parseToolJson(res as any);
    expect(data.excerpt).toMatch(/May 2026/);
    expect(data.excerpt).not.toMatch(/March 2026/);
    expect(data.excerpt).not.toMatch(/Related Articles/);
    expect(data.excerpt).not.toMatch(/Powered by Pylon/);
    await close();
  });

  it('search_docs ranks Automations for satisfaction review automation queries', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'search_docs',
      arguments: {
        query: 'automation review request only if satisfied guest',
        limit: 5,
      },
    });
    const data = parseToolJson(res as any);
    expect(data.results[0].title).toBe('Automations');
    expect(data.results[0].url).toMatch(/\/automations\.md$/);
    await close();
  });

  it('get_doc suggests ask_doc on long Academy pages', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'get_doc',
      arguments: {
        url: 'settings/organization-settings/automations',
      },
    });
    const data = parseToolJson(res as any);
    expect(data.charCount).toBeGreaterThan(8000);
    expect(data.note).toMatch(/ask_doc/i);
    await close();
  });

  it('route_question returns the routing skill verbatim', async () => {
    const { client, close } = await connectClient();
    const res = await client.callTool({
      name: 'route_question',
      arguments: { question: 'is something down?' },
    });
    const data = parseToolJson(res as any);
    expect(data.routingGuide).toMatch(/resource-routing/);
    expect(data.routingGuide).toMatch(/status\.guestway\.io/);
    await close();
  });
});
