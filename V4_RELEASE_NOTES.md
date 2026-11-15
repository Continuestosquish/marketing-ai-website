# Marketing AI Studio v4 — implementation

## Implemented in this branch

- Marketing tactic library: all 120 entries remain searchable/filterable/savable; each rendered tactic has a **Use in campaign** action.
- Selected tactics persist in this browser's localStorage and directly influence the generated campaign blueprint (up to five).
- Campaign Builder: rule-based, audience/industry/objective/duration/budget-aware strategy; three creative angles; channels; measurement; roadmap; copy and export. No external AI API calls.
- **Marketing Health Audit**: eight self-reported questions, 0–100 readiness score, four prioritized recommendations and text export. This is not automated website inspection.
- Pricing *preview*: Starter $9/mo (3 campaigns), Pro $29/mo (30), Super Pro Plus $79/mo (150). Prices and quota are **unapproved proposals**, not purchases or active subscriptions.
- No user accounts or Stripe payments are active. The site is free to test while in preview mode.

## Critical security boundary

GitHub Pages serves static public JavaScript: it **cannot reliably enforce subscription access or monthly limits**. Do NOT enable actual payments for these proposed tiers until all of the following are implemented in a server-side runtime:

1. Authentication provider with verified user identity; never store API keys in GitHub Pages.
2. Stripe Checkout / Billing subscriptions, with webhook signature verification and subscription status synchronization.
3. Server-side campaign generation; do not ship paid-only generation logic to the browser.
4. Atomic per-account monthly campaign quota counters, checked before fulfillment.
5. Secure database for plans, entitlements, campaign records, billing customer IDs and audit log.
6. Customer-facing terms, recurring billing price, cancellation and refund guidance, privacy statement, tax handling and support contact.
7. Test mode payment scenarios: success, failed payment, duplicate webhooks, retries, cancel, renewal, expiration and quota edge cases.
8. No premium outputs unlock on simple redirect, localStorage flag or query parameter.

Suggested stack: GitHub Pages frontend + Cloudflare Worker API + D1 or another managed database + Stripe Billing + managed authentication. Existing experimental one-off Stripe checkout branch is separate and should not be merged without reconciling product/billing designs.

## QA checklist

- Verify GitHub Pages CSS and JS asset loading.
- Search and category filtering across all 120 tactics.
- Select five tactics; sixth should be blocked; remove chip.
- Generate a campaign with and without tactics.
- Copy and download campaign; check that entered special characters do not inject HTML.
- Audit with eight responses; change values and verify score/priority order; download audit.
- Test mobile navigation and three plan cards.
- Confirm plan buttons do NOT charge or activate an account.
- Review browser console, responsive design and keyboard navigation.

## Source of truth

This document is a development preview, not a production-ready paid SaaS. Actual charges and access restrictions require server-side work and merchant approval.
