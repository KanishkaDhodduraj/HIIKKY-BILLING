# Business Owner portal API

The Owner API runs on port `5001`, uses `/api/owner`, and shares Admin's MongoDB database. Owner sessions use a distinct `hiikky.owner.sid` cookie and `owner_sessions` collection. Every authenticated business data query is scoped to the organization IDs in the Owner session. MongoDB must run as a replica set for invoice creation and other transaction-backed paths.

## Sign-in and registration

- `GET /api/owner/auth/csrf` issues a session-bound CSRF token.
- `POST /api/owner/auth/login`, `POST /api/owner/auth/verify-otp`, `POST /api/owner/auth/logout`, `GET /api/owner/auth/me` manage the Owner session and optional two-factor code.
- `POST /api/owner/auth/set-password` accepts a one-time invitation token and a 12–72 character password. `POST /api/owner/auth/forgot-password` requests a reset invitation.
- The Owner portal submits new applications to the Admin-owned `POST /api/organization-registration-applications` endpoint using `VITE_ADMIN_API_URL`, `GET /api/admin/auth/csrf`, credentials, and the `X-CSRF-TOKEN` header. The multipart form includes owner and organization contact data, business type, projected students, region, optional subscription tier, optional PDF/JPG/PNG up to 5 MiB, and the document-skip flag. The older `GET /api/owner/registrations/plans`, `POST /api/owner/registrations`, and `GET /api/owner/registrations/:id` endpoints remain for legacy clients.
- `GET /api/organization-registration-applications/:id/status` provides a reference-based status check with PENDING/APPROVED/REJECTED status and rejection reason; it never exposes owner email. Rejected applicants may resubmit.
- Admin-issued set-password tokens are stored hashed and expire after 48 hours. Expired and used tokens are rejected. Login requires an ACTIVE owner and an active linked organization.

All POST, PUT, PATCH, and DELETE requests require the `X-CSRF-TOKEN` header. Owner and Admin session cookies are separate, credentialed, `SameSite=Lax`, and `Secure` in production. The Admin API allows both local frontend origins (`http://localhost:5173` and `http://localhost:5174`). SMTP delivery uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional `SMTP_USER`/`SMTP_PASSWORD`, and `MAIL_FROM`; development without SMTP logs links to the console.

## Workspace APIs

Authenticated endpoints include:

- `GET /api/owner/dashboard`, `GET /api/owner/analytics/revenue`, `GET /api/owner/analytics/subscriptions`
- `/api/owner/subscribers` for customer records
- `/api/owner/subscriptions` for organization subscription plans
- `/api/owner/courses` and `/api/owner/courses/:courseId/installments`
- `/api/owner/billing` and `/api/owner/invoices` for invoices, paid status, reminders, and `export.csv`
- `/api/owner/discounts`
- `/api/owner/notifications` and `export.csv`
- `/api/owner/settings` for organization profile, gateway settings, SMTP settings, security controls, and key rotation
- `/api/owner/profile` for owner account details
- `/api/owner/students` for student account, registration, invite, assignment, payment-history, and notification management

List requests use zero-based `page` and `size` (maximum 100), and return `X-Total-Count`, `X-Page-Number`, and `X-Page-Size`. CSV exports are limited to 10,000 rows and neutralize spreadsheet formula prefixes.

## Student management

The Owner student APIs operate on the existing `Subscriber` collection and are scoped to organizations in the Owner session. A Student is not stored in a separate identity collection.

| Method and path | Purpose / input |
| --- | --- |
| `GET /students` | Paginated student list; supports `search`, account `status`, and `registrationStatus`. |
| `GET /students/registrations` | Pending self-registration applications by default; accepts the same pagination/search filters. |
| `GET /students/export.csv` | CSV of the filtered student list; limited to 10,000 rows. |
| `GET /students/:id` | Scoped student detail; 404 outside the Owner's organization. |
| `POST /students` | Create an active student and send a password invitation; accepts `fullName`, `email`, optional `phone`, and optional active `subscriptionId`. |
| `PUT /students/:id` | Update student profile, account status, or assigned plan. |
| `PATCH /students/:id/status` | Set status to `ACTIVE`, `TRIALING`, `SUSPENDED`, or `INACTIVE`. Deactivation invalidates Student sessions. |
| `POST /students/:id/invite`, `POST /students/:id/resend-invite` | Send a new one-time password link; only its hash is stored; links expire in 48 hours. |
| `PATCH /students/:id/approve` | Approve a pending self-registration and issue the set-password invitation. |
| `PATCH /students/:id/reject` | Reject a pending registration with a required `reason`. |
| `GET /students/:id/courses`, `PUT /students/:id/courses` | Read or replace progress-tracking course assignments. Input is `{courseIds:[...]}`; only published courses from the Owner's organization are accepted. Published courses remain unlocked to all students. |
| `GET /students/:id/payments` | Read the scoped payment ledger for that student. |
| `POST /students/:id/notifications` | Queue an individual student notification; accepts `subject`, `message`, and optional `notificationType`. |
| `DELETE /students/:id` | Remove the student account and access sessions while retaining invoice/payment history. |

`GET /students` response rows include `id`, `organizationId`, contact details, status, registration review reason, `subscriptionId`, `planName`, `inviteStatus`, and lifecycle dates. Invitation tokens and password hashes are never returned.

## Current service boundaries

- Gateway credentials are encrypted at rest; gateway processing and credential verification are not integrated.
- Owner and Student invitation/password messages use SMTP when configured; notification and billing reminder records are queued, not a delivery worker.
- Student payments use the Student portal's sandbox adapter and update shared invoice records; no live payment gateway is connected. Auto Pay is only a saved preference; automatic recurring charges are not scheduled.
- Churn rate is returned as `null` until cancellation history is modeled.
- Reports are generated by downloading a scoped CSV from the selected record endpoint; durable report-job history and PDF/XLSX generation are not implemented.
- Registration documents are optional, stored privately by the Admin API, and downloadable only by authenticated Super Admins.

## Demo data

Set `MONGODB_URI`, `SEED_OWNER_EMAIL`, and `SEED_OWNER_PASSWORD` and run `npm run seed` from `owner/backend`. The seed is idempotent for its demo owner, organization, catalog entries, invoices, and notifications. Do not use the demo password in a deployed environment.
