# Testing

DFacturas is tested at three levels. Each one checks what the level below cannot.

| Level       | Command                    | What it proves                                                                  | Needs                    |
| ----------- | -------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| Unit        | `npm run test:coverage`    | Pure rules and helpers behave as specified; fails below 85% coverage            | Node only                |
| Integration | `npm run test:integration` | Permissions, business rules, concurrency and Realtime hold in the real database | Local Supabase           |
| End to end  | `npm run test:e2e`         | Screens, roles, browser security and accessibility work in a production build   | Local Supabase, Chromium |

Database invariants are also checked by `npm run db:verify`, which runs the SQL verifiers in `supabase/tests`.

## Unit tests (Vitest)

Located next to the code (`src/**/*.test.ts`, `scripts/**/*.test.mts`). They cover the invoice and scan rules (R-1, FR-3, FR-4), roles, safe error messages, date helpers, the cancel schema, the Excel workbook (ZIP integrity, invoices kept as text, XML escaping, formula neutralization), the CSP builder, the session cookie options, security events and the demo helpers.

Coverage is measured on those logic modules (`vitest.config.mts`) with an 85% threshold for lines, branches, functions and statements. UI components and data access are covered by the integration and end-to-end tests instead of mocks.

## Integration tests (Vitest against Supabase)

`tests/integration` talks to the local stack through the same API the browser uses. Each file creates throwaway accounts and a catalog with a unique suffix and deletes them afterwards; files run one after another.

| File                         | Covers                                                                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `access.test.ts`             | Closed sign-up; new identities inactive; inactive accounts rejected by RPCs; anonymous role reads nothing; OPERATIVO cannot write catalogs, raise its role, read other profiles or the audit log, or call admin functions; ADMIN changes audited with the acting user |
| `dispatch.test.ts`           | Scan → `ATENDIENDO` → `DESPACHADA` → blocked; invoice normalization; cancellation reason and blocks; route/company and carrier/plate rules; `CLIENTE RETIRA`; no direct table writes; five concurrent scans; soft-delete permissions and visibility                   |
| `admin-and-realtime.test.ts` | Last active ADMIN protected from the app and the service role; Realtime delivers inserts and updates                                                                                                                                                                  |
| `session.test.ts`            | A copied token loses access as soon as the user signs out; other sessions are unaffected                                                                                                                                                                              |
| `exports.test.ts`            | Period limit, export record contents, append-only log, OPERATIVO denied                                                                                                                                                                                               |

## End-to-end tests (Playwright + axe)

`e2e/playwright.config.mts` builds the app and serves it with `next start` on port 3100 against the local Supabase. `global-setup.mts` creates an ADMIN, an OPERATIVO and a separate account for the sign-out test, plus a catalog, and stores the sessions; `global-teardown.mts` removes everything.

| File                        | Covers                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `access.spec.mts`           | Redirects without a session, generic login error, OPERATIVO navigation and server-side denials, ADMIN pages, sign-out                                     |
| `dispatch.spec.mts`         | Two-scan flow with plate in the history, blocked third scan, client-side invoice validation, digits-only input, cancelled order and its scan block        |
| `browser-security.spec.mts` | Fresh nonce per response, nonce on every script, injected handler blocked, 12-hour `SameSite=Lax` cookie                                                  |
| `accessibility.spec.mts`    | axe (WCAG 2.1 A and AA) on login, the dispatch screen for both roles, dashboard, responsables, transportistas, configuration, audit and the cancel dialog |

To use an installed browser instead of Playwright's Chromium, set `E2E_BROWSER_CHANNEL=msedge` or `chrome`.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on `main`:

- `checks`: format, lint, types, unit tests with coverage, build.
- `supply-chain`: `npm audit --audit-level=high`, gitleaks over the full history.
- `integration`: local Supabase from an empty database, `db:verify`, `demo:setup`, integration and end-to-end tests.

## Not covered

- Load and brute-force testing.
- A hosted Supabase project (its settings are a deployment checklist in [deployment.md](deployment.md)).
- Visual regression; screenshots in the README are reviewed manually.
