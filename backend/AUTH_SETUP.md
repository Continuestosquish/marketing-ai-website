# Tranwrecks Studio — activating real accounts

The public site is hosted as static files on GitHub Pages. **GitHub Pages cannot securely store passwords, issue sessions, or verify paid memberships.** The login and account screens are present, but sign-in remains disabled until the Cloudflare Worker is deployed.

## Backend setup checklist
1. In Cloudflare, create a D1 database named `tranwrecks-members`.
2. In `backend/wrangler.toml`, uncomment `[[d1_databases]]`, configure `binding = "DB"` and copy the real D1 `database_id`.
3. From the `backend/` directory (with Wrangler installed and authenticated), apply `schema.sql` to your database, for example `npx wrangler d1 execute tranwrecks-members --remote --file=schema.sql`.
4. Set an unpredictable, server-side secret via `npx wrangler secret put AUTH_PEPPER` (do not commit it). Set `SITE_ORIGIN = "https://tranwrecks.com"` in `wrangler.toml`.
5. Deploy with `npx wrangler deploy` and configure a Cloudflare Worker custom domain such as `https://api.tranwrecks.com`, with HTTPS. Test `/api/health`.
6. **Only after the API works**, edit the public `auth-config.js` to `window.TRANWRECKS_API_BASE = 'https://api.tranwrecks.com';`. The URL must match the real deployed Worker exactly.
7. Test registration, login, session persistence across reloads, logout, lockout after failed attempts, and `/api/me` from the actual website origin. Do not use a client-side pretend login or place authentication secrets in this repo.

## Security and launch requirements
- Require HTTPS. The Worker uses HTTP-only, Secure, SameSite=Lax cookies and password derivation on the server. Test cross-subdomain cookies and CORS from the live `tranwrecks.com` origin.
- Add email ownership verification, password reset/recovery, abuse prevention and rate limits (Cloudflare WAF or equivalent), data retention/privacy policy, and operational monitoring **before inviting real customers**. These workflows are not implemented in the current draft.
- A logged-in user is **not** a paying customer. Membership must be checked on the server via Stripe webhooks and an authoritative database.
- The full tools currently live in client-side static pages. The blur overlays are **not security boundaries**. Actual paid-only features or protected campaign usage require server-side gates, not merely visual locks.
- Stripe remains disabled. After configuring price IDs and Stripe secrets on the Worker, test webhook signature verification, paid status, cancellation, renewal, and all 3 plan entitlements in test mode before setting `BILLING_ENABLED = "true"`.
- Current monthly campaign allowances: Starter 3; Pro 10; Super Pro Plus unlimited. The entitlement API represents unlimited as `null` and `unlimited_campaigns: true`.

## Useful pages
- Public sign-in / registration: `/login.html` or `/login.html?mode=register`
- Account status / logout: `/account.html`
- Membership selection: `/checkout.html`
- Server endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/me`, `/api/entitlement`

Do not accept real customer credentials or payments until the backend and production security checklist are completed.
