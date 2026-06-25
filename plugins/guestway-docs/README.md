# guestway-docs (Claude Code plugin)

Connects Claude Code to the public **Guestway Docs** MCP server
(`https://public-mcp.guestway.io/mcp`) — read-only, no login. Ask about
product modules, the 57 integrations and their live status, pre-sales FAQs,
company info, the changelog, and Academy how-to docs.

## Install

This repository doubles as a Claude Code plugin marketplace named `guestway`.

```
/plugin marketplace add guestway-io/cloudflare-customer-website-mcp
/plugin install guestway-docs@guestway
```

Then ask, e.g. "Does Guestway integrate with Mews?" or "How do I connect a
Google Nest thermostat in Guestway?".

## What it ships

Nothing but a remote MCP reference — see `.mcp.json`. The plugin adds one
HTTP MCP server (`guestway-docs`); its 13 read-only tools appear in Claude's
toolkit when the plugin is enabled. No credentials, no local process.
