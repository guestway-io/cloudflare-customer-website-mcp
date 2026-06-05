import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCatalogFeed } from '../lib/data';
import { ok, guard } from '../lib/respond';

/**
 * Static company facts that are not in any feed. Kept here (not fetched) on
 * purpose: legal identity and HQ rarely change and are not worth an extra
 * origin round-trip. Apps + socials DO come from the catalog feed so the
 * single source of truth stays the marketing site.
 */
const COMPANY = {
  legalName: 'Guestway BV',
  address: 'Soenenspark 1, 9051 Gent, Belgium',
  foundedIn: 'Gent, Belgium',
  supportEmail: 'info@guestway.io',
  salesEmail: 'sales@guestway.io',
  description:
    'The AI-native operating system for property managers and hospitality ' +
    'teams. Guestway runs guest messaging, smart locks, cleaning operations ' +
    'and more in one platform that sits on top of the PMS, used by hotels, ' +
    'aparthotels and short-term-rental managers in 50+ countries.',
} as const;

export function registerCompanyTool(server: McpServer, env: Env): void {
  server.registerTool(
    'get_company_info',
    {
      title: 'Get Guestway company info',
      description:
        'Return Guestway company facts: legal name, registered address, ' +
        'support and sales contact emails, the mobile apps (iOS and Android, ' +
        'for managers, front-desk and cleaning staff, role-gated and ' +
        'multilingual) and official social profiles (LinkedIn, X, YouTube). ' +
        'Use for "who are Guestway", "how do I contact them", "is there an ' +
        'app", or "what are their socials".',
      inputSchema: {},
    },
    async () =>
      guard(async () => {
        const catalog = await getCatalogFeed(env);
        return ok({
          ...COMPANY,
          site: catalog.site,
          apps: catalog.apps,
          socials: catalog.socials,
        });
      }),
  );
}
