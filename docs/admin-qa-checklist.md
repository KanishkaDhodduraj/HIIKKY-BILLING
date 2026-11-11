# HIIKKY Admin QA Checklist

Run date: 2026-11-05. Scope follows the supplied screenshot order; A4 was explicitly omitted.

## Automated and runtime checks

| Check | Expected | Result |
| --- | --- | --- |
| Backend Jest/Supertest | Auth/CSRF/CORS, intake validation/duplicates/rate limit, private document upload/download, notifications, approval and owner/session behavior pass | **PASS** — see current test suites |
| Frontend production build | Vite builds all routes and pages | **PASS** |
| Backend startup | Express listens on port 5000 and connects to MongoDB | **PASS** — local MongoMemoryReplSet used for this run |
| `GET /health` | 200 JSON response using the common API wrapper | **PASS** |
| Frontend startup | Vite serves on port 5173 | **PASS** — root document returned 200 |
| Student report API | Pagination, CSV, block/unblock and deactivation cascade | **PASS** — 5 Admin student integration tests |
| Student portal API | Registration, tenant scoping, sandbox idempotency, zero-charge settlement, notification pagination and status revalidation | **PASS** — 7 Student integration tests |
| Student UI builds | Admin, Owner, and Student Vite production builds | **PASS** |
| Sample data | Admin, owners, organizations, pending request, dispatch records, plans, gateway entries exist | **PASS** — development-only in-memory database |
| Browser screenshot inspection | Compare rendered pages to provided screenshots | **NOT VERIFIED** — the Windows Computer Use helper could not connect to its native pipe on two attempts |

## Screenshot pages and controls

`PASS` means implemented and covered by build or API behavior. `LIMITED` means the control is available but only against data represented by the documented API. `BLOCKED` means the screen is intentionally informational because the legacy contract forbids inventing the missing records/workflow.

| Order | Page | Buttons, filters, and expected behavior | Status |
| --- | --- | --- | --- |
| A1 | Dashboard | Review Requests opens the request list; Create Platform Plan opens plan management; approval check records a transactional approval; Export owners downloads a CSV; charts and metrics use registration/account API data. | **PASS** — no tenant revenue or payment figures are fabricated |
| A2 | Business Owners | Search/status filter and reset; Add/Edit forms show API validation errors; activate/deactivate updates status and clears owner sessions; view shows invite status; resend invite and reset password send a 48-hour link after confirmation; delete requires confirmation; CSV export uses current search; Print invokes browser print; pagination updates the page. | **PASS** — tokens are hashed; only development approval returns its one-time link |
| A3 | Business Requests | Search/status/date filters and reset; CSV exports filtered requests; view shows all owner/business fields, decision history, and Admin-only private document downloads; Approve confirms and transactionally creates owner/org plus a hashed 48-hour invitation; Reject requires a reason and writes history; pending counts update in dashboard/sidebar. | **PASS** — intake normalizes business type/region, creates an Admin notification, rejects duplicate/invalid/oversized submissions, and exposes limited public status |
| A5 | Payment Gateway | Add/Configure opens provider form; API key is encrypted at rest and never returned; Enable/Disable updates gateway configuration. | **LIMITED** — only saved configuration is supported; no provider health test, payment execution, or transaction log exists, so Export Log is omitted |
| A6 | Platform Analytics | From/To and Apply Dates fetch date-bounded aggregates; Export Owners downloads the owner directory CSV; chart/status panels display real owner, organization, and admin registrations/updates. | **PASS** — subscription/customer/transaction/revenue data is labeled unavailable |
| A7 | Revenue Analytics | Informational page explains that platform earnings, top payers, and platform transactions are unavailable without a verified platform ledger/recognition policy. | **BLOCKED** — export and report generation controls are intentionally omitted |
| A8 | Support Center | Informational page lists the missing ticket scope required before ticket intake, assignment, or replies can be offered. | **BLOCKED** — create/filter/assign/reply controls are intentionally omitted because requester scope, permissions, transitions, delivery, and retention are undefined |
| A9 | Notifications | Search, type, recipient, status, and date filters; reset; detail opens the dispatch body; pagination changes results. | **LIMITED** — dispatch history is read-only; schedule/create, acknowledge, delivery, and maintenance actions have no backing API |
| A10 | Settings | Save persists the public registration limit; Reset saves the documented default; Test Configuration reads the setting endpoint; Refresh reloads it. | **PASS** — security, finance, API secret, backup, and system-preference cards are descriptive; they are not presented as editable settings |

## Other admin routes

| Page | Controls and behavior | Status |
| --- | --- | --- |
| Login | Session login; shared CSRF token is refreshed after login; errors shown inline | **PASS** — exercised by backend tests |
| Organizations | Search/status filter; Add/Edit; owner assignment through the owner selector; activate/deactivate; unassign owner; view details and invite status; delete confirmation; CSV export; pagination | **PASS** — API-backed |
| Admin Accounts | Search/role/enabled filters; create/edit; enable/disable; delete confirmation; last-active-Super-Admin protection enforced by API | **PASS** — API-backed |
| Platform Plans | Create/edit; active status toggle; delete confirmation; paginated list | **PASS** — uses plan fields supported by legacy report metadata |
| Reports | Owner/organization report switch; search/status filter; CSV export; pagination | **LIMITED** — subscriber, subscription, billing, course, and installment source records are not migrated |
| Students | Search/status/registration/organization filters; CSV; block/unblock confirmation; student payment report with search/date filters and CSV | **PASS** — shared Subscriber/Billing/Payment collections; session invalidation tested |
| Profile | Update email/password with current-password verification; role/status remain read-only | **PASS** — calls profile PATCH API |
| Logout | Destroys session and expires session/CSRF cookies | **PASS** — available from sidebar |

## Items requiring product/data decisions

- Platform revenue cannot be calculated from organization invoices; provide an approved recognition rule and auditable platform ledger before enabling A7 exports or metrics.
- Support ticket workflow requires requester identity/tenant scope, role permissions, statuses, assignment, reply delivery, and retention decisions before A8 controls can be enabled.
- Payment Gateway configuration stores credentials securely but does not connect to providers. Provider-specific health checks and transaction records require integration details and credentials.
- The provided screenshots include fields absent from the existing owner model (industry, customer totals, subscriptions). These were not filled with synthetic values.
- Screenshots A4 was not provided and was omitted as requested.
