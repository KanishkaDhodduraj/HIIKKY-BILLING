# HIIKKY Admin API Reference

Base URL: `/api/admin`. JSON field names are camelCase. All successful responses use `{success,message,data,timestamp,fieldErrors}`; validation failures use `fieldErrors`. Sessions are cookie-backed; send the session cookie on authenticated requests. There is no bearer-token API.

## Auth and profile

| Method and path | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /auth/csrf` | Public | none | 200 `{token,headerName,parameterName}` and establishes the CSRF-token session |
| `POST /auth/login` | Public + CSRF token | `{email,password}`; email valid, password 6..100 chars; send token using the returned header name | 200 `AdminResponse`; starts session |
| `GET /me` | Authenticated | none | 200 `data` is authenticated email string |
| `GET /profile` | Authenticated | none | 200 `AdminResponse` |
| `PATCH /profile` | Authenticated + CSRF token | `{currentPassword,email?,newPassword?}`; at least email or password required | 200 updated `AdminResponse`; session principal refreshed |
| `POST /auth/logout` | Authenticated + CSRF token | none | 200, invalidates session and expires JSESSIONID |
| `GET /super-admin/dashboard` | Super Admin | none | 200 static legacy placeholder; use `/dashboard` for metrics |

`AdminResponse = {id,email,role,enabled}`. Password hashes are never returned. Login invalid credentials and profile wrong-current-password response: 401. Duplicate email: 409. More than 10 failed login attempts from one remote address within 15 minutes returns 429; successful login clears the failure counter. The throttle does not lock accounts.

For session-authenticated requests, first call `GET /api/admin/auth/csrf`, retain its `JSESSIONID` cookie, then send `data.token` in the header named by `data.headerName` (currently `X-CSRF-TOKEN`) on every state-changing request, including login and logout. Authentication rotates the session ID and invalidates the pre-authentication CSRF token; fetch a new token after login. CSRF rejections return HTTP 403.

## Dashboard and analytics

| Method and path | Access | Query | Success |
| --- | --- | --- | --- |
| `GET /dashboard` | Super Admin | `fromDate?`, `toDate?`, `page=0`, `size=20` | Dashboard aggregate and paginated activity |
| `GET /analytics/registrations` | Super Admin | `fromDate?`, `toDate?`, `groupBy=DAY|WEEK|MONTH` | Registration and latest-update aggregates |

Both date parameters must be supplied together, ISO `yyyy-MM-dd`, inclusive by day, and ordered. Dashboard `size` is 1..100 and `page >= 0`. Dashboard result fields: `fromDate`, `toDate`, `timezone`, `platformSummary`, `businessOwners`, `organizations`, `adminAccounts`, `recentActivity`, `recentActivityTotal`, `recentActivityPage`, `recentActivitySize`. Current counts/status splits do not change with period filters; only `registeredInRange`, `createdInRange`, and activity are window-filtered. `recentActivity` fields: `entityType`, `entityId`, `displayName`, `activityType`, `occurredAt`. Activities are a derived latest timestamp per current record, not an audit log.

Analytics result fields: `fromDate`, `toDate`, `groupBy`, `summary`, `periods`. Summary and period data each contain `businessOwnerRegistrations`, `organizationRegistrations`, `adminAccountRegistrations`, `businessOwnerUpdates`, `organizationUpdates`, `adminAccountUpdates`. Registration uses `created_at`; latest-update uses `updated_at > created_at`. Week begins Monday. SQL date functions use database-session timezone. Empty periods are omitted; totals are zero.

## Business Owners (Super Admin only)

| Method and path | Purpose / input |
| --- | --- |
| `GET /business-owners` | Query `page=0`, `size=20` (1..100), `status?`, `search?`, `organizationId?`, `sortBy=id`, `sortDirection=ASC`. Search is case-insensitive partial across first/last name, email, phone. Criteria combine with AND (fields within search combine OR). Sort fields: `id`, `firstName`, `lastName`, `email`, `status`, `createdAt`, `updatedAt`; stable tie-breaker `id ASC`. Returns matching `BusinessOwnerResponse[]` plus pagination headers. |
| `GET /business-owners/{id}` | Owner and nested associated organizations; 404 if missing. |
| `GET /business-owners/{id}/organizations` | Organization array for existing owner; 404 if owner missing. |
| `POST /business-owners` | `{firstName,lastName?,email,phone?}`; firstName required/max 100, lastName max 100, email required/valid/max 255, phone max 50 with allowed `+0-9() .-` characters. New status ACTIVE; duplicate email 409; success 201. |
| `PUT /business-owners/{id}` | Partial `{firstName?,lastName?,email?,phone?,status?}` with same field limits; status only ACTIVE/INACTIVE. Null/omitted fields leave unchanged; blank firstName/email rejected; blank lastName/phone clears. Duplicate email 409, missing record 404. |
| `PATCH /business-owners/{id}/activate` | Set ACTIVE; missing record 404. |
| `PATCH /business-owners/{id}/deactivate` | Set INACTIVE; missing record 404. |
| `PATCH /business-owners/{id}/status` | `{status:"ACTIVE"|"INACTIVE"}` or `{enabled:true|false}`; if both are supplied they must agree. Missing or unsupported value 400. |
| `DELETE /business-owners/{id}` | Delete owner; related organization owner references become null; missing owner 404. |

BusinessOwnerResponse fields: `id`, `firstName`, `lastName`, `fullName`, `email`, `phone`, `status`, `createdAt`, `updatedAt`, `organizations[]`. No role, password, or credentials are returned. Owner status updates are idempotent. They do not represent registration approval and do not invalidate owner sessions.

## Organizations (Admin and Super Admin)

| Method and path | Purpose / input |
| --- | --- |
| `GET /organizations` | Query `page=0`, `size=20` (1..100), `status?`, `ownerId?`, `search?`; search is partial across name, email, and phone (case-insensitive for name/email), with fields ORed and other filters ANDed; returns organization array and pagination headers. Default `id ASC`. |
| `GET /organizations/{id}` | Organization detail; 404 if missing. |
| `POST /organizations` | `{name,ownerId?,email,phone?,address?}`; name/email required, nonblank; email valid. Optional owner must exist. New status ACTIVE; unique name/email; duplicate 409, missing owner 404; success 201. |
| `PUT /organizations/{id}` | Partial `{name?,ownerId?,email?,phone?,address?,status?}`. Optional non-null owner must exist; null owner is ignored (use DELETE owner relation to clear). Name/email uniqueness checked. Missing org/owner 404; duplicate 409. |
| `PATCH /organizations/{id}/activate` | Set ACTIVE. |
| `PATCH /organizations/{id}/deactivate` | Set INACTIVE. |
| `PATCH /organizations/{id}/status` | Same status/enabled payload alternatives and validation as owner status. |
| `PUT /organizations/{id}/owner/{ownerId}` | Assign/reassign existing owner. |
| `DELETE /organizations/{id}/owner` | Remove owner relationship; organization remains. |
| `GET /organizations/{id}/owner` | Owner detail plus organizations; 404 if organization missing or unassigned. |
| `DELETE /organizations/{id}` | Delete organization; 404 if missing. |

OrganizationResponse fields: `id`, `name`, `ownerId`, `ownerName`, `email`, `phone`, `address`, `status`, `createdAt`, `updatedAt`. Status values are `ACTIVE`/`INACTIVE`.

## Admin accounts (Super Admin only)

| Method and path | Purpose / input |
| --- | --- |
| `GET /accounts` | Query `page=0`, `size=20` (1..100), `enabled?`, `role?` (`ADMIN`/`SUPER_ADMIN`), `search?` (partial case-insensitive email); returns data array and pagination headers. |
| `GET /accounts/{id}` | Account detail; 404 if missing. |
| `POST /accounts` | `{email,password,role}`; email valid, password min 8, role required. New account enabled; duplicate email 409; password encoded; success 201. |
| `PUT /accounts/{id}` | Partial `{email?,role?,enabled?,password?}`; email valid, password min 8 when provided. Cannot change role/disable/delete last active Super Admin. |
| `PATCH /accounts/{id}/status` | Required `{enabled:boolean}`; protects last active Super Admin. |
| `PATCH /accounts/{id}/activate` | Set enabled true. |
| `PATCH /accounts/{id}/deactivate` | Set enabled false; protects last active Super Admin. |
| `DELETE /accounts/{id}` | Delete; protects last active Super Admin. |

AdminAccountResponse fields: `id`, `email`, `role`, `enabled`, `createdAt`, `updatedAt`; never includes password or hash.

## Admin notification dispatch history (Super Admin only)

The existing `notification` records are outgoing dispatch-history rows from the legacy notification module, not private messages addressed to an Admin. The API is read-only; it does not dispatch messages or expose `billing_notifications`.

| Method and path | Purpose / input |
| --- | --- |
| `GET /notifications` | Query `page=0`, `size=20` (1..100), `notificationType?` (`ANNOUNCEMENT`, `SYSTEM_ALERT`), `recipientType?` (`ALL_ACTIVE_USERS`, `BACKEND_ONLY`, `UNPAID_SEGMENT`), `status?` (`DISPATCHED`), `search?` (case-insensitive partial match over subject/message), `fromDate?`, `toDate?`, `sortBy=createdAt`, `sortDirection=DESC`. |
| `GET /notifications/{id}` | Dispatch detail, including message; missing row returns 404. |

Filters combine with AND; search matches either subject or message. Dates must be supplied together as ISO `yyyy-MM-dd`, with `fromDate <= toDate`; both ends are inclusive in the database-session timezone. Sort fields are `createdAt` and `id`; the default is newest first, with ID as a stable tie-breaker. `X-Total-Count`, `X-Page-Number`, and `X-Page-Size` report pagination. List items contain `id`, `notificationType`, `recipientType`, `subject`, `status`, and `createdAt`; only the detail response includes `message`. Invalid enum values, dates, sort fields, page, or size return 400.

The legacy model has no read/unread fields, Admin recipient ownership, or verified delivery service. Therefore read-state changes, bulk-read, composing/dispatching, and billing notification access are not implemented.

## Admin directory reports and CSV exports (Super Admin only)

These reports cover only the platform's existing Business Owner and Organization directory records. They are not financial reports or a replacement for Dashboard/Analytics; no owner billing amounts are counted as platform revenue.

| Method and path | Purpose / input |
| --- | --- |
| `GET /reports/business-owners` | Paginated owner directory report. Query: `page=0`, `size=20` (1..100), `status?` (`ACTIVE`/`INACTIVE`), `organizationId?` (positive ID), `search?` (maximum 200 characters), `fromDate?`, `toDate?`, `sortBy=id`, `sortDirection=ASC`. |
| `GET /reports/organizations` | Paginated organization directory report. Query: `page=0`, `size=20` (1..100), `status?` (`ACTIVE`/`INACTIVE`), `ownerId?` (positive ID), `search?` (maximum 200 characters), `fromDate?`, `toDate?`, `sortBy=id`, `sortDirection=ASC`. |
| `GET /reports/business-owners.csv` | CSV export of all matching owner report rows. Uses the same filters and sorting as the JSON endpoint; no pagination is applied. |
| `GET /reports/organizations.csv` | CSV export of all matching organization report rows. Uses the same filters and sorting as the JSON endpoint; no pagination is applied. |

For JSON lists, `page` is zero-based, `size` is 1..100, and `X-Total-Count`, `X-Page-Number`, and `X-Page-Size` give the matching total and page metadata. JSON `data` is an array; empty matches return `[]` and total `0`. Supported owner sorting is `id`, `firstName`, `lastName`, `email`, `status`, `organizationCount`, `createdAt`, and `updatedAt`; organization sorting is `id`, `name`, `status`, `createdAt`, and `updatedAt`. Sort direction is `ASC` or `DESC`; ties use `id ASC`.

Search is a case-insensitive partial match across owner first name, last name, email, and phone, or organization name, email, and phone. Search fields are ORed; status, relationship, and date filters combine with search using AND. `fromDate` and `toDate` are optional as a pair, must be ISO `yyyy-MM-dd`, and must be ordered. Both bounds are inclusive calendar dates against the record's `created_at` timestamp in the database-session timezone. Invalid enum values, nonpositive relationship IDs, unsupported sort fields/directions, search over 200 characters, negative pages, invalid sizes, or incomplete/reversed date ranges return HTTP 400.

Owner JSON rows contain `id`, `firstName`, `lastName`, `email`, `phone`, `status`, `organizationCount`, `createdAt`, and `updatedAt`. `organizationCount` is a correlated count of organizations whose `owner_id` equals that owner's ID, so report joins cannot multiply owners. Organization JSON rows contain `id`, `name`, `ownerId`, `ownerName`, `ownerEmail`, `email`, `phone`, `address`, `status`, `createdAt`, and `updatedAt`. Owner fields are null when the organization is unassigned or its owner is absent.

These values come from `business_owners` and `organizations`; relationship filters use `organizations.owner_id`, and date filters use each primary record's `created_at`. No account credentials or password hashes are selected. The CSV endpoints return UTF-8 `text/csv` with attachment filenames `business-owners-report.csv` and `organizations-report.csv`, respectively, and `Cache-Control: no-store`. Every cell is quoted and embedded quotes are doubled; formula prefixes are neutralized with an apostrophe even when preceded by whitespace/control characters. Exports are capped at 10,000 matching rows; larger results return HTTP 413 and require narrower filters. CSV responses do not use the JSON response wrapper.

## Business Requests (Super Admin review; public intake)

Business Requests represent organization registration applications, not Business Owner `ACTIVE`/`INACTIVE` status. The public intake is unauthenticated; session CSRF protection still applies. Obtain a CSRF token from `GET /api/admin/auth/csrf`, retain its cookie, and send the returned token header for submission.

| Method and path | Access | Request / query | Success |
| --- | --- | --- | --- |
| `POST /api/organization-registration-applications` | Public + CSRF token | JSON `{firstName,lastName?,ownerEmail,ownerPhone?,organizationName,organizationEmail,organizationPhone?,organizationAddress?}` | 201 `ApiResponse<BusinessRequestSubmissionResponse>` |
| `GET /api/admin/business-requests` | Super Admin | `page=0`, `size=20` (1..100), `status?` (`PENDING`, `APPROVED`, `REJECTED`), `search?` (max 200), `fromDate?`, `toDate?`, `sortBy=createdAt`, `sortDirection=DESC` | 200 summary array and pagination headers |
| `GET /api/admin/business-requests/{id}` | Super Admin | Positive request ID | 200 detail, including ordered decision history |
| `PATCH /api/admin/business-requests/{id}/approve` | Super Admin + CSRF token | No body | 200 approved detail |
| `PATCH /api/admin/business-requests/{id}/reject` | Super Admin + CSRF token | `{reason}` required, nonblank, max 1000 characters | 200 rejected detail |

Intake fields `firstName`, `ownerEmail`, `organizationName`, and `organizationEmail` are required; names are limited to 100/255 characters as applicable, emails must be valid and at most 255 characters, phone fields are optional (max 50 characters, restricted to `+0-9() .-`), and organization address is optional (max 255). Values are trimmed; emails are lowercased. An existing owner email, organization name, or organization email is rejected with 409. A duplicate pending application is identified by the normalized combination of owner email, organization name, and organization email and returns 409. Only pending duplicates are blocked; rejected applications can be submitted again. The pending identity has a database unique constraint to prevent concurrent duplicate submissions.

Admin list search is a case-insensitive partial match over first name, last name, owner email, organization name, and organization email. Search fields are ORed; status and date filters are ANDed with search. Date parameters are paired ISO `yyyy-MM-dd` dates, inclusive by calendar day against `business_requests.created_at` in database-session timezone. Supported sorts are `id`, `createdAt`, and `status`; ties use `id ASC`. `X-Total-Count`, `X-Page-Number`, and `X-Page-Size` report matching totals and pagination. Invalid page/size, search length, sort, status, or date range returns 400.

`BusinessRequestSubmissionResponse = {id,status,submittedAt}`. Summary rows contain `id`, `firstName`, `lastName`, `ownerEmail`, `organizationName`, `organizationEmail`, `status`, `createdAt`, and `decidedAt`. Detail adds `ownerPhone`, `organizationPhone`, `organizationAddress`, `decisionReason`, `decidedByAdminId`, `createdOwnerId`, `createdOrganizationId`, and `history`. Each history item contains `id`, `eventType`, `actorAdminId`, `reason`, `createdOwnerId`, `createdOrganizationId`, and `createdAt`. Status begins at `PENDING`; only a pending request can transition to `APPROVED` or `REJECTED`, and decisions are single-use. A repeated decision returns 409. Rejection requires a reason. Approval atomically creates an ACTIVE Business Owner and an ACTIVE Organization assigned to that owner, then records the decision and history. A current owner/organization uniqueness conflict returns 409 and rolls back the approval. No assignment, email, or notification workflow is implemented.

Public submission is limited to 10 attempts per remote address per 15-minute window (HTTP 429 thereafter). The limiter is process-local and bounded to 10,000 tracked addresses; it is not shared across application instances. Missing IDs return 404, invalid bodies return 400 with `fieldErrors`, unauthenticated Admin review returns 401, and insufficient role returns 403. All JSON responses use the common `ApiResponse` wrapper.

## Common errors

* `400`: invalid page/size, invalid enum/date/range, Bean Validation failure, unsupported owner status, or last-Super-Admin protection. Bean errors include e.g. `"fieldErrors":{"email":"Email must be a valid email address"}`.
* `401`: missing/invalid session, invalid login, disabled login, or wrong profile current password.
* `403`: logged in without required role.
* `404`: requested owner/organization/admin/business-request record or owner/organization association target not found.
* `409`: duplicate unique email/name/pending application, invalid Business Request transition, or database integrity conflict.
* `429`: login or public registration-intake rate limit exceeded.
* `413`: a directory CSV report exceeds the 10,000-row export limit.
* `500`: unexpected failure; generic message only.

Error example:

```json
{
  "success": false,
  "message": "Email must be a valid email address",
  "data": null,
  "timestamp": "2026-10-15T12:00:00",
  "fieldErrors": {"email": "Email must be a valid email address"}
}
```

## Not available

No Admin endpoints exist for platform revenue, support tickets, notification read-state or sending, additional named reports beyond the owner and organization directory reports, or editable Admin settings. See [admin-backend-feature-specification.md](./admin-backend-feature-specification.md) for the precise missing schemas and decisions.
