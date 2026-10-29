# 0002 — Keep the browser Supabase client; bound the readable session cookie

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

The dispatch workspace, catalogs and dashboard query Supabase, call RPCs and subscribe to Realtime from the browser. `@supabase/ssr` keeps the session in a cookie the browser client must read, so it cannot be `HttpOnly`, and by default it lives 400 days. A security review flagged that any XSS could read that cookie and keep the session.

## Decision

I kept the browser client instead of moving every query and the Realtime feed behind server routes, which would have meant rewriting most of the UI. Instead I reduced what a stolen cookie is worth:

- the cookie lives 12 hours (`withSessionLifetime` replaces the library's fixed 400-day `maxAge`), is `SameSite=Lax` and `Secure` in production;
- Auth sessions end after 12 hours or 4 hours of inactivity;
- signing out revokes database access immediately ([0005](0005-live-session-check.md));
- a per-request nonce CSP blocks injected inline scripts ([0004](0004-per-request-nonce-csp.md)).

## Consequences

- JavaScript running in the page can still read the session; the CSP is the main barrier against that.
- A stolen session cannot change the account's password: since migration 010 the database rejects every password change that does not come from the terminal function, which also closes the account's sessions.
- Moving data access to the server remains an option if the application grows.
