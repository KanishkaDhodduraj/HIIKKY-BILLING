# Owner portal QA checklist

## Automated checks completed

- [x] Owner frontend production build (`npm run build`)
- [x] Owner backend Jest suite (3 suites, 12 tests)
- [x] `git diff --check`
- [x] Registration is pending until Admin approval; password is set through the invitation flow.
- [x] Document upload is optional and can be skipped at registration.
- [x] Tenant scoped APIs cover customers, plans, courses/installments, invoices, discounts, analytics, notifications, and settings.
- [x] CSV exports cap results at 10,000 records and neutralize spreadsheet formula prefixes.

## Local integration checks to run with MongoDB available

MongoDB must be running as a replica set and both APIs must use the same `MONGODB_URI`.

- [ ] Run Admin API on port 5000 and Owner API on port 5001.
- [ ] Run Admin console on port 5173 and Owner console on port 5174.
- [ ] Submit a business registration from the Owner signup flow and confirm it appears under Admin Business Requests.
- [ ] Approve the request; confirm the invitation is logged in development, set the owner password, and sign in.
- [ ] Verify the owner dashboard and all list/detail operations are scoped to that owner’s organization.
- [ ] Create a customer, course, course installment, subscription plan, discount, invoice, and queued notification; confirm each appears in the respective table.
- [ ] Confirm CSV downloads and pagination in the browser.
- [ ] Verify Admin deactivation blocks new and existing Owner sessions.

These live integration checks were not run in this workspace because no MongoDB listener was available on `127.0.0.1:27017` during implementation.
