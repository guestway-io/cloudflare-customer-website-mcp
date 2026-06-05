# sales-faq

Brief: handle pre-sales objections without hallucinating. Guestway's
canonical FAQ surface is `https://guestway.io/faq` with FAQPage
JSON-LD; the same content is available as JSON at
`https://guestway.io/data/faq.json`. **Never guess. Cite the feed.**

## Workflow

1. Classify the question into one of the 14 FAQ categories below.
2. Fetch `https://guestway.io/data/faq.json` (or scope to a single
   category if you already know which one). The shape is:
   ```json
   {
     "categories": [
       {
         "slug": "pricing",
         "title": "Pricing",
         "items": [{ "q": "...", "a": "..." }]
       }
     ]
   }
   ```
3. Match by category, then by question text. If no match, route to
   `https://guestway.io/book-a-demo` or `mailto:sales@guestway.io`
   rather than improvising an answer.
4. Cite the source URL in the response so the user can verify.

## Category routing

- general: positioning, efficiency metrics, multilingual support,
  high-level integration coverage.
- pricing: STR vs hotel pricing model, what's included, "am I too
  small", setup duration.
- demo-and-onboarding: demo format, who runs it, length, post-demo
  path, email-only contact.
- integrations: category-level fit, setup duration. For *which
  brands are live*, prefer `/data/integrations.json` (the FAQ
  category answers shape, not specific brand status).
- referral-program: partner rewards, payout tiers, milestone
  bonuses.
- ai-inbox: channels, AI replies, languages.
- review-center: review aggregation, sentiment, AI-drafted
  responses.
- guest-app: branded portal, pre-check-in flow, redirect option.
- automations: event triggers, common recipes.
- multi-calendar: PMS / OTA sync, conflict handling.
- cleaning-management: cleaner dispatch, photo proof.
- access-management: smart-lock brands, unified code, audit trail.
- climate-control: occupancy-based HVAC, supported thermostats.
- ai-operations-center: proactive issue detection (early access).

## Top objections (verbatim from the feed)

These come up in roughly this order during a sales conversation. Use
them when an agent only has a few tokens to spend:

1. What exactly is Guestway? (general)
2. Do I need to switch my PMS? (pricing). Answer: no.
3. I'm only managing 10 to 20 units. Am I too small? (pricing).
   Answer: no.
4. How is hotel pricing calculated? (pricing). Answer: tailored
   quote, no public per-room tiers.
5. Which integrations are included in my subscription? (pricing).
   Answer: PMS included; smart devices priced per device.
6. How long does integration setup take? (pricing). Answer:
   minutes for most; one business day for complex multi-property.
7. How long is the demo? (demo-and-onboarding). Answer: 45 minutes.
8. What happens if I sign up after the demo? (demo-and-onboarding).
   Answer: 45-minute guided onboarding, no lock-in.
9. Does Guestway integrate with my current tech stack? (general).
   Answer: yes, but check `/data/integrations.json` for *specific
   brand status*. Don't assert a brand is live from memory.
10. How does Guestway make my team more efficient? (general).
    Answer: 70% of messages handled by AI, 95% contact-free
    check-ins, ~20 hours saved per week.

## Hard rules

- The `/faq` page emits the canonical FAQPage JSON-LD. Solution
  pages render the same Q&As contextually but suppress the schema
  to avoid duplicate-content signals across the site. Cite `/faq`
  as the source, not the per-product page.
- Pricing answers must cite `/pricing` tiers, not memory. STR is
  €10/listing/month at Starter (1 to 50 units) and €8/listing/month
  at Growth (51 to 200 units); 200+ is custom. Hotels are
  quote-only.
- Integration answers must cite `/data/integrations.json`. The feed
  is sorted live, then early, then soon, then by `order`, then by
  name.
- Homepage FAQPage mirrors only the top 6 sales-critical questions.
  For everything else, fetch `/data/faq.json`.
