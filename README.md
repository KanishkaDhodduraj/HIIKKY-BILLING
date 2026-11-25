# HIIKKY

HIIKKY provides separate Admin, Business Owner, and Student portals. All three APIs use the same MongoDB database and the same Subscriber records for student identity, billing, and course data. Each API keeps its own session cookie and session collection.

## Requirements and shared configuration

- Node.js 20+
- A MongoDB replica set; invoice payments, approval, and course assignment use transactions.
- Configure all three backend `.env` files with the same `MONGODB_URI` and distinct random `SESSION_SECRET` values (at least 32 characters).
- The Student API uses sandbox payments only. No live payment credentials are required.
- Configure SMTP for delivered mail. Set `STUDENT_PORTAL_URL` in `owner/backend/.env` to the Student login URL. In development without SMTP, invitation emails are printed by the Owner API and written to `owner/backend/.dev-outbox.jsonl`; Student password/reset emails are written to `student/backend/.dev-outbox.jsonl`.

## Projects and ports

| Project | API | Frontend | Environment |
| --- | --- | --- | --- |
| Admin | `http://localhost:5000` | `http://localhost:5173` | `admin/backend/.env`, `admin/frontend/.env` |
| Business Owner | `http://localhost:5001` | `http://localhost:5174` | `owner/backend/.env`, `owner/frontend/.env` |
| Student | `http://localhost:5002` | `http://localhost:5175` | `student/backend/.env`, `student/frontend/.env` |

Copy each project's `.env.example` to `.env`. Set the Admin bootstrap/encryption settings, Owner settings encryption key and SMTP settings, and Student mail settings as documented in those examples. Set each frontend API URL only when using non-default ports.

## Run all six projects

Start each API and frontend in its own terminal after MongoDB is available:

```powershell
Set-Location admin/backend; npm install; npm run dev
Set-Location admin/frontend; npm install; npm run dev
Set-Location owner/backend; npm install; npm run dev
Set-Location owner/frontend; npm install; npm run dev
Set-Location student/backend; npm install; npm run dev
Set-Location student/frontend; npm install; npm run dev
```

The Admin bootstrap endpoint is `POST /api/admin/setup/first-super-admin`; set `ADMIN_BOOTSTRAP_SECRET`, send a CSRF token, and remove the bootstrap secret after setup. Admin can also seed a local account with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` followed by `npm run seed` in `admin/backend`. Owner demo data is seeded with `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` in `owner/backend`. Student data is seeded with `SEED_STUDENT_PASSWORD` and optional identity/organization overrides in `student/backend` (`npm run seed`); use a private environment value and do not deploy the seed password.

## How records are shared

- Admin manages organizations and owners, sees student counts and reports, and can block/unblock student access. Deactivating an owner or organization removes student sessions.
- The Owner portal manages students and registrations, plans, courses, invoices, and notifications. Student accounts are Owner Subscribers; no duplicate student identity table is used.
- Owner-created Students receive a 72-hour temporary password by email, sign in, and must set a new password before using the portal. Owners can resend an unclaimed invitation or reset an active Student's password; students can use the 30-minute forgot-password email flow.
- Students see only their own organization-scoped data. Invoice payment uses a sandbox adapter, creates a Payment record, and updates the shared invoice in a MongoDB transaction. Owner billing and Admin payment reports read those same records.
- Course assignments support progress tracking. All published organization courses are unlocked for students. Automatic recurring charges are not scheduled; Auto Pay records a preference and clearly indicates this limitation.

API contracts and QA steps:

- [Admin API](docs/admin-api-reference.md) · [Admin QA](docs/admin-qa-checklist.md)
- [Owner API](docs/owner-api-reference.md) · [Owner QA](docs/owner-qa-checklist.md)
- [Student API](docs/student-api-reference.md) · [Student QA](docs/student-qa-checklist.md)

## Project layout

```text
admin/backend/    Express, Mongoose, Admin API and sessions
admin/frontend/   React, Vite, Tailwind Admin portal
owner/backend/    Express, Mongoose, tenant-scoped Owner API and sessions
owner/frontend/   React, Vite, Tailwind Owner portal
student/backend/  Express, Mongoose, Student API and isolated sessions
student/frontend/ React, Vite, Tailwind Student portal
legacy-java/      Preserved Java source
docs/             API references and QA checklists
```

## Validation

```powershell
Set-Location student/backend; npm test
Set-Location student/frontend; npm run build
Set-Location owner/backend; npm test
Set-Location owner/frontend; npm run build
Set-Location admin/backend; npm test
Set-Location admin/frontend; npm run build
```

The shared-stack invitation browser flow is available with `npm run test:e2e` from `student/frontend`. Set `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD`, run all six apps against the same development MongoDB replica set, and use the development Owner email outbox.
