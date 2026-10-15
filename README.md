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
| `recentActivity` | Latest recorded creation or update for each current owner/organization, newest 20 first | `business_owners` and `organizations`; filters on the latest of each record's `created_at`/`updated_at` |

Supply both `fromDate` and `toDate` as ISO dates to filter the period counts and activity. The window includes both dates (from the start of `fromDate` through the end of `toDate`). Supplying only one date is rejected. Current totals/statuses are snapshots and do not change with this date filter. Every request reads the database directly, and an empty activity result is returned as an empty list.

Recent activity is derived from each owner's or organization's `created_at` and `updated_at` timestamps. It represents only the latest recorded change to each current record, not a complete audit history. Revenue, support activity, and business-request metrics are not exposed because the admin schema has no corresponding payment, support, or request tables. The current owner workflow supports `ACTIVE`/`INACTIVE` account status, not registration approval or rejection. Business-owner administration is restricted to Super Admins; no separate business-request workflow exists in the application schema.

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
