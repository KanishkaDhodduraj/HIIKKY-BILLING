# HIIKKY – Subscription & Billing Management System for E-Learning Businesses

HIIKKY is a Java-based Subscription and Billing Management System designed specifically for E-Learning businesses. The application helps organizations manage customers, subscription plans, billing, invoices, payments, and business analytics through a secure and scalable architecture. The project is being developed from scratch using Core Java and JDBC before migrating to Spring Boot and a modern web frontend.

## Project Objective

The objective of HIIKKY is to provide an efficient platform for E-Learning organizations to automate their subscription lifecycle, customer management, invoice generation, and payment tracking while maintaining a clean enterprise-level software architecture.

## **DESIGN**

The UI design and visual references for HIIKKY were created using Google Stitch.

🔗 **[View HIIKKY Design](https://stitch.withgoogle.com/projects/9420354014919519472)**

## Features

* Organization Management
* Customer Management
* Authentication & Authorization
* Subscription Plan Management
* Billing & Invoice Generation
* Payment Management
* Dashboard & Business Analytics
* Email Notifications
* Revenue Reports
* Role-Based Access Control

## Admin Dashboard and Account Workflows

The Spring Boot admin API exposes `GET /api/admin/dashboard` to Super Admins. Dashboard metric definitions and filters:

| Metric | Meaning and calculation | Source and date filtering |
| --- | --- | --- |
| `platformSummary.businessOwnerCount` | Current number of owner records | `business_owners`; not date-filtered |
| `platformSummary.organizationCount` | Current number of organization records | `organizations`; not date-filtered |
| `platformSummary.adminAccountCount` | Number of admin accounts, including disabled accounts | `admin_accounts`; not date-filtered |
| `businessOwners.total`, `active`, `inactive` | Current owner count and its `ACTIVE`/`INACTIVE` split | `business_owners`; not date-filtered |
| `businessOwners.registeredInRange` | Number of owner records created in the selected period | `business_owners.created_at`; all-time when dates are omitted |
| `organizations.total`, `active`, `inactive` | Current organization count and its `ACTIVE`/`INACTIVE` split | `organizations`; not date-filtered |
| `organizations.createdInRange` | Number of organization records created in the selected period | `organizations.created_at`; all-time when dates are omitted |
| `adminAccounts.total`, `enabled`, `disabled` | Current admin account count and its enabled/disabled split | `admin_accounts.enabled`; not date-filtered |
| `recentActivity` | Latest recorded creation or update for each current owner, organization, or admin account | Their `created_at`/`updated_at`; filters on latest timestamp, newest first; activity page defaults to 0/20, supports page sizes 1-100 |

Supply both `fromDate` and `toDate` as ISO dates to filter period counts and activity. The window includes both dates (from the start of `fromDate` through the end of `toDate`). Supplying only one date is rejected. Current totals/statuses are snapshots and do not change with this date filter. Dashboard activity returns `recentActivityTotal`, `recentActivityPage`, and `recentActivitySize`. Every request reads the database directly, and an empty activity result is returned as an empty list. Timestamp filtering and date grouping use the database session timezone; no application-level timezone conversion is applied.

Recent activity is derived from each record's creation and update timestamps. An update is shown only when `updated_at > created_at`; this is the latest recorded change per current record, not a complete audit history. It does not identify a specific field or actor.

### Admin module operations and scope

| Module | Supported operations and rules |
| --- | --- |
| Business Owners | `GET /api/admin/business-owners` lists, searches (case-insensitive partial match across name, email, and phone), filters by `status` and `organizationId`, and paginates. Search and filters are ANDed; search fields are ORed. Defaults: `page=0`, `size=20`, maximum size 100, `sortBy=id`, `sortDirection=ASC`; supported sort fields are `id`, `firstName`, `lastName`, `email`, `status`, `createdAt`, `updatedAt`, with `id ASC` as stable tie-breaker. `X-Total-Count` is the filtered count. A nonexistent organization filter returns 404. Super Admins can retrieve details/associated organizations, create/edit contact fields, and activate/deactivate; duplicate email returns 409, missing owners 404, invalid fields 400 with `fieldErrors`. Statuses are only `ACTIVE` and `INACTIVE`; repeated setting to the current status is idempotent. Owner records do not have an authentication/session subsystem here, so changing owner status does not invalidate sessions. `updated_at` is the only status-change trace; there is no status-history or actor-audit table. |
| Platform Analytics | `GET /api/admin/analytics/registrations` aggregates daily owner, organization, and admin-account registrations and updates from their `created_at`/`updated_at` timestamps. `groupBy=DAY|WEEK|MONTH` (default DAY); weeks start Monday. Both ISO `fromDate` and `toDate` are required together; range is inclusive. Grouping is in database-session timezone. Current rows contribute at most one registration event and at most one latest-update event each; no joins are used, so entities are not multiplied. Empty periods return an empty list and zero totals. Super Admin only. |
| Profile | `GET /api/admin/profile` returns safe `id`, `email`, `role`, and `enabled` fields for the authenticated admin. `PATCH /api/admin/profile` accepts `currentPassword` (required), and optional `email` and/or `newPassword`; current password is verified, email is unique, passwords are stored with the existing password encoder, role/enabled cannot be changed, and the authenticated session principal is refreshed after a successful update. |
| Logout | `POST /api/admin/auth/logout` requires authentication, invalidates the HTTP session, clears the security context, and expires the `JSESSIONID` cookie. A subsequent protected request with that session is unauthorized. |
| Business Requests | Public `POST /api/organization-registration-applications` accepts a CSRF-protected registration submission. Super Admins can list/search/filter/sort/page requests, view details and decision history, and approve/reject with `PATCH /api/admin/business-requests/{id}/approve` or `/reject`. Statuses are `PENDING`, `APPROVED`, and `REJECTED`; only pending requests may be decided and rejection requires a reason. Approval transactionally creates an active Business Owner and assigned Organization. Matching pending applications are blocked; rejected applications can be resubmitted. See the API reference for fields, filters, rate limits, and responses. |

### Blocked admin modules

* **Revenue — BLOCKED for platform revenue.** The separate owner-console billing code refers to business invoices with `amount`, `payment_status`, and `paid_date`, and counts paid bill amounts as that organization's collected billing. These are not evidence of HIIKKY platform earnings. The Admin database has no shared financial ledger, payment settlement records, platform fee/commission rules, or link to payment-provider transactions; taking invoice totals as HIIKKY revenue would be incorrect. Define the platform's revenue-recognition rule and provide auditable platform transaction data before adding an Admin revenue report.
* **Support Center — BLOCKED.** No support-ticket, conversation/message, assignee, status, or support-history tables/endpoints exist. Required decisions include ticket intake fields, requester identity/tenant scope, status lifecycle, assignment permissions, reply visibility, and retention/audit rules.
* **Notifications — PARTIAL.** Super Admins can list and view the legacy `notification` dispatch-history records through `GET /api/admin/notifications` and `GET /api/admin/notifications/{id}`. The list supports search, exact type/recipient/status filters, inclusive date filters, sorting, and pagination. These are global outgoing-dispatch records, not per-Admin inbox items or proof of delivery; the legacy code marks inserted records `DISPATCHED` but contains no sender integration. Read/unread, bulk-read, and sending are not implemented because the schema and behavior are not defined. The Admin schema script declares the compatible dispatch table; `billing_notifications` remain tenant billing records and are excluded.
* **Reports — PARTIAL.** Super Admins can retrieve and export Business Owner and Organization directory reports using `/api/admin/reports/business-owners`, `/organizations`, and corresponding `.csv` endpoints. Reports use existing Admin tables only; exports are limited to 10,000 rows and do not expose credentials or count tenant billing as platform revenue. Any additional named reports remain blocked until their purpose, source-of-truth data, calculations, filters, authorization, and export requirements are defined.
* **Settings — BLOCKED.** There is no persisted Admin settings table or list of settings managed by an Admin. Runtime connection, cookie, and server settings remain deployment configuration and must not be exposed as editable Admin data. Product requirements must identify safe settings, allowed values, persistence, effect timing, and audit needs.

### Admin session security

Session-based mutations require a CSRF token. Before login, call `GET /api/admin/auth/csrf`, preserve the returned session cookie, and send the returned token using its `headerName` (`X-CSRF-TOKEN`) with login and subsequent state-changing requests. Login rotates the session ID and CSRF token; fetch a fresh token after login. Failed logins are throttled after 10 failures from the same remote address in 15 minutes; a successful login clears the counter. This is process-local throttling, not account lockout, and multi-instance deployments need a shared edge or rate-limit store.

The normal application datasource defaults to `jdbc:mysql://localhost:3306/hiikky_db` (overridable through `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`). Automated tests use the isolated H2 URL in `application-test.yaml`. The live MySQL connection was not verified because database environment variables and a MySQL client are unavailable in this environment.

## Tech Stack

### Backend

* Java
* JDBC
* MySQL

### IDE

* IntelliJ IDEA

### Version Control

* Git
* GitHub

### Future Technologies

* Spring Boot
* REST API
* React
* Razorpay Payment Gateway
* JavaMail (SMTP)
* JWT Authentication

## Project Architecture

```
Main
 │
 ▼
Menu Layer
 │
 ▼
Service Layer
 │
 ▼
DAO Layer
 │
 ▼
Database (MySQL)
```

The project follows a layered architecture where each layer has a single responsibility, making the application modular, maintainable, and scalable.

## Database

Database Name

```
hiikky_db
```

## Folder Structure

```
HIIKKY
│
├── src
│   └── com
│       └── hiikky
│         
├── lib
│
└── README.md
```

## Software Requirements

* Java JDK 21+ (or later)
* IntelliJ IDEA
* MySQL Server
* MySQL Connector/J
* Git

## Learning Objectives

This project is developed to strengthen knowledge in:

* Object-Oriented Programming
* JDBC
* SQL
* Layered Architecture
* DAO Pattern
* Service Layer
* CRUD Operations
* Git & GitHub
* Enterprise Java Development
* Software Design Principles

## Future Enhancements

* Customer Module
* Subscription Module
* Invoice Module
* Payment Gateway Integration
* Dashboard Analytics
* Email Notifications
* Spring Boot Migration
* REST APIs
* React Frontend
* Mobile Application Support

## Development Workflow

Each module is developed using the following workflow:

1. Concept Understanding
2. Architecture Design
3. Implementation
4. Validation
5. Testing
6. Debugging
7. Git Commit
8. Documentation

Developing HIIKKY as an enterprise-level software project to gain practical experience in Java backend development, software architecture, database design.
