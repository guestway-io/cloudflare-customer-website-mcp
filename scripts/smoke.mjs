// Live smoke test: connect to the running wrangler dev MCP endpoint over
// Streamable HTTP, list tools/resources, and call a couple of tools so we
// exercise the real fetch path to guestway.io's feeds. Run while `npm run dev`
// is up:  node scripts/smoke.mjs
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.env.MCP_URL ?? 'http://127.0.0.1:8787/mcp');
const client = new Client({ name: 'smoke', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(url));

const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name).join(', '));

const resources = await client.listResources();
console.log('resources:', resources.resources.length, 'static');

const integ = await client.callTool({
  name: 'search_integrations',
  arguments: { query: 'booking' },
});
const integData = JSON.parse(integ.content[0].text);
console.log(
  'search_integrations("booking") ->',
  integData.resultCount,
  'hits, totals.all=',
  integData.totals.all,
);

const faq = await client.callTool({
  name: 'search_faq',
  arguments: { query: 'cancel subscription', limit: 2 },
});
const faqData = JSON.parse(faq.content[0].text);
console.log('search_faq("cancel subscription") ->', faqData.resultCount, 'hits');

const company = await client.callTool({
  name: 'get_company_info',
  arguments: {},
});
const companyData = JSON.parse(company.content[0].text);
console.log('get_company_info -> apps:', companyData.apps.length, 'socials:', companyData.socials.length);

const testi = await client.callTool({ name: 'get_testimonials', arguments: {} });
const testiData = JSON.parse(testi.content[0].text);
console.log('get_testimonials ->', testiData.total, 'quotes, first:', testiData.testimonials[0].author);

const sol = await client.callTool({
  name: 'get_solution',
  arguments: { slug: 'ai-inbox' },
});
const solData = JSON.parse(sol.content[0].text);
console.log(
  'get_solution(ai-inbox) -> stories:',
  solData.stories.length,
  'capabilities:',
  solData.capabilities.length,
  'intro:',
  JSON.stringify(solData.intro.statement),
);

const priv = await client.readResource({ uri: 'guestway://legal/privacy' });
console.log(
  'resource guestway://legal/privacy ->',
  priv.contents[0].mimeType,
  ',',
  priv.contents[0].text.length,
  'chars',
);

const dpa = await client.readResource({ uri: 'guestway://legal/dpa' });
console.log(
  'resource guestway://legal/dpa ->',
  JSON.parse(dpa.contents[0].text).note ? 'contract-only pointer (no body)' : 'UNEXPECTED body',
);

const tRes = await client.readResource({ uri: 'guestway://testimonials' });
console.log('resource guestway://testimonials ->', JSON.parse(tRes.contents[0].text).total, 'quotes');

const docs = await client.callTool({
  name: 'search_docs',
  arguments: { query: 'connect Mews PMS', limit: 3 },
});
const docsData = JSON.parse(docs.content[0].text);
console.log(
  'search_docs("connect Mews PMS") ->',
  docsData.resultCount,
  'of',
  docsData.totalIndexed,
  'indexed; top:',
  docsData.results[0]?.title,
);

const nest = await client.callTool({
  name: 'get_integration',
  arguments: { slug: 'nest' },
});
const nestData = JSON.parse(nest.content[0].text);
console.log('get_integration(nest) -> setupDocUrl:', nestData.setupDocUrl ?? 'none');

if (nestData.setupDocUrl) {
  const body = await client.callTool({
    name: 'get_doc',
    arguments: { url: nestData.setupDocUrl },
  });
  const bodyData = JSON.parse(body.content[0].text);
  console.log('get_doc(nest setup) ->', bodyData.charCount, 'chars');
}

await client.close();
console.log('\nOK: live MCP handshake + new-surface tool/resource calls succeeded.');
