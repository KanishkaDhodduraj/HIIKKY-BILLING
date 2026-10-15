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

### Blocked admin modules

* **Business Requests — BLOCKED.** There is no request table/entity, intake API, or request status in the Admin schema/application. To implement this, the product must specify the request submission source and fields, duplicate identity rules, request statuses and allowed transitions, approval/rejection effects on owner/org creation, rejection reason policy, assignment/notifications, and required history/audit retention. Existing active/inactive owner records are not requests.
* **Revenue — BLOCKED for platform revenue.** The separate owner-console billing code refers to business invoices with `amount`, `payment_status`, and `paid_date`, and counts paid bill amounts as that organization's collected billing. These are not evidence of HIIKKY platform earnings. The Admin database has no shared financial ledger, payment settlement records, platform fee/commission rules, or link to payment-provider transactions; taking invoice totals as HIIKKY revenue would be incorrect. Define the platform's revenue-recognition rule and provide auditable platform transaction data before adding an Admin revenue report.
* **Support Center — BLOCKED.** No support-ticket, conversation/message, assignee, status, or support-history tables/endpoints exist. Required decisions include ticket intake fields, requester identity/tenant scope, status lifecycle, assignment permissions, reply visibility, and retention/audit rules.
* **Notifications — BLOCKED for an Admin notification center.** The legacy owner console references `notification` and `billing_notifications`, but the Admin schema has no DDL for either. The generic notification code has recipient type but no authenticated recipient/owner identity or read-state endpoint; billing notifications link to billing, organization, and subscriber records and are not Super Admin-private notifications. Define which events belong in the Admin center, recipient/tenant visibility, read-state ownership, and retention, then supply the corresponding schema.
* **Reports — BLOCKED for Admin reports.** Existing report code is a console menu for organization billing/subscription/student/course aggregates, not a Super Admin reporting contract. The Admin schema contains only accounts, owners, and organizations. Specify which platform reports are required, their source-of-truth data, date/filter/pagination rules, access scope, and export requirements. Dashboard and Analytics remain the supported Admin aggregates; duplicate report endpoints are not added.
* **Settings — BLOCKED.** There is no persisted Admin settings table or list of settings managed by an Admin. Runtime connection, cookie, and server settings remain deployment configuration and must not be exposed as editable Admin data. Product requirements must identify safe settings, allowed values, persistence, effect timing, and audit needs.

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
