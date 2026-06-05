# Guestway Public MCP

A Model Context Protocol (MCP) server that exposes Guestway's public marketing
surface (product modules, FAQs, integrations, industries, company info) to AI
agents. It is a Cloudflare Worker built on the `agents` framework, deployed at
`public-mcp.guestway.io`.

The server holds no marketing facts of its own. At request time it fetches the
JSON feeds and text resources that `guestway.io` already publishes and caches
them at the edge, so the marketing site stays the single source of truth and a
site deploy propagates here within ~5 minutes with no Worker redeploy.

## Architecture

```
public-mcp.guestway.io
  /mcp                                MCP endpoint (Streamable HTTP, no auth)
  /.well-known/mcp-capabilities.json  capability descriptor (DNS-AID target)
  /                                   plain-text info page

src/
  index.ts            Worker entry + GuestwayMCP Durable Object
  server.ts           createServer(env): registers the whole surface
  lib/data.ts         edge-cached fetchers for guestway.io feeds
  lib/search.ts       dependency-free token-overlap scorer
  lib/respond.ts      tool result envelope + error guard
  tools/              search_faq, find_related_faqs, search_solutions,
                      get_solution, search_integrations, get_integration,
                      get_company_info, route_question
  resources/          guestway:// URIs (overview, catalog, faq, integrations,
                      solutions, industries, pricing, legal, skills)
  prompts/            route-question
  well-known/         capability descriptor
  shims/ai.ts         stub for the agents package's optional `ai` peer dep
tests/                vitest + in-memory MCP client, mocked fetch vs fixtures
```

Data flows one way: `guestway.io/data/*.json` (built from the site's content
collections) -> edge cache -> MCP tools/resources. See the marketing repo's
`src/lib/agent-exports/project.ts` for the feed projections.

## Develop

```bash
npm install
npm run dev          # wrangler dev on http://localhost:8787
npm test             # vitest (mocked fetch vs tests/fixtures/)
npm run typecheck    # tsc --noEmit
```

Live smoke test against a running dev server (hits real guestway.io feeds):

```bash
npm run dev          # in one terminal
node scripts/smoke.mjs
```

Inspect interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP, URL: http://localhost:8787/mcp
```

## Refreshing test fixtures

The fixtures in `tests/fixtures/` are copies of the marketing site's built
feeds. Refresh them after a content change on the site:

```bash
SITE=../customer-website/dist
cp $SITE/data/{faq,integrations,solutions,industries,catalog}.json tests/fixtures/
cp ../customer-website/public/llms.txt tests/fixtures/llms.txt
cp ../customer-website/public/.well-known/api-catalog tests/fixtures/api-catalog
for s in guestway-overview resource-routing sales-faq book-demo; do
  cp ../customer-website/public/.well-known/agent-skills/$s/SKILL.md tests/fixtures/skills/$s.md
done
```

## Deploy

```bash
npm run deploy       # wrangler deploy
```

First deploy also needs the custom domain attached. Either uncomment the
`routes` block in `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "public-mcp.guestway.io", "custom_domain": true }]
```

or add it in the dashboard: Workers & Pages -> guestway-public-mcp ->
Settings -> Domains & Routes -> Add custom domain -> `public-mcp.guestway.io`.
Cloudflare issues the TLS cert automatically.

## DNS-AID discovery record

After the custom domain is live, publish the DNS-AID SVCB record on the
`guestway.io` zone so DNS-AID-aware agents can discover this MCP. In Cloudflare
DNS (DNS only, grey cloud; the zone must have DNSSEC active):

```
_mcp._agents.guestway.io.  600  IN  SVCB  1 public-mcp.guestway.io. (
    alpn="h2"
    port=443
    mandatory=alpn,port
)
```

An agent then follows the SVCB target to `public-mcp.guestway.io`, reads
`/.well-known/mcp-capabilities.json`, and connects to `/mcp`.

## Surface (V1)

8 tools, ~14 resource patterns (templates expand per item), 1 prompt. All
read-only, no auth. See `/.well-known/mcp-capabilities.json` for the live
inventory.

### Not in V1 (planned)

- **V2**: `get_demo_availability` + `prepare_demo_booking` (HubSpot Scheduler
  API read + pre-filled browser-handoff booking URL, no server-side write);
  `assess-fit`, `objection-handle`, `compare-to-pms-stack` prompts.
- **V3**: `search_academy` (docs.guestway.io), `get_recent_changes`
  (changelog), `get_system_status` (status page).
- **Needs a site-side feed first**: `guestway://testimonials` (quotes live in
  solutions YAML, not in the slim solutions feed) and machine-readable legal
  text (pages render HTML only). `guestway://pricing` and `guestway://legal`
  currently return FAQ-backed data and canonical pointers respectively.

## Notes

- No pricing tool by design. Pricing is human-gated; agents are routed to a
  demo. Do not add a tool that quotes prices.
- Private repo. TypeScript compiles to JavaScript with no source maps. The
  runtime responses are public by nature (the data is public marketing
  content); the source is not.
