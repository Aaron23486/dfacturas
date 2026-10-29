# Security

This document lists the controls in place, how they are verified and the risks that remain. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

## Threat model in brief

The browser is untrusted: it holds the user's session and talks to Supabase directly, so anything it sends can be forged. The database therefore enforces every permission and rule ([ADR 0001](decisions/0001-database-as-authorization-boundary.md)). The main browser-side risk is script injection, because the session cookie is readable by JavaScript ([ADR 0002](decisions/0002-browser-client-and-readable-session-cookie.md)).

## Authentication and sessions

| Control                                                                                                               | Where                                | Verified by                     |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------- |
| Email and password through Supabase Auth; no public sign-up, no anonymous sign-in                                     | `supabase/config.toml`               | Integration (`access.test.ts`)  |
| New identities are inactive `OPERATIVO` profiles; roles never come from metadata                                      | `handle_new_user()`                  | Integration                     |
| Inactive or profile-less accounts are signed out with a generic message                                               | `src/app/login/actions.ts`           | E2E, integration                |
| Session cookie: 12 h, `SameSite=Lax`, `Secure` in production                                                          | `src/lib/supabase/cookie-options.ts` | Unit, E2E                       |
| Auth session: 12 h maximum, 4 h idle; `secure_password_change`                                                        | `config.toml`                        | Configuration                   |
| Sign-out revokes database access immediately                                                                          | `has_live_session()` (migration 008) | Integration (`session.test.ts`) |
| Terminal-created passwords: 12+ characters with letters and digits; demo passwords from `crypto.randomInt` (~93 bits) | `scripts/lib/passwords.mts`          | Unit                            |

## Authorization

| Control                                                                                                 | Where                                          | Verified by           |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------- |
| RLS on every table; `anon` has no table privileges                                                      | migrations 002, 005                            | Integration           |
| Dispatch, carrier and plate writes only through RPCs                                                    | migrations 003–005                             | Integration           |
| RPCs are `SECURITY DEFINER` with a fixed `search_path` and check session, profile, role and state       | migrations 003–005, 008                        | Integration           |
| Admin pages guarded on the server                                                                       | `requireAdmin()`                               | E2E                   |
| Soft-deleted dispatches hidden from operators                                                           | RLS `despachos_select`                         | Integration           |
| At least one active `ADMIN` always remains                                                              | trigger `keep_an_active_admin` (migration 007) | Integration, terminal |
| Internal helpers (`validate_dispatch_context`, `dashboard_export_rows_query`) not executable by clients | grants                                         | Integration           |

## Input, output and integrity

- Invoice format, uniqueness, relationships, state timestamps and text limits are database constraints and triggers (R-1 to R-7); concurrent scans are serialized per invoice. Five simultaneous scans leave exactly one dispatch (integration).
- Zod validates input at the service boundary; the database repeats every security-relevant check.
- Errors shown to users are mapped to fixed Spanish messages (`safe-error.ts`); SQL text never reaches the UI.
- The Excel export writes every value as an inline string, escapes XML and prefixes text starting with `=`, `+`, `@` or a dash followed by a non-digit (unit tests).
- Sensitive table changes are recorded in `audit_logs` by trigger, with the acting user; exports are recorded in the append-only `dashboard_exports`.

## Browser hardening

- Per-request nonce CSP with `'strict-dynamic'` and no inline scripts; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` ([ADR 0004](decisions/0004-per-request-nonce-csp.md)). An end-to-end test confirms that an injected handler does not run.
- `Strict-Transport-Security` (production), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; no `X-Powered-By`.
- Server Actions reject requests from another origin (Next.js CSRF protection, checked manually).

## Logging

`src/lib/security/events.ts` writes one JSON line per security event (`login.failed`, `login.denied_inactive`, `login.denied_without_profile`, `admin.access_denied`) to stderr, with the user id or a SHA-256 fingerprint of the email, never the address, password or token.

## Secrets and supply chain

- Only the Supabase URL and publishable key reach the browser (`NEXT_PUBLIC_*`). The secret key is read from `supabase status` by the terminal scripts and never written to `.env.local`.
- `.env*` (except `.env.example`), Supabase local state and test artifacts are ignored by Git.
- CI runs `npm audit --audit-level=high` and gitleaks over the full history; dependencies are pinned and updated through Dependabot pull requests that pass CI.

## Residual risks and accepted limitations

| Risk                                                                                                                                           | Mitigation                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The session cookie is readable by JavaScript (browser client design).                                                                          | Nonce CSP, 12 h lifetime, immediate revocation.                                               |
| A valid session can change its own password through the Auth API without the current one (Supabase asks for reauthentication only after 24 h). | Short sessions, revocation, CSP; recovery and resets are terminal tasks.                      |
| Login throttling relies on Supabase Auth's per-IP limits (`sign_in_sign_ups`, 30 per 5 minutes locally); the app adds none.                    | Enable CAPTCHA on the hosted project if it is exposed publicly.                               |
| The Auth recovery and magic-link endpoints are enabled but unused by the UI.                                                                   | Keep email rate limits low; customize or disable those templates on a hosted project.         |
| Authenticated users can read the PostgREST OpenAPI description (function names).                                                               | No secrets in it; disable `pg_graphql` on hosted projects if unused.                          |
| The local Supabase publishes PostgreSQL, Studio and Mailpit on all interfaces.                                                                 | Development only: use trusted networks and stop it with `npm run db:down`.                    |
| An operator can soft-delete any dispatch still in `ATENDIENDO` without giving a reason (an automatic reason is stored).                        | Business rule kept as designed; the author and time are recorded in the row and `audit_logs`. |

No review guarantees the absence of vulnerabilities; these controls reduce risk and are covered by the tests listed in [testing.md](testing.md).
