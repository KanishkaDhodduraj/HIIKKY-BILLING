# Student portal QA checklist

## Automated validation

| Check | Expected | Result |
| --- | --- | --- |
| Student backend tests | Registration pending state, one-time password token, cross-student/organization scope, payment idempotency, zero-charge settlement, notification pagination, account/org/owner revalidation | **PASS** — 7 tests |
| Owner student/auth/billing tests | Invitation/registration and Owner billing behavior | **PASS** — 3 suites, 15 tests |
| Admin student report/block tests | Student report, dashboard counts, block/unblock, Owner/org cascade, shared payment report | **PASS** — 5 tests |
| Student frontend production build | All Student routes compile | **PASS** |
| Owner frontend production build | Student management route compiles | **PASS** |
| Admin frontend production build | Student report route compiles | **PASS** |
| Three-portal browser flow | Register → approve → set password → login → assign plan/course → invoice → sandbox payment → Admin/org block | **NOT VERIFIED** — browser stack was not run against a shared persistent MongoDB instance |

## Student pages and controls

The UI implementation is API-backed. **NOT BROWSER VERIFIED** means the route built but has not been exercised in a live browser against the integrated stack.

| Page | Controls and expected behavior | Status |
| --- | --- | --- |
| Login | Submit credentials; show API and field errors; reject pending/blocked/inactive accounts; Forgot password and Create account links navigate to their forms. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| Register | Load active organization names; validate full name/email/phone; submit a PENDING application; show submitted state and owner-review instructions. | **IMPLEMENTED; API registration test PASS; NOT BROWSER VERIFIED** |
| Registration submitted | Explain owner review and link back to login. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| Set/reset password | Read one-time token from link; validate matching 12+ character password; call set-password; show field/API errors; link is one-time and expires. | **IMPLEMENTED; API token test PASS; NOT BROWSER VERIFIED** |
| Forgot password | Submit email; show generic message without revealing whether the account exists. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| Dashboard | Show plan/status/dates, unpaid amount/next due date, course progress/activity, recent invoices; Browse courses, View all, plan and invoice links open their pages. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| My Courses | Search, category, sort, filter, pagination, status/progress, Open course. | **IMPLEMENTED; scoping API test PASS; NOT BROWSER VERIFIED** |
| Course detail/installments | Open course records last access; progress slider and Save progress update the Student record; installments are read-only; return link navigates to courses. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| Subscription | View current plan and billing cycle/dates/status; choose a plan and optional discount to create an invoice; create renewal invoice; cancellation confirmation ends the plan immediately. | **IMPLEMENTED; payment/plan API test coverage partial; NOT BROWSER VERIFIED** |
| Invoices | Search/status/due-date filters; pagination; View opens detail; Print/PDF opens printable invoice; Export CSV uses current filters; Pay now uses the sandbox payment endpoint and refreshes invoice status. | **IMPLEMENTED; idempotency/zero-charge API tests PASS; NOT BROWSER VERIFIED** |
| Payment history | Paginated Payment ledger; Invoice action opens printable invoice. | **IMPLEMENTED; payment API tested; NOT BROWSER VERIFIED** |
| Notifications | Category/unread filters; View detail; Mark read; Mark all read; Clear inbox confirmation; pagination. | **IMPLEMENTED; 105-record paging/read API test PASS; NOT BROWSER VERIFIED** |
| Auto Pay | Add sandbox token label, rename, set default, remove with confirmation, select method, save preference, view due schedule, navigate to invoices. UI explicitly states automatic charges are not scheduled. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| Auto Renew | View monthly payment history and subscription invoices; create a renewal invoice and follow the invoice link. UI explicitly states renewal is not automatic. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| My Profile | Edit name/email/phone and email notification preference; change password; current password is required; API field errors shown; profile context refreshes after save. | **IMPLEMENTED; NOT BROWSER VERIFIED** |
| Sidebar/header/logout | Responsive menu and links navigate to all pages; logout destroys the isolated Student session. | **IMPLEMENTED; session API tested; NOT BROWSER VERIFIED** |

## Cross-portal flow to run with MongoDB

- [ ] Start Admin API/UI on 5000/5173, Owner API/UI on 5001/5174, and Student API/UI on 5002/5175. All APIs use the same replica-set `MONGODB_URI`, distinct session secrets/cookies, and the correct local client origin.
- [ ] Submit a Student registration; verify the Owner sees the PENDING application and it cannot log in.
- [ ] Owner approves; confirm invitation token is hashed, expires within 48 hours, is not returned in Owner API JSON, and the link can set one password once.
- [ ] Student logs in and sees only their own records; attempt another Student's invoice/course URL and expect 404.
- [ ] Owner assigns a plan/course and generates an invoice; Student sees the shared plan/course/invoice after reload.
- [ ] Student pays an unpaid invoice using sandbox; verify one Payment record, paid invoice/date, and visibility in Owner billing and Admin student-payment report.
- [ ] Admin blocks the Student; verify active session deletion and rejection on the next authenticated request.
- [ ] Admin deactivates the organization or owner; verify student sessions are deleted and Student login is blocked.

## Known boundaries

- The Student portal does not implement course lesson content because the shared Course model has no learning-content schema.
- Auto Pay and Auto Renew do not run background recurring charges; their limitations are shown in the UI.
- Full cross-portal browser verification requires a shared local MongoDB replica set and is pending.
