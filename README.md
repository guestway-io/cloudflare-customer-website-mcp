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
                      get_company_info, get_testimonials, search_docs,
                      get_doc, route_question
  lib/integration-docs.ts  maps marketing integration slugs -> Academy URLs
  resources/          guestway:// URIs (overview, catalog, faq, integrations,
                      solutions, industries, testimonials, pricing, legal, skills)
  prompts/            route-question
  well-known/         capability descriptor + MCP Server Card
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

### Dashboard config (Domains & Routes) — current state

- **Custom Domain**: `public-mcp.guestway.io` — the one canonical endpoint.
- **Worker URL** (`*.workers.dev`): **disabled**. We don't want the MCP
  reachable at a second public URL; the capability descriptor and the
  DNS-AID record both point at the custom domain, and the `workers.dev`
  hostname would bypass any zone-level config attached to the custom domain.
- **Preview URLs**: **disabled** — we don't use per-version preview hostnames
  for this service.

If you re-enable either toggle later, remember the MCP becomes reachable at
multiple URLs; keep the custom domain authoritative.

## DNS-AID discovery records

Published on the `guestway.io` zone (DNS only, no proxy; the zone has DNSSEC
active) so DNS-AID-aware agents can discover the MCP and the discovery layer.
Custom `cap=` / `mandatory=` SvcParams are intentionally omitted — Cloudflare's
SVCB editor does not reliably accept them, and they are not needed: an agent
follows the SVCB target and reads the well-known descriptor by convention.

```
; The MCP server
_mcp._agents.guestway.io.    3600 IN SVCB 1 public-mcp.guestway.io. alpn="h2" port=443

; The discovery entrypoint (serves /.well-known/api-catalog, /llms.txt, agent-skills)
_index._agents.guestway.io.  3600 IN SVCB 1 guestway.io.            alpn="h2" port=443
```

An agent follows `_mcp._agents` to `public-mcp.guestway.io`, reads
`/.well-known/mcp-capabilities.json`, and connects to `/mcp`. The `_index`
record points at the marketing site's discovery layer.

Verify:

```bash
dig +short SVCB _mcp._agents.guestway.io
dig +short SVCB _index._agents.guestway.io
dig +dnssec _mcp._agents.guestway.io | grep -E 'flags:|ad'   # expect the 'ad' flag
```

## Agent playbook (common pitfalls)

| Symptom | Cause | Fix |
|---|---|---|
| Resource read fails for `nest` | Resources use `guestway://integrations/nest`, not a bare slug | Read the full URI or call `get_integration` |
| `search_faq("connect Nest")` returns nothing | FAQs are pre-sales; setup lives in the Academy | `search_docs` → `get_doc`, or `get_integration` → `setupDocUrl` |
| Agent guesses Academy URLs and 404s | Paths are not predictable (`nest` → `google-nest.md`) | Use `setupDocUrl` / `search_docs`, never invent paths |
| Slow or empty off-MCP `?ask=` on GitBook | Optional GitBook query API; can time out | Use MCP `get_doc` on the `.md` URL instead |

## Surface

11 tools, ~16 resource patterns (templates expand per item), 1 prompt. All
read-only, no auth. The server also sends `instructions` on connect (call-order
guidance + read-only scope). See `/.well-known/mcp-capabilities.json` for the
live inventory.

Backed by these marketing-site feeds (single-sourced from content
collections): `solutions` (enriched with intro, stories, capabilities,
related), `faq`, `integrations`, `industries`, `testimonials`, `legal`
(full markdown for public Privacy/Terms; contract-only DPA/MSA as pointers),
plus `llms.txt`, the agent-skills, and the Academy index at
`docs.guestway.io/llms.txt` (powers `search_docs` and `get_doc`; integration
tools attach `setupDocUrl` when a matching Academy article exists).

There is a public `/mcp` landing page on guestway.io with copy-paste connect
steps for Claude / Cursor / ChatGPT, linked from the footer next to the
"Compare us in..." strip.

### Not shipped (planned)

- `get_demo_availability` + `prepare_demo_booking` (HubSpot Scheduler API read
  + pre-filled browser-handoff booking URL, no server-side write);
  `assess-fit`, `objection-handle`, `compare-to-pms-stack` prompts.
- `get_recent_changes` (changelog), `get_system_status` (status page).
- `guestway://pricing` remains FAQ-backed by design (no machine-published
  price list; agents are routed to a demo for exact quotes).

## Notes

- No pricing tool by design. Pricing is human-gated; agents are routed to a
  demo. Do not add a tool that quotes prices.
- Private repo. TypeScript compiles to JavaScript with no source maps. The
  runtime responses are public by nature (the data is public marketing
  content); the source is not.
