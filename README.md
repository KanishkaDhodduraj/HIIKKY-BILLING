# HIIKKY

HIIKKY is a subscription and billing administration system for e-learning businesses. The current web migration uses an Express/MongoDB API and a React admin console for `ADMIN` and `SUPER_ADMIN` accounts.

## Requirements

- Node.js 20+
- MongoDB replica set (transactions are used by bootstrap and business-request approval)

## Setup

1. Start a local MongoDB replica set and copy `backend/.env.example` to `backend/.env`.
2. Set `MONGODB_URI`, a random `SESSION_SECRET` of at least 32 characters, the one-time `ADMIN_BOOTSTRAP_SECRET` (at least 32 characters), and `CLIENT_ORIGIN`.
3. Install and start each app:

```sh
cd backend
npm install
npm run dev
```

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

The API listens on `http://localhost:4000`; Vite serves the console on `http://localhost:5173`. Fetch a CSRF token from `GET /api/admin/auth/csrf` before mutations. The first Super Admin is created using `POST /api/admin/auth/setup/first-super-admin`, the CSRF header, and `X-Admin-Bootstrap-Secret`. Remove the bootstrap secret from the environment after setup.

An optional local admin seed can be created with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (minimum 12 characters), then `npm run seed` from `backend`.

## Project layout

```text
backend/       Express, Mongoose, sessions, APIs, seed script
frontend/      React, Vite, Tailwind admin application
legacy-java/   Preserved Spring Boot admin source
docs/          API contract and implementation notes
organization-owner-console/  Preserved legacy console (out of migration scope)
```

The API follows `routes -> controller -> service -> repository/model` module boundaries. Admin route details and the preserved business rules are in [docs/admin-api-reference.md](docs/admin-api-reference.md). Platform revenue and the support center remain out of scope because the legacy data does not define their source or rules.

## Validation

```sh
cd backend && npm test
cd frontend && npm run build
```
