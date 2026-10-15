# HIIKKY Super Admin Backend Feature Tracker

This tracker is based on the current Admin API schema and implementation. “Blocked” means no endpoint or speculative substitute should be shipped until required business rules/data ownership are supplied.

## Implemented

| Feature | Status | Operations / constraints | Automated coverage |
| --- | --- | --- | --- |
| Authentication and session security | PARTIALLY IMPLEMENTED | Session login/logout, session-ID rotation, CSRF token bootstrap/enforcement, 10 failed logins per remote address per 15 minutes; limiter is per-process and account lockout is intentionally absent | H2: token bootstrap/rotation, missing-token rejection, logout invalidation, auth failures and IP throttle; unit test for limiter reset/expiry |
| Profile | DONE | Safe profile read; current-password-protected email/password changes; no role/status changes | H2 integration: safe response, incorrect password, update email/password, relogin |
| Dashboard | DONE | Live owner/org/admin counts and status splits; date-filtered registrations; bounded paginated recent activity | Dashboard MVC tests; H2 dashboard totals/date/empty activity |
| Platform analytics | DONE | Registration/latest-update aggregates by day/week/month with paired inclusive dates; database-session timezone | H2 monthly grouping, date totals, empty-range behavior |
| Business Owners | DONE | Super Admin list/search/status/org filters, sort/page/count, details/orgs, create/edit/status/delete | MVC authorization/validation/duplicates/status; H2 lifecycle, organization filter/sort |
| Organizations | IMPLEMENTED BUT NOT FULLY VERIFIED | Admin/Super Admin list/details/create/edit/status/delete; legacy `organization_id`/`organization_name` retained; verified owner links stored separately so legacy `organization_owner` is never interpreted | MVC contract tests; H2 CRUD/relationship lifecycle; MySQL V4 rollout unverified |
| Admin accounts | DONE | Super Admin CRUD/list/search/filter/page/status with last-active-Super-Admin protection | MVC tests; H2 account lifecycle/protection |
| First Super Admin setup | IMPLEMENTED BUT NOT FULLY VERIFIED | CSRF-protected one-time setup route; 32+ character environment secret compared in constant time; a locked singleton DB row prevents concurrent/repeated initialization; BCrypt password; no role input | H2: successful creation/hash, invalid secret, repeat, CSRF; MySQL migration V1 not deployed |
| Notification dispatch history | PARTIAL | Super Admin-only read/list/detail of the legacy global dispatch-history table; search/type/recipient/status/date filters, sorting, pagination; no message body in list | H2 filter/search/date/pagination/detail/missing-row and role tests |
| Directory reports / CSV export | PARTIAL | Super Admin-only Business Owner and Organization directory reports; ownership counts use the verified relationship table; no financial calculations | H2 report filtering/pagination/role checks, CSV quoting and formula-safety assertions |
| Legacy data reports / CSV export | IMPLEMENTED BUT NOT FULLY VERIFIED | Super Admin read-only subscriber, subscription, billing-record, course, and course-installment reports; whitelisted sort, filters, pagination, safe CSV capped at 10,000 rows; billing amounts remain organization billing, not platform revenue | H2 fixtures based on read-only MySQL metadata: filtering, pagination, authorization, empty state, CSV formula safety; live MySQL query execution not run |
| Business Requests / organization registration applications | DONE | Public CSRF-protected intake; Super Admin list/search/status/date filter/sort/page/detail/approve/reject; PENDING-only single decision; rejection reason; approval atomically creates an active owner and assigned organization; history stored; duplicate pending identity rejected; process-local public limit | H2 integration: intake, duplicate pending, approval side effects, rejection reason/history, resubmission after rejection, validation, role authorization |
| Admin Settings | DONE | Super Admin can retrieve/update the persisted public registration intake cap (default 10, range 1..100, fixed 15-minute window); changes apply on the next intake; only latest editor/time recorded; no server secrets exposed | H2: default, role protection, validation, persistence; limiter unit test verifies live setting reads |
| API error contract | DONE | Standard wrapper, field-level validation errors, typed parameter errors | MVC validation/error assertions |

### Dashboard and analytics source map

