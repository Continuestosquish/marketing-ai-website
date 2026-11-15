# Paid Campaign Checkout — Setup

This branch implements a **proposed $9 USD one-time charge per generated campaign blueprint** using Stripe Checkout. The price is a placeholder that you must approve before launch.

## Architecture

- GitHub Pages hosts the public website (no sensitive keys).
- Cloudflare Worker (file: payments/worker.js) handles Checkout and verifies Stripe payment status.
- Cloudflare D1 stores each campaign brief and generated result by Stripe session ID.
- Checkout success URL passes the Stripe session ID back to the browser; it is not treated as proof of payment.
- The backend checks session payment_status=paid and matches checkout amount, currency, draft_id, and mode.
- The same checkout session always returns the same brief: **one purchase, one campaign**.
- This is still a **rule-based blueprint**, not a paid generative AI model. Do not advertise it as AI-generated.

## Required manual steps — do not share secrets in GitHub/chat

1. Create a Stripe account, complete payment activation, and obtain a *test-mode* secret key.
2. In Cloudflare Workers, create a Worker using payments/worker.js and a D1 database named marketing-ai-payments.
3. Run payments/schema.sql against D1.
4. Add D1 binding named DB to the Worker.
5. Set Worker environment variables:
   SITE_URL=https://tranwrecks.com
   ALLOWED_ORIGIN=https://tranwrecks.com
   PRICE_CENTS=900
6. Add Stripe secret key to Worker secrets, named STRIPE_SECRET_KEY (never place it in GitHub).
7. Copy your Worker URL and set window.MARKETING_PAYMENT_API in index.html.
8. Test in Stripe test mode: successful payment, declined payment, refresh after payment, wrong session, and mobile layout.
9. Switch to Stripe live secret key only after approving the price and confirming tax/refund/disclosure policy.
10. Merge this branch into main after testing.

Costs: GitHub Pages can host the static site for free, while payment processing has transaction fees. Cloudflare Worker/D1 free tiers have limits.

### Important
A simple redirect to a Stripe payment link cannot securely protect a JavaScript-only campaign generator. Campaign output must be generated on the server after payment verification.

This solution does not include user accounts, subscription billing, taxes, refunds automation, AI text generation, or a live production deployment.
