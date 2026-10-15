# HIIKKY Super Admin Backend Feature Tracker

This tracker is based on the current Admin API schema and implementation. “Blocked” means no endpoint or speculative substitute should be shipped until required business rules/data ownership are supplied.

## Implemented

| Feature | Status | Operations / constraints | Automated coverage |
| --- | --- | --- | --- |
| Authentication | DONE | Session login, session-ID rotation, authenticated identity, logout/session invalidation | H2 integration: login, invalid credentials, session fixation, post-logout 401 |
| Profile | DONE | Safe profile read; current-password-protected email/password changes; no role/status changes | H2 integration: safe response, incorrect password, update email/password, relogin |
| Dashboard | DONE | Live owner/org/admin counts and status splits; date-filtered registrations; bounded paginated recent activity | Dashboard MVC tests; H2 dashboard totals/date/empty activity |
| Platform analytics | DONE | Registration/latest-update aggregates by day/week/month with paired inclusive dates; database-session timezone | H2 monthly grouping, date totals, empty-range behavior |
| Business Owners | DONE | Super Admin list/search/status/org filters, sort/page/count, details/orgs, create/edit/status/delete | MVC authorization/validation/duplicates/status; H2 lifecycle, organization filter/sort |
| Organizations | DONE | Admin/Super Admin list/details/create/edit/status/delete and owner relationship operations | MVC contract tests; H2 CRUD/relationship lifecycle |
| Admin accounts | DONE | Super Admin CRUD/list/search/filter/page/status with last-active-Super-Admin protection | MVC tests; H2 account lifecycle/protection |
| API error contract | DONE | Standard wrapper, field-level validation errors, typed parameter errors | MVC validation/error assertions |

### Dashboard and analytics source map

* `business_owners`: owner total/status, owner registration (`created_at`), latest update (`updated_at > created_at`).
* `organizations`: organization total/status, organization creation (`created_at`), latest update (`updated_at > created_at`).
* `admin_accounts`: admin total/enabled/disabled, registration and latest update for activity/analytics.
* Dashboard summarizes current totals regardless of date filter; range only affects period counters and recent activity.
* Analytics aggregates each table separately by date and event category before application grouping; no multi-table join. `DAY`, Monday-starting `WEEK`, and `MONTH` buckets. Dates are interpreted in database-session timezone. Empty analytics has zero summary and no synthetic periods.
* Recent activity is only latest timestamps on current records, not history or actor-aware auditing. It is paginated (default 20, max 100).

## Blocked pending product/schema decisions

| Module | Status | Verified blocker | Required before implementation |
| --- | --- | --- | --- |
| Business Requests | BLOCKED | No request table, registration-intake API, request status, or decision flow in the Admin schema/code | Submission source and fields, duplicate key, states/transitions, approval/rejection effects, rejection reason rules, assignment/notifications, history/audit needs |
| Platform Revenue | BLOCKED | Admin schema has no platform transaction/settlement ledger, fee/commission rules, or platform recognition source. Owner-console billing is organization invoicing and cannot be assumed to be HIIKKY revenue. | Revenue recognition policy, trusted platform transaction source, successful/failed/refund/fee semantics, currency/timezone, and access requirements |
| Support Center | BLOCKED | No support ticket, thread/message, assignee, status, or history structure | Ticket intake/identity scope, tenant visibility, lifecycle, assignment/replies, timestamps, permissions, retention/audit |
| Admin Notifications | BLOCKED | Legacy code references `notification`/`billing_notifications`, but no DDL/migration is present. Generic DAO has recipient type/status without authenticated Admin recipient ownership or defined read-state semantics; billing notifications are tenant records. | Admin event sources, recipient ownership/visibility, read/unread state definition, bulk operation policy, retention, schema |
| Admin Reports / Export | BLOCKED | No Admin report requirements or platform-specific source data beyond existing dashboard/analytics; legacy reports are organization-owner billing/student/course reports. | Named reports, consumers/purpose, data source, date/filter/aggregation/pagination, authorization, export formats |
| Admin Settings | BLOCKED | No Admin setting model or product-defined safe editable values. Server configuration is deployment-managed. | Named settings, allowed values, persistence, effect timing, authorization, audit requirements |

The report/runtime schema inventory is in `hiikky-admin-backend/hiikky-admin-backend/src/main/resources/schema.sql`; currently it creates only `admin_accounts`, `business_owners`, and `organizations`. Do not treat the owner-console `ACTIVE`/`INACTIVE` account status as a Business Request approval state.

## Frontend action mapping

No Admin frontend implementation is present. Future UI should use existing APIs as follows:

| Admin page/control | API required | UI-only interaction |
| --- | --- | --- |
| Dashboard refresh/date range/activity pagination | `GET /api/admin/dashboard` | Trigger query refresh; present empty states and pagination |
| Analytics time grouping/date window | `GET /api/admin/analytics/registrations` | Render chart and change selector |
| Owner search/status/org filter/sort/page | `GET /api/admin/business-owners` | Control state/query updates |
| Owner details | Owner GET routes | Expand/collapse panels |
| Owner create/edit/status/delete | Owner POST/PUT/PATCH/DELETE | Input state and confirmation modal; API enforces operation |
| Organization search/status/owner filter/page/details/edit/status/assignment | Organization routes | Table and modal behavior |
| Admin accounts search/enabled/role filter/page/details/create/edit/status/delete | Account routes | Table and confirmation behavior; surface last-Super-Admin rejection |
| Profile | Profile GET/PATCH | Credential field handling and display |
| Login/logout | Auth POST routes | Navigation and local authenticated state |

Do not add request approval, revenue cards, support queues, notification controls, report exports, or settings controls until their modules are unblocked.

## Validation run for the current implementation

* `mvnw.cmd test` from `hiikky-admin-backend/hiikky-admin-backend`: 54 tests passed; H2 profile.
* `git diff --check`: passed before commit `57fde4e`.
* Pushed commit: `57fde4ebabf61eca93fdc9bb1b757fde654657cb` to `origin/main`.

Documentation-specific status and future changes should be updated alongside the feature's tests and implementation.
