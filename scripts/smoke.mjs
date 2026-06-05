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

await client.close();
console.log('\nOK: live MCP handshake + tool calls succeeded.');
