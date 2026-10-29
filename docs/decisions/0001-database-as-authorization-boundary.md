# 0001 — The database is the authorization boundary

- **Status:** Accepted
- **Date:** recorded 2026-10-29; in place since the initial version

## Context

The dispatch screen talks to Supabase from the browser, so any rule enforced only in React can be bypassed by calling PostgREST directly with a valid session.

## Decision

I put authorization and business rules in PostgreSQL. Every table has RLS; clients get `SELECT` where needed and no direct writes on dispatches, carriers or plates. State changes go through `SECURITY DEFINER` functions with a fixed `search_path` that check the session, the profile, the role and the current state (`scan_dispatch`, `cancel_dispatch`, `compat_*`, `admin_*`). Constraints and triggers repeat the invariants (R-1 to R-7) so they hold even for service-role writes. Server components still guard pages with `requireProfile` and `requireAdmin` for a clean experience.

## Consequences

- A compromised or modified client cannot skip a rule; integration tests call the API directly to prove it.
- Rules live in SQL, so they are tested against a real database (`tests/integration`) rather than with mocks.
- Error codes raised by the database are translated to safe messages in `src/lib/errors/safe-error.ts`.
