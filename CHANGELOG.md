# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.1] - 2026-10-29

### Changed

- The dispatch screen and history table are split into domain modules (`workspace`, `history`), a history hook and presentational components, with unit tests for the extracted rules.

### Security

- Passwords can only be changed from the terminal (`users -- reset-password`): the database rejects changes made with a session or through the Auth admin API, and a reset closes the account's open sessions (migration 010).

## [1.0.0] - 2026-10-29

### Added

- Local Supabase stack with `db:up`, `db:down`, `db:reset`, `db:status`, `db:verify` and `env:local`.
- `demo:setup` with one account per role, generated passwords and fictional data; `users` and `create-admin` for account management from the terminal.
- Live dispatch history on a fresh database (migration 006 adds `despachos` to the Realtime publication).
- Database guard that keeps at least one active administrator (migration 007).
- Security events for failed and denied logins and denied admin access.
- Append-only `dashboard_exports` log (migration 009).
- Integration tests against the database, end-to-end tests with accessibility checks, an 85% unit coverage gate and a CI workflow with `checks`, `supply-chain` and `integration` jobs; Dependabot.
- Requirements, architecture decisions, security and testing documentation; MIT license and security policy.

### Changed

- Per-request nonce Content Security Policy without inline scripts; HSTS in production.
- Session cookie limited to 12 hours, `SameSite=Lax` and `Secure` in production; Auth sessions end after 12 hours or 4 hours idle.
- Authorization helpers require a live Auth session, so signing out revokes database access immediately (migration 008).
- Excel exports are limited to one year.
- The dispatch screen and cancel dialog use the tested invoice and scan rules from `src/domain`.
- Form labels are linked to their fields, secondary text contrast meets WCAG AA and the audit page follows the dark theme.
- Code formatted with Prettier; comments in Spanish.
- Dependencies updated within their major versions: React 19.3, Base UI 1.9, supabase-js 2.118, lucide-react 1.61, Vitest 5.0.5.

### Removed

- Unused modules, UI primitives and packages (`cmdk`, `date-fns`, Testing Library, jsdom).
- Template images from `public/` and the Spanish copy of the README.

### Security

- Upgraded `next` to 16.4.3 and `zod` to 4.6.7 to fix published advisories.

## [0.1.0] - 2026-10-05

### Added

- Invoice dispatch application: two-scan flow, cancellations, corrections and soft deletion; dashboard with Excel export; catalogs for responsible staff, carriers, companies and routes; audit log.
- PostgreSQL schema with RLS, dispatch RPCs and security hardening (migrations 001–005).

[Unreleased]: https://github.com/Aaron23486/dfacturas/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Aaron23486/dfacturas/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Aaron23486/dfacturas/compare/d6813ff...v1.0.0
[0.1.0]: https://github.com/Aaron23486/dfacturas/tree/d6813ff
