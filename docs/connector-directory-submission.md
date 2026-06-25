# Claude Connectors Directory — submission packet

Everything needed to list **Guestway Docs** in Anthropic's Connectors
Directory so Claude users can add it in one click. The server is a public,
read-only, no-auth remote MCP — the simplest category to get approved.

## Where to submit

Two routes (pick whichever you can access):

1. **Submission portal** (preferred) — `claude.ai` → admin settings →
   `https://claude.ai/admin-settings/directory/submissions/new`.
   Requires a **Team or Enterprise** org and **Directory management**
   permission (Owner / Primary owner by default).
2. **MCP directory submission form** — use this if your org isn't on
   Team/Enterprise. Linked from the
   [submission guide](https://claude.com/docs/connectors/building/submission).

Progress auto-saves in the browser session. The portal walks through:
Introduction → Connection → Tools → Listing details → Use cases & company →
Auth & data handling → Test credentials → Compliance → Review & submit.

## Pre-submission checklist (status)

| Requirement | Status | Notes |
|---|---|---|
| Public, production hosting | ✅ | `https://public-mcp.guestway.io/mcp`, Cloudflare Worker, custom domain |
| Reachable from Anthropic IP ranges | ✅ | Public internet, no IP allowlist |
| Transport | ✅ | Streamable HTTP |
| Every tool has `title` | ✅ | All 13 |
| Every tool has `readOnlyHint`/`destructiveHint` | ✅ | All 13 are `readOnlyHint: true` (added; locked by a test) |
| Tool names ≤ 64 chars | ✅ | Longest is `search_integrations` |
| No tool mixes safe + unsafe operations | ✅ | Entire server is read-only |
| Descriptions match real behavior, no prompt-injection patterns | ✅ | Function-only descriptions |
| Custom/freeform-path tools name their target API | ✅ | `get_doc`/`ask_doc` name docs.guestway.io / GitBook `?ask=` |
| Privacy policy (stable public URL) | ⚠️ Action | Confirm the canonical Guestway privacy-policy URL (see below) |
| Support channel | ✅ | `info@guestway.io` |
| Public documentation | ✅ | `https://guestway.io/mcp` + `/llms.txt` |
| Test credentials | ✅ | None needed — server is unauthenticated (see below) |
| Branding icon | ✅ | `https://public-mcp.guestway.io/icon-96.png` (also 48/128/svg) |

The only open item is confirming the privacy-policy URL — everything else
is ready.

## Listing details (suggested copy)

- **Name:** Guestway Docs
- **Tagline:** Ask Claude about Guestway — product, integrations, FAQs and how-to docs.
- **Description:** Public, read-only documentation connector for Guestway,
  the AI-native operating system for property managers and hospitality teams.
  Search the 9 product modules, check whether any of 57 systems is integrated
  and its live status, read pre-sales FAQs, pull setup how-tos from the
  Guestway Academy, and get company info and the recent changelog. Data is
  sourced live from guestway.io and docs.guestway.io — no login, no account
  data, no writes.
- **Categories:** Documentation / Knowledge & Search (and Sales/CRM-adjacent if offered).
- **Company:** Guestway BV, Soenenspark 1, 9051 Gent, Belgium — https://guestway.io
- **Support contact:** info@guestway.io

## Connection

- **Server URL:** `https://public-mcp.guestway.io/mcp`
- **Transport:** Streamable HTTP
- **Authentication:** None (public, read-only). In the form choose
  "No authentication."

## Privacy policy (action item)

Missing/incomplete privacy policies are the #1 cause of immediate rejection.
The server collects no personal data and requires no login, but the form
still requires a stable public privacy-policy URL. Use Guestway's existing
public policy (served from the marketing site / the `guestway://legal/privacy`
resource). **Confirm the exact canonical URL** (e.g. `https://guestway.io/legal/privacy`)
before submitting — paste the live URL, not a guess.

## Test instructions for the reviewer

No credentials required. Reviewer steps:

1. Add a custom connector with URL `https://public-mcp.guestway.io/mcp`
   (Streamable HTTP, no auth), or connect via MCP Inspector.
2. Sample prompts that exercise the surface:
   - "Does Guestway integrate with Mews?" → `search_integrations` / `get_integration`
   - "What does the AI Inbox do?" → `search_solutions` → `get_solution`
   - "How do I connect a Google Nest thermostat?" → `search_docs` → `get_doc`
   - "What shipped in Guestway recently?" → `get_changelog`
   - "Who is Guestway and how do I contact them?" → `get_company_info`

## Tool inventory (13 tools, all read-only)

`search_faq`, `find_related_faqs`, `search_solutions`, `get_solution`,
`search_integrations`, `get_integration`, `get_company_info`,
`get_testimonials`, `search_docs`, `get_doc`, `ask_doc`, `get_changelog`,
`route_question`.

Each is registered with `annotations: { readOnlyHint: true, openWorldHint: true }`.
Live machine-readable inventory: `https://public-mcp.guestway.io/.well-known/mcp-capabilities.json`.
