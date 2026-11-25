# Owner portal QA checklist

## Automated checks completed

- [x] Owner frontend production build (`npm run build`)
- [x] Owner backend Jest suite covers auth, expired/one-use password tokens, and tenant scoping
- [x] Owner backend suites pass (23 tests); student create/invite, email-failure handling, resend/reset, CSV, approval/rejection, scoped assignments, payments, and notification API are covered.
- [x] Student creation tests cover invite on/off, no password in owner responses, email failure persistence, resend invalidation/5-per-day cap, CSV row outcomes, and tenant 404s.
- [x] Owner student management page includes search/filter/CSV, create/resend invitation, registration decisions, plan/course assignment, payment visibility, notifications, activate/deactivate, and confirmed delete.
- [x] `git diff --check`
- [x] Registration is pending until Admin approval; password is set through the invitation flow.
- [x] Document upload is optional, validated as PDF/JPG/PNG up to 5 MiB, and stored privately by Admin.
- [x] Tenant scoped APIs cover customers, plans, courses/installments, invoices, discounts, analytics, notifications, and settings.
- [x] CSV exports cap results at 10,000 records and neutralize spreadsheet formula prefixes.

## Local integration checks to run with MongoDB available

MongoDB must be running as a replica set and both APIs must use the same `MONGODB_URI`.

- [ ] Run Admin API on port 5000 and Owner API on port 5001.
- [ ] Run Admin console on port 5173 and Owner console on port 5174.
- [ ] Run Student API on port 5002 and Student portal on port 5175.
- [ ] Submit a business registration from the Owner signup flow and confirm all details, file link, notification, pending dashboard count, and sidebar badge appear in Admin.
- [ ] Approve the request; confirm the 48-hour invitation is logged in development and shown once in the approval result, set the owner password, and sign in.
- [ ] Check PENDING, APPROVED, and REJECTED status by application reference; verify rejection reason and resubmission.
- [ ] Verify duplicate submission returns 409, invalid email/upload returns 400, oversized upload returns 413, and rate limit returns 429.
- [ ] Verify the owner dashboard and all list/detail operations are scoped to that owner’s organization.
- [ ] Create a customer, course, course installment, subscription plan, discount, invoice, and queued notification; confirm each appears in the respective table.
- [ ] Create a Student with and without invitation; read the development email from `owner/backend/.dev-outbox.jsonl`; log in with the temporary password; verify first-login password change is mandatory before reaching the dashboard.
- [ ] Verify `INVITE_FAILED` after provider failure, resend creates a new password and invalidates the old password, the rolling 24-hour limit is five, and active-student reset requires a new password.
- [ ] Import CSV with created, duplicate, invalid, and email-failed rows; verify the per-row report and 500-row cap.
- [ ] Approve/reject a self-registration with required reason and confirm its legacy one-time set-password link remains hashed, one-time, and expires within 48 hours.
- [ ] Assign a plan and published courses; verify all published courses are unlocked in Student while assignment progress remains scoped.
- [ ] Check Student payments in the Owner view; verify Student-generated sandbox payments update the shared invoice.
- [ ] Confirm CSV downloads and pagination in the browser.
- [ ] Verify Admin deactivation blocks new and existing Owner sessions.

The targeted tests use MongoDB memory replica sets. The full multi-portal browser flow remains **NOT VERIFIED**; it requires all six projects running against one shared replica set.
