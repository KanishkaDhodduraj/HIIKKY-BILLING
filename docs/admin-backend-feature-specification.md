# HIIKKY Super Admin Backend Feature Specification

## Scope and source of truth

This specification describes the Spring Boot API under `hiikky-admin-backend/hiikky-admin-backend`. Its initialized schema is `admin_accounts`, `business_owners`, `organizations`, and the shared `notification` dispatch-history table in `src/main/resources/schema.sql`. The separately maintained `organization-owner-console` is not an Admin frontend or an Admin API. No Admin frontend code is present in this repository.

The Admin API uses cookie-backed Spring Security sessions. Requests other than login and public health/info endpoints require authentication. Business Owner, dashboard, analytics, and account-management endpoints requiring Super Admin access enforce that role. Organization management allows `ADMIN` and `SUPER_ADMIN`.

### Session CSRF and login throttling

* CSRF protection is enabled for all state-changing HTTP methods. `GET /api/admin/auth/csrf` is public and returns the token, required header name (`X-CSRF-TOKEN`), and parameter name in the normal response wrapper. A client must preserve the session cookie and send the token header on login, logout, profile changes, and all other mutations. Login rotates the session ID and deletes the pre-authentication token, so the client fetches a fresh token afterward.
* Authentication failures are throttled by source IP: 10 failed login attempts per address in a 15-minute window; the next attempt receives HTTP 429 until that window expires. A successful login clears that address's failure count. There is no account-level lockout, so an attacker cannot lock a specific account by targeting its email.
* The limiter is in-process, bounded to 10,000 tracked addresses, and does not share state across application instances or restarts. Multi-instance deployment needs a shared rate-limit store or trusted edge limiter. Only the servlet remote address is used; forwarding headers are not trusted by the application.
* Admin account records have no lockout fields. Admin role checks are enforced through both route rules and method security on role-specific controllers; response DTOs omit password hashes. SQL values are parameterized and sort fields are allowlisted. Admin account mutations do not record actor-aware audit history.

## Shared response and errors

