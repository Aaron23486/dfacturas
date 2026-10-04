# Testing and Quality Gates

## Test strategy

DFacturas uses multiple verification layers rather than treating one test suite as proof of correctness.

```text
Pure domain unit tests
        +
TypeScript compiler
        +
ESLint
        +
Production dependency audit
        +
Next.js production build
        +
Database hardening verifier
        +
Manual role/workflow smoke tests
```

## Unit tests

Vitest covers infrastructure-independent domain rules.

### Auth rules — 3 tests

`src/domain/auth/auth.rules.test.ts`

- accepts only known application roles;
- reserves admin capability for `ADMIN`;
- respects the profile `active` flag.

### Invoice rules — 5 tests

`src/domain/dispatch/invoice.rules.test.ts`

- whitespace normalization;
- valid 20-digit invoice;
- empty input rejection;
- non-numeric rejection;
- invalid-length rejection.

### Scan rules — 5 tests

`src/domain/dispatch/scan.rules.test.ts`

- missing dispatch → `AVAILABLE`;
- soft-deleted dispatch → `AVAILABLE`;
- `ATENDIENDO` → in progress/second-scan path;
- `DESPACHADA` → blocked as already dispatched;
- `PEDIDO_CANCELADO` → blocked as cancelled.

Total: **13 tests**.

Run:

```bash
npm test
```

## Static/type checks

```bash
npx tsc --noEmit
npm run lint
```

TypeScript catches invalid contracts across domain/services/repositories/components; ESLint catches framework/code-quality issues configured by the project.

## Production dependency audit

```bash
npm audit --omit=dev
```

The validated pre-publication snapshot reported **0 production dependency vulnerabilities**.

This command intentionally distinguishes production/runtime dependencies from development tooling. A full audit can still surface advisories in development-only dependency chains and should be evaluated rather than blindly forcing breaking changes.

## Production build

```bash
npm run build
```

The package script intentionally uses:

```text
next build --webpack
```

A successful build validates Next.js compilation, route generation and production bundling under the project's selected build mode.

## Database security verification

After applying migration `005`, run the read-only verifier in the target Supabase SQL Editor:

```text
supabase/tests/20261004000005_security_hardening_verify.sql
```

The script raises `VERIFY_FAILED` if a required control is absent. No exception means the listed assertions completed successfully; the Supabase SQL Editor may not display the final `NOTICE` message.

## Manual smoke-test matrix

Before a public deployment, verify with separate test users:

| Scenario | Expected result |
| --- | --- |
| ADMIN login | succeeds for active admin |
| OPERATIVO login | succeeds for active operational user |
| inactive user login/session | cannot enter operational application |
| OPERATIVO dashboard | denied/disabled |
| OPERATIVO configuration | denied/disabled |
| OPERATIVO audit log | denied |
| catalog read for active user | allowed according to RLS |
| admin catalog mutation | allowed when data is valid |
| direct unauthorized mutation | rejected by DB policy/privilege/RPC |
| first invoice scan | creates `ATENDIENDO` |
| second scan of same invoice | transitions to `DESPACHADA` |
| scan dispatched invoice | blocked |
| scan cancelled invoice | blocked |
| cancel without reason | rejected |
| invalid route/company pair | rejected |
| invalid vehicle/carrier pair | rejected |
| `CLIENTE RETIRA` + vehicle | rejected |
| soft-deleted dispatch as OPERATIVO | not visible |

## What is not claimed

The current repository does **not** claim full end-to-end browser automation or exhaustive database policy testing in CI. The SQL verifier covers selected hardening invariants; manual Supabase environment verification is still part of the release gate.

A future improvement would add isolated integration tests against a disposable test database and browser E2E tests for the critical login/scan/admin flows.

## Release gate

A publishable release should pass, in order:

```bash
npm test
npx tsc --noEmit
npm run lint
npm audit --omit=dev
npm run build
git diff --check
```

Then inspect `git status`, confirm `.env.local`/backups/temp files are not tracked, and run the database verifier in the target environment after applying the latest migration.
