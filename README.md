# HIIKKY

HIIKKY is a subscription and billing administration system for e-learning businesses. It has an Admin portal and a tenant-scoped Business Owner portal, each with its own Express API and React console.

## Requirements

- Node.js 20+
- MongoDB replica set (bootstrap and business-request approval use transactions)

## Setup and run

Start MongoDB as a replica set. Copy `admin/backend/.env.example` to `admin/backend/.env` and set `MONGODB_URI`, a random `SESSION_SECRET` of at least 32 characters, a separate random `GATEWAY_ENCRYPTION_KEY` of at least 32 characters, `ADMIN_BOOTSTRAP_SECRET` (at least 32 characters), and `CLIENT_ORIGIN`.

```sh
cd admin/backend
npm install
npm run dev
```

In another terminal:

```sh
cd admin/frontend
npm install
npm run dev
```

The Admin API listens on `http://localhost:5000`; Vite serves the console on `http://localhost:5173`. To change the API URL, copy `admin/frontend/.env.example` to `admin/frontend/.env`. Fetch a CSRF token from `GET /api/admin/auth/csrf` before mutations. Create the first Super Admin using `POST /api/admin/setup/first-super-admin`, the CSRF header, and `X-Admin-Bootstrap-Secret`, then remove the bootstrap secret from the environment.

To seed a local Super Admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (minimum 12 characters), then run `npm run seed` from `admin/backend`.

## Business Owner portal

The Owner portal shares the same MongoDB database and business-owner, organization, registration-request, and platform-plan collections as Admin. It uses a separate API port, session cookie, and session collection. Keep both APIs pointed at the same MongoDB replica set so Admin approvals and Owner logins see the same records. Copy `owner/backend/.env.example` to `owner/backend/.env`; configure a separate 32-character-or-longer `SESSION_SECRET` and `SETTINGS_ENCRYPTION_KEY`, and set `MONGODB_URI` to the same database as Admin. The Owner API uses port 5001 and the Owner console uses port 5174.

```sh
cd owner/backend
npm install
npm run dev
```

In another terminal:

```sh
cd owner/frontend
npm install
npm run dev
```

Business signup creates a pending Admin registration request. Admin approval creates an invitation; the owner sets a password from that invitation before signing in. Development mail is logged by the Admin backend. Create an optional local demo workspace by setting `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` (12–72 UTF-8 bytes) in the shell and running `npm run seed` from `owner/backend`; this seed is separate from the Admin Super Admin seed.

Owner API details and current integration boundaries are in [docs/owner-api-reference.md](docs/owner-api-reference.md); run the [Owner QA checklist](docs/owner-qa-checklist.md) once the shared MongoDB replica set is running. Payment provider processing and outbound notification delivery are not connected yet; invoices and notifications are saved and scoped within the organization.

## Project layout

```text
admin/backend/    Express, Mongoose, Admin sessions, APIs, seed script
admin/frontend/   React, Vite, Tailwind Admin application
owner/backend/    Express, Mongoose, isolated Owner sessions and tenant APIs
owner/frontend/   React, Vite, Tailwind Owner application
legacy-java/      Preserved Spring Boot admin source
docs/             API contract and implementation notes
```

The backend uses route, controller, service, and model layers. Admin route details and preserved business rules are in [docs/admin-api-reference.md](docs/admin-api-reference.md). Platform revenue and the support center remain outside the documented backend scope.

## Validation

```sh
cd admin/backend && npm test
cd admin/frontend && npm run build
```
