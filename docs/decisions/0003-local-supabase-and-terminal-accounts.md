# 0003 — Local Supabase stack and terminal account management

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

The project originally required a hosted Supabase project and hand-written SQL to activate users. The migrations had never been applied to an empty database, and an evaluator could not run the app without the author's setup.

## Decision

I run the database with the Supabase CLI (pinned as a dev dependency) on its own ports (553xx). `npm run env:local` writes `.env.local` from `supabase status`, so keys are never copied by hand. Because the app has no sign-up and no user-management screen, accounts are managed from the terminal (`npm run users`, `npm run create-admin`) with the secret key that only the CLI holds, and `npm run demo:setup` creates one account per role with generated passwords and fictional data. A trigger keeps at least one active `ADMIN` (R-9) whichever path changes a profile.

## Consequences

- Clone → `npm ci` → `db:up` → `env:local` → `demo:setup` → `dev` works without any external account; CI runs the same stack.
- Docker is required locally.
- Password recovery is a terminal task (`users -- reset-password`); the Auth recovery and magic-link endpoints are not used by the UI.
