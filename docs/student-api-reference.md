# Student portal API

The Student API listens on port `5002` under `/api/student`. It uses the shared MongoDB database and the Owner's `Subscriber`, `Subscription`, `Course`, `CourseInstallment`, `Billing`, and `BillingNotification` records. It has a separate `hiikky.student.sid` cookie and `student_sessions` collection. Do not copy Student data into another identity collection.

All responses use `{success,message,data,timestamp,fieldErrors}`. Validation errors include `fieldErrors`. List endpoints include `X-Total-Count`, `X-Page-Number`, and `X-Page-Size`; pages start at zero and `size` is limited to 100. All state-changing requests require the CSRF token from `GET /api/student/auth/csrf` in `X-CSRF-TOKEN`.

## Authentication and registration

| Method and path | Access | Behavior |
| --- | --- | --- |
| `GET /auth/csrf` | Public | Issues a CSRF token and cookie. |
| `POST /auth/login` | Public + CSRF | `{email,password,organizationId?}`. Ten failed logins per address per 15 minutes returns 429. Login requires an approved, active student and active organization and owner. |
| `POST /auth/logout` | Student + CSRF | Destroys the Student session and expires its cookies. |
| `GET /auth/me` | Student | Returns the current Student profile. |
| `GET /profile` | Student | Returns safe profile fields. |
| `PATCH /profile` | Student + CSRF | Requires `currentPassword`; can update `fullName`, `email`, `phone`, `avatarData`, `emailNotificationsEnabled`, and `newPassword`. Passwords require 12..72 characters. |
| `GET /registration/organizations` | Public | Lists names and IDs of organizations whose organization and owner are ACTIVE. |
| `POST /registration` | Public + CSRF | `{organizationId,fullName,email,phone?}`; creates a PENDING student application. Ten attempts per address per 15 minutes returns 429. |
| `POST /auth/forgot-password` | Public + CSRF | `{email}`; returns a generic success message to avoid account discovery. |
| `POST /auth/set-password` | Public + CSRF | `{token,password}`; consumes a one-time invitation/reset token. |
| `POST /auth/reset-password` | Public + CSRF | Alias for the one-time token password setter. |

Invitation/reset token hashes are persisted; raw tokens are never returned by Student APIs. Owner invitations expire after 48 hours. Login and every authenticated request re-check the Student, organization, and owner statuses; invalid sessions are destroyed.

## Student workspace

All workspace routes require an authenticated `STUDENT` session. The student and organization IDs are read only from that session; request body, query, and URL IDs never widen the scope. Out-of-scope records return 404.

| Method and path | Behavior |
| --- | --- |
| `GET /dashboard` | Summary, plan status/dates, unpaid totals, next due date, course progress, activity, and recent invoices. |
| `GET /courses` | Lists all published courses in the current organization; supports `page`, `size`, `search`, `category`, and `sortBy=courseName`. Published courses are unlocked. |
| `GET /courses/:courseId` | Scoped course detail and read-only course installments. |
| `GET /courses/:courseId/installments` | Scoped, read-only installment list. |
| `POST /courses/:courseId/access` | Records last access for the current student. |
| `PATCH /courses/:courseId/progress` | `{progressPercent:0..100}`; records current student's progress. |
| `GET /subscription` | Current plan, active plans in the organization, billing cycle, dates, status, and Auto Pay preference. |
| `POST /subscription/change` | `{subscriptionId,discountCode?}`; creates an invoice. A plan change is applied only after payment succeeds. |
| `POST /subscription/renew` | `{discountCode?}`; creates a renewal invoice for the current plan. |
| `POST /subscription/cancel` | Ends the current subscription now and disables the Auto Pay preference; it does not deactivate the Student account. |
| `GET /invoices` | Scoped invoices; optional `status=PAID|UNPAID|OVERDUE`, `search`, `fromDate`, `toDate`, `page`, and `size`. |
| `GET /invoices/:id` | Scoped invoice detail; another Student's invoice returns 404. |
| `GET /invoices/:id/print` | Scoped printable HTML invoice; browser print can save it as PDF. |
| `GET /invoices/export.csv` | Filtered invoice CSV; capped at 10,000 rows. |
| `POST /invoices/:id/pay` | `{paymentMethodId?}` plus `Idempotency-Key`; sandbox-only. Updates shared `Billing` and creates one `Payment` in a transaction. Zero-value invoices settle as `NO_CHARGE`. |
| `GET /payments` | Paginated Student payment history. |
| `GET /payment-methods` | Lists safe method labels and token metadata; no payment credentials are returned. |
| `POST /payment-methods` | Adds a sandbox token label; accepts type, label, and optional brand/last-four/expiry values. Never send full card number or security code. |
| `PATCH /payment-methods/:id` | Updates the display label. |
| `PATCH /payment-methods/:id/default` | Selects the default sandbox method. |
| `DELETE /payment-methods/:id` | Removes the method and selects another default when available. |
| `GET /auto-pay`, `PATCH /auto-pay` | Reads or saves `{enabled,paymentMethodId?}` preference and upcoming unpaid invoice schedule. |
| `GET /auto-renew/analytics` | Payment totals/counts grouped by month. |
| `GET /auto-renew/reports` | Subscription invoice history. |
| `GET /notifications` | Paginated notifications; optional `category=ALL|BILLING|COURSES` and `unreadOnly=true`. |
| `GET /notifications/:id` | Scoped notification detail. |
| `PATCH /notifications/:id/read` | Marks one notification read for the current Student. |
| `POST /notifications/read-all` | Marks visible Student notifications read. |
| `DELETE /notifications` | Clears notifications from the current Student inbox. |
| `GET /billing/summary` | Alias for the dashboard summary. |

## Integration boundaries

- Owner plan, invoice, payment, course, and notification changes use shared collections and are visible to Students after refresh.
- Admin blocking sets `accessBlocked` and deletes Student sessions. Organization or Owner deactivation also removes Student sessions; middleware revalidates status on each request.
- The payment adapter is a sandbox stub and does not charge a real provider. Payment method records hold sandbox token references only.
- Auto Pay is a stored preference; no recurring charge scheduler is implemented. Auto Renew creates an invoice on request; renewal is not charged automatically.
- The existing Course model contains catalog metadata, not lesson content. Progress is a student activity record, not a lesson-completion system.
- Transaction-backed payment and plan updates require MongoDB replica-set support.
