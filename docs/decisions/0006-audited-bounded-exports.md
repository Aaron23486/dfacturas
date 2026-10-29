# 0006 — Audited and bounded dashboard exports

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

The Excel export returned every matching dispatch for any date range and left no record of who downloaded the data.

## Decision

The query became an internal function. The public `admin_dashboard_export_rows` keeps its signature, rejects periods over 366 days and writes who exported, the period, the filters and the row count to `dashboard_exports` before returning rows. The table is readable only by administrators and a trigger rejects updates and deletes, even with the service role. `exported_by` has no foreign key so records survive account deletion, like `audit_logs.changed_by`.

## Consequences

- Bulk extraction is limited to a year per request and is always traceable.
- The workbook is built in the browser by `buildDashboardWorkbook` (a stored ZIP with inline-string cells), which escapes XML and neutralizes text that a spreadsheet could read as a formula.
