# HIIKKY

HIIKKY is a subscription and billing administration system for e-learning businesses. The admin web application is split into two projects under `admin/`: an Express/MongoDB API and a React console for `ADMIN` and `SUPER_ADMIN` accounts.

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

The API listens on `http://localhost:5000`; Vite serves the console on `http://localhost:5173`. To change the API URL, copy `admin/frontend/.env.example` to `admin/frontend/.env`. Fetch a CSRF token from `GET /api/admin/auth/csrf` before mutations. Create the first Super Admin using `POST /api/admin/setup/first-super-admin`, the CSRF header, and `X-Admin-Bootstrap-Secret`, then remove the bootstrap secret from the environment.

To seed a local Super Admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (minimum 12 characters), then run `npm run seed` from `admin/backend`.

## Project layout

```text
admin/backend/    Express, Mongoose, sessions, APIs, seed script
admin/frontend/   React, Vite, Tailwind admin application
legacy-java/      Preserved Spring Boot admin source
docs/             API contract and implementation notes
organization-owner-console/  Preserved legacy console (out of migration scope)
```

The backend uses route, controller, service, and model layers. Admin route details and preserved business rules are in [docs/admin-api-reference.md](docs/admin-api-reference.md). Platform revenue and the support center remain outside the documented backend scope.

## Validation

```sh
cd admin/backend && npm test
cd admin/frontend && npm run build
```
