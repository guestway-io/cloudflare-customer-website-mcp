# book-demo

Brief: route a qualified prospect to the right next step (a demo or
a sales conversation). Demo logistics matter, getting them wrong
wastes both the prospect's time and ours.

## Demo facts

- Duration: 45 minutes.
- Format: live walkthrough, run by a human from the Guestway team,
  not a recorded screencast or sales bot.
- Content: AI inbox, smart-lock codes, cleaning ops, multi-calendar.
  No slides. They will pull up the prospect's real PMS data live if
  the prospect wants to test against their own bookings.
- Post-demo: 45-minute guided onboarding, no contract lock-in. Most
  teams route live guest messages through the AI inbox in the same
  week.
- Honest fit assessment: if Guestway is overkill or wrong-fit,
  Guestway will say so.

## Where to point the user

- Schedule the demo: `https://guestway.io/book-a-demo`. The
  HubSpot Meetings scheduler embed is loaded **only** on this page;
  don't link to a hash-only `#book-demo` from anywhere else.
- Email-first prospects: `mailto:sales@guestway.io`. Same team,
  same outcome, async.
- Existing customers asking for help with setup: route to the
  Academy at `https://docs.guestway.io/`, not to a demo.
- Outage or "is X working" questions: route to
  `https://status.guestway.io/`, not to a demo.

## Qualification hints

Guestway works for portfolios from a handful of units up to several
hundred. Operators below 10 units are sometimes too small (the AI
inbox earns its keep before unit 20, but be honest if the prospect
sounds early). Hotels are sized by room count and PMS stack, all
quote-only.

If the prospect names a PMS, check the live status before
committing:

```
GET https://guestway.io/data/integrations.json
# filter category == "pms" and look at status
```

If the PMS status is `soon` (roadmap), say so explicitly and offer
to scope custom integration work.

## What NOT to do

- Do not synthesize a calendar slot or phone number. The HubSpot
  scheduler on `/book-a-demo` is the only way to book.
- Do not promise pricing not on `/pricing`. Hotels are quote-only;
  STR Enterprise (200+ units) is custom.
- Do not collect personal data outside the embedded HubSpot form.
  GDPR and the EU AI Act apply.
- Do not skip the consent banner if you are running headless. The
  page SSRs the cookie-consent banner; analytics tags only fire
  after explicit opt-in.