* `business_owners`: owner total/status, owner registration (`created_at`), latest update (`updated_at > created_at`).
* `organizations`: organization total/status, organization creation (`created_at`), latest update (`updated_at > created_at`).
* `admin_accounts`: admin total/enabled/disabled, registration and latest update for activity/analytics.
* `notification`: legacy outgoing dispatch history only (`DISPATCHED`); no recipient-level delivery/read records. The Admin API is read-only and excludes `billing_notifications`.
* Business Request workflow: `business_requests` stores normalized intake and decision data; `business_request_history` stores submission/decision events. `pending_identity_hash` is a nullable unique key, cleared at decision so rejected requests may be resubmitted.
* `admin_settings`: stores only `public_registration_max_submissions`; V3 seeds the pre-existing default value of 10. The limiter reads the database value for each intake; its per-address counters remain process-local.
* Organization persistence maps legacy `organizations.organization_id` and `organization_name` to the API's `id` and `name`. A verified account link is stored only in `organization_business_owners`; the legacy free-text `organization_owner` is preserved and never used to infer identity.
* Directory reports use `business_owners`, `organizations`, and `organization_business_owners`. Owner organization count is a correlated count over the relation table. Organization date filters use `created_at`, inclusive by day in the database-session timezone.
* Additional read-only reports use the deployed legacy tables: `subscribers` (`start_date` for date range), `subscriptions` (no date field), `billing` (`due_date` for date range), `courses` (`created_at`), and `course_installments` (`due_date`). Billing status uses the existing `PAID`/`UNPAID` values. Reports expose record fields only; no sum is labeled platform revenue.
* Datasource requires explicit `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`; none are hardcoded or defaulted. Flyway is disabled on ordinary application startup unless explicitly enabled with `FLYWAY_ENABLED=true`. Tests use an isolated H2 URL and Flyway target V3. A read-only connection previously verified MySQL 8.0.43 and the legacy schema; the application and V4 migration have not been run against it.
* Dashboard summarizes current totals regardless of date filter; range only affects period counters and recent activity.
* Analytics aggregates each table separately by date and event category before application grouping; no multi-table join. `DAY`, Monday-starting `WEEK`, and `MONTH` buckets. Dates are interpreted in database-session timezone. Empty analytics has zero summary and no synthetic periods.
* Recent activity is only latest timestamps on current records, not history or actor-aware auditing. It is paginated (default 20, max 100).

## Blocked pending product/schema decisions

| Module | Status | Verified blocker | Required before implementation |
| --- | --- | --- | --- |
| Platform Revenue | BLOCKED | Admin schema has no platform transaction/settlement ledger, fee/commission rules, or platform recognition source. Owner-console billing is organization invoicing and cannot be assumed to be HIIKKY revenue. | Revenue recognition policy, trusted platform transaction source, successful/failed/refund/fee semantics, currency/timezone, and access requirements |
| Support Center | BLOCKED | No ticket intake source, requester authentication/tenant scope, ticket/message/assignment/history schema, or outbound reply-delivery integration | Who may create tickets; how requester identity/org membership is verified; Admin visibility/reassignment/reply permissions; allowed statuses/priorities/transitions; stored-only versus externally delivered replies; retention/audit |
| Admin notification read-state/sending | BLOCKED | No read/unread fields, authenticated Admin recipient ownership, or delivery integration. Legacy compose only stores a row marked `DISPATCHED`; status does not prove delivery. `billing_notifications` are tenant billing records. | Delivery/sending semantics, Admin recipient visibility, read-state policy, bulk operation policy, retention |

The read-only MySQL inspection found nine existing tables and no `flyway_schema_history`. V1 uses the legacy organization identifiers and `CREATE TABLE IF NOT EXISTS` for the Admin tables, V2 adds Business Request tables referencing `organizations.organization_id`, V3 adds the registration-rate setting, and V4 widens compatible organization text fields and adds indexes without renaming/dropping tables. For a fresh empty database, apply V1-V4. For adoption, first back up and verify the expected legacy structure on a staging copy, explicitly baseline at version `0`, then migrate V1-V4; automatic baseline is disabled. V4 uses MySQL-specific `ALTER TABLE ... MODIFY`, was not verified because no disposable MySQL daemon was available, and must not be applied to `hiikky_db` before staging validation and production review.

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
| Notification dispatch history search/filter/sort/page/detail | `GET /api/admin/notifications` and `GET /api/admin/notifications/{id}` | Open detail to display the message; do not show read/unread or send controls |
| Business Owner / Organization directory reports | `GET /api/admin/reports/business-owners`, `/organizations` and their `.csv` exports | JSON search/filter/date/sort/page controls; CSV download is a separate action and may return 413 above the row cap |
| Business registration applications | Public `POST /api/organization-registration-applications`; Super Admin `GET /api/admin/business-requests`, `GET /{id}`, `PATCH /{id}/approve`, `PATCH /{id}/reject` | Form state is client-side; approve/reject confirmation is UI-only; API enforces access, validation and decision rules |
| Public registration rate setting | Super Admin `GET`/`PUT /api/admin/settings/public-registration-rate-limit` | Admin form and any confirmation are frontend-only; update applies to subsequent intake checks |
| Profile | Profile GET/PATCH | Credential field handling and display |
| Login/logout | Auth POST routes | Navigation and local authenticated state |

Do not add platform-revenue cards, support queues, or notification read/unread and dispatch controls until their product/data blockers are resolved.

## Validation run for the current implementation

* `mvnw.cmd test` from the backend directory: 75 tests passed, 0 failures, 0 errors, 0 skipped; H2 and migrations through V3. V4/MySQL compatibility remains unverified.
* `git diff --check`: passed for the final changes.
* No live migration was run; production data and the nine legacy tables were not modified by this work.

Documentation-specific status and future changes should be updated alongside the feature's tests and implementation.
