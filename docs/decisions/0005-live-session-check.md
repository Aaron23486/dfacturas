# 0005 — Authorization helpers require a live Auth session

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

PostgREST and Realtime accept a JWT until it expires (60 minutes). After a user signed out, a copied access token kept reading and writing dispatches for up to an hour.

## Decision

`has_live_session()` checks that the token's `session_id` still exists in `auth.sessions` and has not passed `not_after`. `is_active_user()` and `current_user_role()` require it, and every RLS policy and RPC builds on those two helpers, so revocation applies everywhere at once (migration 008).

## Consequences

- Sign-out, a session timeout or an administrator removing sessions cuts database access immediately (integration test `session.test.ts`).
- Each authorization check reads `auth.sessions` by primary key; the cost is negligible at this scale.
