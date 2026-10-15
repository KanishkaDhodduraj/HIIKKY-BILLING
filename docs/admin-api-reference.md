# HIIKKY Admin API Reference

Base URL: `/api/admin`. JSON field names are camelCase. All successful responses use `{success,message,data,timestamp,fieldErrors}`; validation failures use `fieldErrors`. Sessions are cookie-backed; send the session cookie on authenticated requests. There is no bearer-token API.

## Auth and profile

| Method and path | Access | Request | Success |
| --- | --- | --- | --- |
| `POST /auth/login` | Public | `{email,password}`; email valid, password 6..100 chars | 200 `AdminResponse`; starts session |
| `GET /me` | Authenticated | none | 200 `data` is authenticated email string |
| `GET /profile` | Authenticated | none | 200 `AdminResponse` |
| `PATCH /profile` | Authenticated | `{currentPassword,email?,newPassword?}`; at least email or password required | 200 updated `AdminResponse`; session principal refreshed |
| `POST /auth/logout` | Authenticated | none | 200, invalidates session and expires JSESSIONID |
| `GET /super-admin/dashboard` | Super Admin | none | 200 static legacy placeholder; use `/dashboard` for metrics |

`AdminResponse = {id,email,role,enabled}`. Password hashes are never returned. Login invalid credentials and profile wrong-current-password response: 401. Duplicate email: 409.

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

## Common errors

* `400`: invalid page/size, invalid enum/date/range, Bean Validation failure, unsupported owner status, or last-Super-Admin protection. Bean errors include e.g. `"fieldErrors":{"email":"Email must be a valid email address"}`.
* `401`: missing/invalid session, invalid login, disabled login, or wrong profile current password.
* `403`: logged in without required role.
* `404`: requested owner/organization/admin record or owner/organization association target not found.
* `409`: duplicate unique email/name or database integrity conflict.
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

No Admin endpoints exist for business requests/approvals, platform revenue, support tickets, notification read-state or sending, separate reports/exports, or editable Admin settings. See [admin-backend-feature-specification.md](./admin-backend-feature-specification.md) for the precise missing schemas and decisions.
