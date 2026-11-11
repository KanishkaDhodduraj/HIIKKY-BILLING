# Owner portal QA checklist

## Automated checks completed

- [x] Owner frontend production build (`npm run build`)
- [x] Owner backend Jest suite covers auth, expired/one-use password tokens, and tenant scoping
- [x] Owner student/auth/billing suites pass (15 tests); student create/invite, approval/rejection, scoped assignments, payments, and notification API are covered.
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
- [ ] Create/invite a Student, approve/reject a self-registration with required reason, resend an invitation, and verify password links are hashed, one-time, and expire within 48 hours.
- [ ] Assign a plan and published courses; verify all published courses are unlocked in Student while assignment progress remains scoped.
- [ ] Check Student payments in the Owner view; verify Student-generated sandbox payments update the shared invoice.
- [ ] Confirm CSV downloads and pagination in the browser.
- [ ] Verify Admin deactivation blocks new and existing Owner sessions.

The targeted tests use MongoDB memory replica sets. The full multi-portal browser flow remains **NOT VERIFIED**; it requires all six projects running against one shared replica set.
