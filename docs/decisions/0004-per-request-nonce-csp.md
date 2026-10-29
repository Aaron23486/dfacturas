# 0004 — Per-request nonce Content Security Policy

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

The original CSP was static and allowed `'unsafe-inline'` scripts, so it offered no protection against injected script, which matters more here because the session cookie is readable by JavaScript ([0002](0002-browser-client-and-readable-session-cookie.md)).

## Decision

`src/proxy.ts` builds the policy for every request with a fresh nonce and `'strict-dynamic'` (`src/lib/security/csp.ts`) and passes it on the request headers so Next.js tags its own scripts. The root layout awaits `connection()` so every route, including the 404 page, renders per request. `connect-src` follows `NEXT_PUBLIC_SUPABASE_URL` (http/ws for the local stack). Styles keep `'unsafe-inline'` because the UI and charts use `style` attributes, which nonces do not cover. Production builds also send HSTS.

## Consequences

- An injected inline script or event handler does not run (covered by an end-to-end test).
- No page is statically prerendered; all authenticated pages were dynamic already.
- Any future third-party script must be loaded through Next.js so it receives the nonce. If a future Next.js version makes static prerendering mandatory, this decision has to be revisited.