Successful JSON responses use:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {},
  "timestamp": "2026-10-15T12:00:00",
  "fieldErrors": null
}
```

Errors use the same wrapper with `success: false`, `data: null`, and a message. Bean validation errors return HTTP 400 and a `fieldErrors` object mapping field names to their first validation message. Other common responses: 401 unauthenticated/invalid credentials, 403 insufficient role, 404 missing entity, 409 duplicate or database integrity conflict, and 500 unexpected server error. Pagination endpoints additionally return `X-Total-Count`, `X-Page-Number`, and `X-Page-Size` headers.

## Business Owner module

The owner table has unique email, name/contact fields, `ACTIVE`/`INACTIVE` status, and creation/update timestamps. An owner may have zero or more organizations through `organizations.owner_id`; organization deletion does not delete an owner, and owner deletion sets related `owner_id` values to null through the schema foreign key.

### List, search, filter, sort, paginate

`GET /api/admin/business-owners` — Super Admin only.

Parameters:

| Parameter | Required | Default / allowed |
| --- | --- | --- |
| `page` | no | zero-based, default `0`, must be >= 0 |
| `size` | no | default `20`, range `1..100` |
| `status` | no | `ACTIVE` or `INACTIVE` |
| `search` | no | case-insensitive partial match across first name, last name, email, or phone |
| `organizationId` | no | filters owners having that organization; missing organization returns 404 |
| `sortBy` | no | default `id`; one of `id`, `firstName`, `lastName`, `email`, `status`, `createdAt`, `updatedAt` |
| `sortDirection` | no | `ASC` or `DESC`, default `ASC` |

Status, search, and organization criteria are combined with AND; the search terms across supported fields are combined with OR. Sorting appends `id ASC` as a stable tie-breaker. Total count uses the same criteria. The page contains `BusinessOwnerResponse[]`.

### Read, create, edit, status, delete

* `GET /api/admin/business-owners/{id}` returns owner fields plus associated organization details. Missing owner returns 404.
* `GET /api/admin/business-owners/{id}/organizations` returns that owner's organizations; missing owner returns 404.
* `POST /api/admin/business-owners` creates an owner. JSON fields: `firstName` (required, nonblank, max 100), `lastName` (optional, max 100), `email` (required, valid email, max 255), and `phone` (optional, max 50, characters limited to `+`, digits, parentheses, spaces, dot, hyphen). New accounts start `ACTIVE`. Email is trimmed/lowercased and unique; duplicates return 409. Success is 201.
* `PUT /api/admin/business-owners/{id}` updates permitted contact fields and current account status. Fields are optional: `firstName` (max 100, if supplied must not be blank), `lastName` (max 100; blank clears it), `email` (valid email, max 255; blank rejected), `phone` (max 50 and allowed characters; blank clears it), `status` (`ACTIVE`/`INACTIVE`). Email uniqueness is checked excluding the current owner. Roles, credentials, and organization membership cannot be modified through this request. Missing owner is 404; duplicate email 409.
* `PATCH /api/admin/business-owners/{id}/activate` and `/deactivate` set account status. `PATCH /api/admin/business-owners/{id}/status` accepts `{"status":"ACTIVE"}`, `{"status":"INACTIVE"}`, `{"enabled":true}`, or `{"enabled":false}`. If both `status` and `enabled` are present they must agree. Missing status or unsupported values return 400. Repeating the current target is idempotent.
* `DELETE /api/admin/business-owners/{id}` deletes the owner; missing owner returns 404. The database sets linked organization owner references to null.

The `BusinessOwnerResponse` fields are `id`, `firstName`, `lastName`, `fullName`, `email`, `phone`, `status`, `createdAt`, `updatedAt`, and `organizations`. Each nested organization has `id`, `name`, `ownerId`, `ownerName`, `email`, `phone`, `address`, `status`, `createdAt`, and `updatedAt`. No credentials or password hashes exist in this owner response.

There is no separate registration approval state, owner authentication/session table, owner status-history table, or actor-audit table. Owner status changes update the row timestamp only and do not invalidate any owner session.

## Organization module

`organizations.owner_id` is nullable and references `business_owners.id`. Names and emails are unique. Organization endpoints permit `ADMIN` and `SUPER_ADMIN`.

* `GET /api/admin/organizations`: optional `page` (default 0), `size` (default 20, 1..100), `status`, `ownerId`, and `search`. Search is case-insensitive partial on name and email, or partial on phone; search fields are ORed and combined with status/owner filters using AND. Returns response array and pagination headers. Unsupported enum values return 400.
* `GET /api/admin/organizations/{id}` returns an organization detail; missing record is 404.
* `POST /api/admin/organizations` accepts `name` (required nonblank), `ownerId` (optional), `email` (required nonblank valid email), `phone` (optional), `address` (optional). New organizations start `ACTIVE`. Name/email must be unique; a specified missing owner returns 404; duplicate name/email returns 409. Success is 201.
* `PUT /api/admin/organizations/{id}` accepts optional `name`, `ownerId`, `email`, `phone`, `address`, and `status`. A specified non-null `ownerId` must exist. A null owner field is treated as not supplied; use the remove-owner operation to clear assignment. Name/email are uniqueness-checked. The current service ignores blank name/email rather than clearing them. Missing organization/owner returns 404; duplicate values return 409.
* `PATCH /api/admin/organizations/{id}/activate`, `/deactivate`, and `/status` set `ACTIVE`/`INACTIVE`. Status accepts `status` or `enabled` as described for owners. Missing records return 404.
* `PUT /api/admin/organizations/{id}/owner/{ownerId}` assigns/reassigns an existing owner. Missing organization or owner returns 404.
* `DELETE /api/admin/organizations/{id}/owner` clears assignment and returns the organization. Missing organization returns 404.
* `GET /api/admin/organizations/{id}/owner` returns the owner with its organization list. Missing organization or unassigned/missing owner returns 404.
* `DELETE /api/admin/organizations/{id}` deletes the organization; missing record returns 404.

## Dashboard

`GET /api/admin/dashboard` — Super Admin only.

Optional query parameters: `fromDate`, `toDate` (ISO `yyyy-MM-dd`, both supplied or neither), `page` (zero-based activity page, default 0), `size` (default 20, range 1..100). `fromDate` must be on/before `toDate`. Each date is inclusive; SQL uses `[fromDate at 00:00, day after toDate at 00:00)`. Invalid/missing bounds, negative page, invalid size, and date ordering return 400.

Response data contains:

* `fromDate`, `toDate`, `timezone` (`database-session`).
* `platformSummary.businessOwnerCount`, `organizationCount`, `adminAccountCount`: current row counts.
* `businessOwners.total`, `active`, `inactive`: current `business_owners` count/status split; `registeredInRange`: records created during the selected date window, or all-time when dates are omitted.
* `organizations.total`, `active`, `inactive`: current `organizations` count/status split; `createdInRange`: same date behavior using `created_at`.
* `adminAccounts.total`, `enabled`, `disabled`: current `admin_accounts` total and enabled flag split. There is no date-filtered Admin registration card in the dashboard response.
* `recentActivity`: page of latest creation/update marker per current business owner, organization, or Admin account. It is derived from `created_at` and `updated_at`; a row is `UPDATED` only when `updated_at > created_at`, otherwise it is `REGISTERED` for an owner/Admin account or `CREATED` for an organization. Date filter is applied to that selected timestamp. Results sort by timestamp descending, then entity type and ID; fields are `entityType`, `entityId`, `displayName`, `activityType`, `occurredAt`.
* `recentActivityTotal`, `recentActivityPage`, `recentActivitySize`.

The three current tables are aggregated independently to avoid join multiplication. Empty result sets return zeros and an empty activity array. The activity stream is not a full audit log: deleted records, prior changes, changed fields, and actor identity are unavailable. Date conversion/grouping is performed in database-session timezone; no application timezone conversion is applied.

## Platform Analytics

`GET /api/admin/analytics/registrations` — Super Admin only.

Parameters: both optional ISO dates `fromDate`/`toDate` (must be supplied together and ordered), `groupBy` (`DAY`, `WEEK`, `MONTH`; default `DAY`). Date bounds are inclusive and use the database session timezone. Weeks start Monday. Response: `fromDate`, `toDate`, `groupBy`, `summary`, `periods[]`. Summary and each period expose counts for `businessOwnerRegistrations`, `organizationRegistrations`, `adminAccountRegistrations`, and corresponding `businessOwnerUpdates`, `organizationUpdates`, `adminAccountUpdates`. A registration counts rows by `created_at`. An update counts each current row at most once by `updated_at` when `updated_at > created_at`; this is latest-update activity, not a change log. SQL aggregates each table/date before periods are assembled, with no multi-table entity join. No records return zero summary and an empty period list; no synthetic zero-filled calendar buckets are returned.

## Admin account management

All `/api/admin/accounts` routes require Super Admin. Admin response fields are `id`, `email`, `role`, `enabled`, `createdAt`, `updatedAt`; password/hash never appears.

* `GET /api/admin/accounts`: query `page` (default 0), `size` (default 20, 1..100), `enabled`, `role` (`ADMIN`/`SUPER_ADMIN`), `search` (case-insensitive partial email). Filters/search combine with AND. Returns data array and pagination headers; default order is `id ASC`.
* `GET /api/admin/accounts/{id}` returns details; missing ID is 404.
* `POST /api/admin/accounts`: JSON `{ "email": "...", "password": "...", "role": "ADMIN" }`. All fields required; email valid; password >=8 chars; role is enum. Email is normalized and unique. New account is enabled. Password is BCrypt encoded. Returns 201.
* `PUT /api/admin/accounts/{id}` accepts optional `email`, `role`, `enabled`, `password`; email if provided must be valid, password if provided must be >=8 characters. Duplicate email returns 409. Roles can be changed only through this Super Admin endpoint. It prevents changing role, disabling, or deleting the last active Super Admin. Missing account is 404; violating last-Super-Admin protection is 400. Account edits update the timestamp. Setting optional fields to null leaves them unchanged.
* `PATCH /api/admin/accounts/{id}/status` accepts required boolean `enabled`; `/activate` and `/deactivate` are convenience status actions. Missing account 404; last active Super Admin cannot be deactivated (400). Repeating same enabled value is accepted.
* `DELETE /api/admin/accounts/{id}` deletes account. Missing ID is 404; deleting the last active Super Admin returns 400.

## Authentication, profile, and logout

* `POST /api/admin/auth/login` is public. Body: `email` required, valid email; `password` required, 6..100 characters. Success returns safe `AdminResponse` (`id`, `email`, `role`, `enabled`) and establishes the HTTP session. Invalid credentials/disabled account return 401. Login rotates an existing session ID.
* `GET /api/admin/me` requires authentication and returns the username/email as a string in `data`.
* `GET /api/admin/profile` requires authentication and returns safe `AdminResponse`; missing account returns 404.
* `PATCH /api/admin/profile` requires authentication. Body requires `currentPassword`; optional `email` (valid, max 255) and/or `newPassword` (min 8). At least one update field must be provided. Current password is checked; email is unique and normalized; password is encoded. Role/enabled are not accepted and cannot be changed here. Successful update refreshes session principal; wrong current password returns 401, duplicate email 409, invalid fields 400.
* `POST /api/admin/auth/logout` requires authentication. It invalidates the current HTTP session, clears the security context, and expires `JSESSIONID`; success returns `data: null`. Reuse of the invalidated session for protected API calls returns 401. Logout is not a notification or audit operation.
* `GET /api/admin/super-admin/dashboard` is an existing Super Admin-only placeholder that returns a static access message; it is not the implemented analytics dashboard. Frontend must use `/api/admin/dashboard`.

## Admin notification dispatch history (partial)

The legacy notification model and DAO establish a shared `notification` table with `notification_id`, `notification_type`, `recipient_type`, `subject`, `message`, `status`, and `created_at`. Its menu records `ANNOUNCEMENT`/`SYSTEM_ALERT` entries for `ALL_ACTIVE_USERS`, `BACKEND_ONLY`, or `UNPAID_SEGMENT`, and writes `DISPATCHED` as the status. Those are global outgoing-dispatch history rows, not Admin-private notifications or per-recipient delivery receipts. The Admin schema script declares this table for new/test schemas; an existing legacy table is reused by name and is not altered by `CREATE TABLE IF NOT EXISTS`.

* `GET /api/admin/notifications` — Super Admin only. Query: `page` (zero-based, default 0), `size` (default 20, range 1..100), optional exact `notificationType`, `recipientType`, `status`, `fromDate`, `toDate`, and `search`; `sortBy` is `createdAt` or `id` (default `createdAt`), `sortDirection` is `ASC`/`DESC` (default `DESC`). Supported exact filters are notification types `ANNOUNCEMENT`/`SYSTEM_ALERT`, recipient types `ALL_ACTIVE_USERS`/`BACKEND_ONLY`/`UNPAID_SEGMENT`, and status `DISPATCHED`. Search is case-insensitive partial match across subject and message. Filters combine with AND; search fields combine with OR. Dates must be paired ISO dates in ascending order and include both calendar days in database-session timezone. Invalid filters/ranges/page/size return 400. Results are sorted by selected field and ID in the same direction; headers provide total count and page metadata. List items omit the message body.
* `GET /api/admin/notifications/{id}` returns the dispatch detail including message; missing IDs return 404. The response exposes only fields in the existing dispatch record.
* The API is read-only. The legacy menu has a compose flow, but the available code only writes a row marked `DISPATCHED`; it does not establish delivery behavior, an authenticated dispatch actor, or a sender integration. No Admin create/dispatch, read/unread, bulk-read, or billing-notification operation is exposed. `billing_notifications` are organization/billing/subscriber records and are not part of this API.

## Business Requests / organization registration applications

The application now has a distinct application lifecycle; it is not inferred from a Business Owner's `ACTIVE`/`INACTIVE` status. `POST /api/organization-registration-applications` accepts a public registration submission protected by session CSRF. Super Admins use `GET /api/admin/business-requests` for search/status/date filtering, sorting and pagination; `GET /{id}` returns the application and its ordered history; and `PATCH /{id}/approve` or `/reject` records a single decision. Rejection requires a nonblank reason.

Application statuses are `PENDING`, `APPROVED`, and `REJECTED`. Only `PENDING` can be decided. Approval creates an ACTIVE Business Owner and an ACTIVE Organization assigned to that owner in the same transaction as the decision/history writes. Rejection records the reason without creating either record. Repeated decisions return 409. Pending duplicate identity is the normalized owner email + organization name + organization email; only matching pending applications are blocked, allowing rejected applications to be resubmitted. Existing owner email, organization name, or organization email conflicts are rejected at intake and rechecked at approval.

Migration `V2__business_request_workflow.sql` adds `business_requests` and `business_request_history`; both tables retain submission/decision data and the history records submission and decisions, actors, reason, and any created owner/organization IDs. The nullable unique pending identity hash is cleared when a decision is recorded. V1 creates Admin tables for a new database using the legacy organization identifiers. For an existing legacy schema, explicitly baseline at version `0` and apply V1-V4 only after validation on a restored staging copy; automatic baseline is disabled. V4 requires MySQL-specific validation before production rollout. No assignment, delivery notification, or email workflow is included because none is supported by confirmed existing integrations.

Public intake is limited to 10 attempts per remote address per 15 minutes with a process-local, 10,000-address bounded limiter; it is not a shared multi-instance rate limiter. Submission requires CSRF despite being unauthenticated. Review endpoints require `ROLE_SUPER_ADMIN`. Input validation, duplicate errors, missing records, invalid transitions, role failures, and throttling map to the common 400/401/403/404/409/429 API error contract. See the API reference for exact fields, filters, response DTOs, and pagination.

## Admin settings

Migration `V3__admin_settings.sql` creates the persistent `admin_settings` store and seeds one supported setting: `public_registration_max_submissions`, the maximum public organization-registration submissions accepted per remote address in the existing fixed 15-minute window. Its default is 10 and the allowed range is 1..100. `GET /api/admin/settings/public-registration-rate-limit` reads it; `PUT` accepts `{maxSubmissions}` and updates the stored value. Changes apply to the next intake request because the rate limiter reads the current database value for each request. Attempt counts remain process-local and are not shared across application instances.

Both endpoints require `ROLE_SUPER_ADMIN`; PUT also requires the session CSRF token. The response includes the current value, fixed window, allowed bounds/default, last update timestamp, and last updating Admin ID. The database records only the latest updater and timestamp, not a full settings audit history. The setting is validated in the request and service/model layers; missing or corrupt stored configuration is an internal server error, not a successful default. No arbitrary keys or deployment configuration, credentials, database settings, secrets, tokens, or authentication properties can be read or changed.

## First Super Admin setup

`POST /api/admin/setup/first-super-admin` provides initial privileged account creation when no Admin exists. It requires session CSRF plus an `X-Admin-Bootstrap-Secret` header configured through `ADMIN_BOOTSTRAP_SECRET` (at least 32 characters). The secret is not returned or logged; password hashing uses BCrypt. A singleton locked state row serializes requests. The route accepts only `{email,password}` and cannot set role or enabled status. After creating the first account, remove the bootstrap secret from runtime configuration and use regular login. Absence/shortness of the secret disables setup. See the API reference for validation, response, and errors.

## Additional legacy-data reports

Five read-only Super Admin report families are implemented against columns inspected in the existing legacy MySQL schema: subscribers, subscriptions, billing records, courses, and course installments. Each has a JSON listing with filtering, search, sorting, and pagination plus a CSV export capped at 10,000 rows. Date filtering uses only the actual date fields (`subscribers.start_date`, `billing.due_date`, `courses.created_at`, and `course_installments.due_date`); subscriptions have no date field. Tests use independent H2 fixtures shaped from read-only schema metadata. These reports expose existing owner-console records and do not add calculations or classify `billing.amount` as platform revenue. Full API contracts are in `admin-api-reference.md`.

## Modules that are not implemented

* **Revenue — BLOCKED:** the Admin schema has no platform ledger, settlement/payment-provider data, fee/commission rule, or platform revenue-recognition policy. Legacy owner-console billing amounts are organization invoices and cannot be represented as HIIKKY revenue.
* **Support Center — BLOCKED:** there is no ticket intake source, requester authentication/tenant scope, support ticket/message/assignment/history table, or outbound reply-delivery integration. Decide who may create tickets (public, Business Owner, or Admin), how requester identity and organization ownership are verified, which Admin roles may view/reassign/respond, allowed status and priority values/transitions, whether replies are stored only or delivered externally, and retention/audit requirements. Until these are confirmed, adding schema/endpoints would invent requester access and reply behavior.
* **Notification read state and sending — BLOCKED:** there are no read/unread fields, per-Admin recipient ownership, or delivery integration. Define whether Super Admins may compose/send, how delivery is confirmed, what recipient visibility means, and whether Admin-specific unread notifications are needed. Billing notifications remain tenant-scoped and excluded.

## Directory reports and CSV exports (partial reports module)

All four endpoints require `ROLE_SUPER_ADMIN`:

* `GET /api/admin/reports/business-owners` returns a paginated JSON owner directory. Filters: optional owner `status`, `organizationId`, `search`, and paired `fromDate`/`toDate`; pagination defaults to page `0`, size `20` (maximum 100). Search is a case-insensitive substring over first name, last name, email, and phone. Filters are ANDed; search fields are ORed. Dates are inclusive by calendar day and filter `business_owners.created_at` in the database-session timezone. Sort fields: `id`, `firstName`, `lastName`, `email`, `status`, `organizationCount`, `createdAt`, `updatedAt`; default `id ASC`; ties use `id ASC`. Response rows have `id`, `firstName`, `lastName`, `email`, `phone`, `status`, `organizationCount`, `createdAt`, and `updatedAt`. `organizationCount` is computed per owner from `organization_business_owners`, not a row-multiplying join.
* `GET /api/admin/reports/organizations` returns a paginated JSON organization directory. Filters: optional organization `status`, `ownerId`, `search`, and paired `fromDate`/`toDate`; pagination and search rules are the same. Search fields are name, email, and phone. Dates filter `organizations.created_at`. Sort fields: `id`, `name`, `status`, `createdAt`, `updatedAt`; default `id ASC`; ties use `id ASC`. Response fields are `id`, `name`, `ownerId`, `ownerName`, `ownerEmail`, `email`, `phone`, `address`, `status`, `createdAt`, and `updatedAt`; owner fields are null when unassigned. Identifiers map to `organizations.organization_id` and `organization_name`; owner associations use `organization_business_owners`. The legacy free-text owner field is preserved, not parsed.
* `GET /api/admin/reports/business-owners.csv` and `GET /api/admin/reports/organizations.csv` apply the same filters and sorting without pagination. They return UTF-8 CSV attachment files, with quoted cells and doubled embedded quotes; potentially executable spreadsheet formula prefixes are neutralized with an apostrophe, including when preceded by whitespace/control characters. `Cache-Control: no-store` is set. Exports allow up to 10,000 rows; larger filtered matches return 413. CSV is not wrapped in `ApiResponse`.
* JSON results use `ApiResponse<List<...>>` and pagination headers `X-Total-Count`, `X-Page-Number`, `X-Page-Size`; no matches produce an empty data array and zero count. Page is zero-based, JSON size 1..100, search max 200 characters, relationship IDs must be positive, and dates must be paired, parseable ISO dates in ascending order. Invalid query values return 400. CSV filters and outputs select only directory data; no credentials/password hashes or tenant billing values are included.
* Data source and calculation: `business_owners`, `organizations`, and `organization_business_owners`; organization identifiers map to legacy `organization_id`, and owner/org relationship is explicit through the link table. Report timestamps are the row timestamps in the database-session timezone. Owner and organization report queries select at their entity grain and avoid a multiplying join. Reports do not calculate revenue and do not replace Dashboard/Analytics.

## UI/action contract

No Admin web application or screen-specific design assets are in this repository; only a link to an external design project is recorded in the root README. Future frontend should map controls only to implemented endpoints:

| Page/action | API operation | Frontend-only behavior |
| --- | --- | --- |
| Dashboard cards/activity | `GET /api/admin/dashboard` | Refresh reissues GET; empty states render zero cards/empty activity; date and activity page controls update query parameters. |
| Analytics chart | `GET /api/admin/analytics/registrations` | Chart rendering and grouping selector; selecting grouping/date range reissues GET. |
| Owners table | `GET /api/admin/business-owners` | Search, status/org filter, sort headers, and pagination update query parameters. |
| Owner details / organizations | owner detail and `/organizations` GETs | Open/close details panel; no extra API for local expansion. |
| Owner create/edit | POST/PUT owner routes | Form state, dirty-state, and client confirmation UI; server validation remains authoritative. |
| Owner activate/deactivate/delete | PATCH/DELETE owner routes | Confirmation dialog is frontend-only; the API performs the status/delete operation. |
| Organizations table/details/edit/assignment | organization GET/POST/PUT/PATCH/DELETE and owner relationship routes | Search/filter/table selection/dialog interactions are frontend-only; mutations use matching endpoint. |
| Admin accounts | account GET/POST/PUT/PATCH/DELETE routes | Search/filter/pagination and confirmation UI; last-active-Super-Admin error must be shown. |
| Notification dispatch history | `GET /api/admin/notifications` and `GET /api/admin/notifications/{id}` | Search/filter/sort/page controls query the list endpoint; opening a row fetches full message detail. No read/unread or dispatch control is supported. |
| Directory reports | `GET /api/admin/reports/business-owners`, `/organizations`; corresponding `.csv` routes | Report filters/sort/page control JSON queries; CSV action downloads the complete filtered result within the server row cap. |
| Business registration applications | Public `POST /api/organization-registration-applications`; Super Admin list/detail/approve/reject routes | Form state is frontend-only; confirmation for approve/reject is a UI interaction; decision effects and validation are enforced by the API. |
| Admin settings | Super Admin `GET`/`PUT /api/admin/settings/public-registration-rate-limit` | A form/confirmation for the cap is frontend-only; the persisted value affects subsequent registration intake checks. |
| First Super Admin bootstrap | Public `POST /api/admin/setup/first-super-admin` + CSRF and configured bootstrap-secret header | No Admin control is needed after initial deployment setup; never expose the secret in UI/source. |
| Legacy data reports | Super Admin JSON and `.csv` routes for subscribers, subscriptions, billing, courses, and course installments | Report selectors/filters/sort/page are query controls; CSV is a separate download and has a 10,000-row cap. Billing rows are not platform revenue. |
| Profile | GET/PATCH profile | Password inputs must not be prefilled; success updates displayed email from API. |
| Login/logout | POST login/logout; GET `/me` | Route changes and session-aware navigation are client-side. |

There are no supported UI actions/API operations yet for notification read state or sending, support, or platform revenue.

## Automated tests

Tests are in `hiikky-admin-backend/hiikky-admin-backend/src/test/java`. `DashboardControllerTest` tests dashboard roles, date and activity pagination validation. `BusinessOwnerControllerTest` tests Super Admin-only owner access, list contract, duplicate/invalid input, statuses, and missing record handling. `HiikkyAdminBackendApplicationTests` exercises H2 integration for auth/session fixation/logout, account/owner/organization lifecycle, dashboard and analytics ranges, profile password/email update, owner organization filter/sort, notification dispatch filtering/pagination/detail/authorization, directory report filtering/pagination/authorization/CSV quoting and formula-safety, Business Request intake/review/history, Admin settings, and legacy-data reports. `AdminBootstrapControllerTest` covers bootstrap authentication, CSRF, password hashing, repeat attempts, and safe response fields. `LegacyAdminReportControllerTest` covers report permissions, filters, pagination, empty results, and CSV safety. `PublicSubmissionRateLimiterTest` verifies that the persisted limit is observed dynamically. Tests use the H2 schema/legacy-shaped fixtures only.

Run from the backend project directory: `mvnw.cmd test`. Tests use H2 profile; do not point tests at the live MySQL instance.
