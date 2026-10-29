# Requirements

This document describes what DFacturas does today. Identifiers are stable so code, tests and decisions can refer to them.

## Context

A distribution center hands invoiced orders to carriers. Each invoice is scanned when the order starts being prepared and scanned again when it leaves. Operators need a fast, scanner-friendly screen; administrators need catalogs, analytics and a trace of changes.

## Actors

| Role        | Description                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPERATIVO` | Scans invoices, registers cancelled orders, corrects in-progress dispatches and maintains carriers.                                                         |
| `ADMIN`     | Everything an operator does, plus analytics and export, company/route configuration, responsible staff, corrections of closed dispatches and the audit log. |

Accounts are provisioned from the terminal; there is no public sign-up.

## Functional requirements

| ID    | Requirement                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | Users sign in with email and password. Accounts without a profile or with an inactive profile are rejected with a generic message.                                              |
| FR-2  | Every page except `/login` requires a session; admin pages require the `ADMIN` role, checked on the server.                                                                     |
| FR-3  | Scanning an invoice that has no active dispatch creates one in `ATENDIENDO` with the selected responsible person, company, route, carrier and plate.                            |
| FR-4  | Scanning an invoice in `ATENDIENDO` closes it as `DESPACHADA`; scanning a `DESPACHADA` or `PEDIDO_CANCELADO` invoice is blocked with an explanation.                            |
| FR-5  | A cancelled order is registered with a mandatory reason, either for a new invoice or for one in `ATENDIENDO`.                                                                   |
| FR-6  | The dispatch screen shows the latest 300 dispatches and updates them in real time when any user scans, cancels or corrects.                                                     |
| FR-7  | Operators can correct the context of dispatches in `ATENDIENDO` and the detail of dispatched ones; administrators can correct any active dispatch.                              |
| FR-8  | Dispatches are never physically deleted from the app: removal is a soft delete with author and reason; soft-deleted rows are hidden from operators.                             |
| FR-9  | Administrators see a dashboard with KPIs, distribution by company, status, responsible person and route, average time per route and a six-month comparison, with cross-filters. |
| FR-10 | Administrators export the filtered dispatches of a period of up to one year to Excel; every export is recorded.                                                                 |
| FR-11 | Administrators manage companies, their numbered routes, responsible staff and existing carriers; any user can add a carrier with its plate from the dispatch screen.            |
| FR-12 | Administrators can read the latest changes to sensitive tables (audit log).                                                                                                     |
| FR-13 | Accounts are created, activated, deactivated, re-roled and have their password reset from the terminal (`npm run users`).                                                       |
| FR-14 | `npm run demo:setup` prepares a local evaluation with one account per role, generated passwords and fictional data.                                                             |

## Business rules

| ID   | Rule                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1  | An invoice number has exactly 20 digits; spaces are ignored and anything else is rejected.                                                                       |
| R-2  | Only one active (not soft-deleted) dispatch may exist per invoice, including under concurrent scans.                                                             |
| R-3  | A route requires its company, and must belong to it.                                                                                                             |
| R-4  | A plate requires its carrier, and must belong to it; a regular carrier needs an active plate.                                                                    |
| R-5  | `CLIENTE RETIRA` (customer pickup) is a single special carrier that never has a plate.                                                                           |
| R-6  | `ATENDIENDO` has a start time only; `DESPACHADA` has start and end; `PEDIDO_CANCELADO` has a cancellation time and a reason. Times come from the database clock. |
| R-7  | Free-text detail and deletion reasons are limited to 1,000 characters.                                                                                           |
| R-8  | New Auth identities start as inactive `OPERATIVO` profiles; roles never come from client metadata.                                                               |
| R-9  | At least one active `ADMIN` must always exist.                                                                                                                   |
| R-10 | An operator may soft-delete only dispatches in `ATENDIENDO`; closed dispatches require an administrator and a reason.                                            |
| R-11 | Passwords are set only from the terminal; signed-in sessions cannot change them, and a reset closes the account's sessions.                                      |

## Non-functional requirements

| ID    | Requirement                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| NFR-1 | Authorization is enforced by PostgreSQL (RLS, grants and RPC checks), not by the UI.                                    |
| NFR-2 | Errors shown to users never include SQL or internal details.                                                            |
| NFR-3 | Sessions last at most 12 hours (4 hours idle) and stop working against the database as soon as the user signs out.      |
| NFR-4 | Responses carry a per-request nonce CSP without inline scripts, plus the usual hardening headers.                       |
| NFR-5 | Security events (failed and denied logins, denied admin access) are logged without personal data in clear text.         |
| NFR-6 | Every screen passes automated WCAG 2.1 A/AA checks.                                                                     |
| NFR-7 | The project runs locally against its own Supabase stack with documented commands and no shared or hosted services.      |
| NFR-8 | Unit tests keep at least 85% coverage of the logic modules; integration and end-to-end tests run in CI on every change. |
