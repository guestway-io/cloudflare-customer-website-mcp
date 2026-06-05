# resource-routing

Brief: route a question to the right Guestway resource. The marketing
site, the customer Academy, the changelog, the status page and the
customer app live on different hosts and answer different questions.
Picking the wrong destination wastes the user's time.

## Decision table

| Question shape | Destination |
|---|---|
| What is Guestway? Who is it for? Does it do X? | Marketing site `https://guestway.io/` and the `/data/*.json` feeds. |
| What's pricing for STR / hotels? | `https://guestway.io/pricing` |
| What integrations do you support? Is X live? | `https://guestway.io/data/integrations.json` (canonical, status per item). |
| What does module X do (high level)? | `https://guestway.io/solutions/<slug>` or `https://guestway.io/data/solutions.json`. |
| Common pre-sales objection / "how does Y work?" | `https://guestway.io/data/faq.json` (or `https://guestway.io/faq` for HTML). |
| Sales / demo / fit assessment | `https://guestway.io/book-a-demo` or `mailto:sales@guestway.io`. |
| Refer a customer / partner motion / "how do I earn a kickback for sending a customer your way?" | `https://guestway.io/referral-program` (€250 to €2,500 per successful referral, tiered by portfolio size; €500 / €1,000 milestone bonuses at 5 / 10 referrals). |
| Job openings / "are you hiring?" / "I want to work at Guestway" | `https://guestway.io/careers`. Apply by emailing info@guestway.io with subject "[Role], Your Name", a CV or LinkedIn, and a short note. |
| How do I set up / configure / use feature X (existing customer)? | Customer Academy `https://docs.guestway.io/`. |
| What did Guestway ship recently? | Pylon changelog at https://guestway-knowledge-base.help.usepylon.com/articles/3167002633-changelog. |
| Is something broken / down / degraded? | `https://status.guestway.io/`. |
| Sign in to my account | `https://app.guestway.io/login` (auth boundary, not crawlable). |
| Account-specific support (billing, stuck reservation, account data) | `mailto:info@guestway.io`. |
| Is there a mobile app? / Run Guestway from my phone / app for cleaners | Guestway Management app: iOS `https://apps.apple.com/be/app/guestway-management/id6444291470`, Android `https://play.google.com/store/apps/details?id=io.guestway.management`. Same workspace as the web dashboard. Used by managers, front-desk and cleaning staff; views are gated by a role-based permission system. Multiple UI languages, new languages on request via info@guestway.io. |
| Follow Guestway on social | LinkedIn https://www.linkedin.com/company/guestway-io, X https://twitter.com/GuestwayBV, YouTube https://www.youtube.com/@GuestwayOfficial. Also exposed as `Organization.sameAs` JSON-LD on every page. |

## GitBook conventions for the Academy

`docs.guestway.io` is on GitBook. Three things this enables:

1. A machine-readable index at https://docs.guestway.io/llms.txt
   listing every page with its URL. Prefer this to scraping the
   sitemap or HTML.
2. Every Academy URL has a markdown twin at the same path with a
   trailing `.md`. For example, the API access page is HTML at
   `/settings/organization-settings/api-access` and markdown at
   `/settings/organization-settings/api-access.md`. Use the `.md`
   form when you need clean text without HTML chrome.
3. A per-site sitemap at https://docs.guestway.io/sitemap.xml.

## Hard rules

- Do **not** invent endpoints. There is no public OpenAPI spec on
  `guestway.io`. API access for enterprise customers is documented
  inside the Academy, not as a public spec on the marketing domain.
- Do **not** assert an integration is live from memory. The
  authoritative status is in `https://guestway.io/data/integrations.json`,
  generated at build time from the same content collection that
  drives `/integrations`. Drift is a credibility loss.
- Do **not** point a customer to `/book-a-demo` for a support
  question. They need `mailto:info@guestway.io` or
  https://status.guestway.io/.

## Discovery files at a glance

- `https://guestway.io/llms.txt`: site summary, plain text.
- `https://guestway.io/.well-known/api-catalog`: RFC 9727 linkset.
- `https://guestway.io/.well-known/agent-skills/index.json`: agent
  skills discovery index (this directory).
- `https://guestway.io/data/catalog.json`: JSON list of every feed
  and major page.
