# ADR-003: Use MySQL as the Database

## Status

Accepted

## Date

2026-08-09

## Context

HIIKKY requires a relational database to store and manage structured business data.

## Decision

MySQL was selected as the database for the current version of HIIKKY.

## Reasons

* Relational database model
* SQL support
* Structured data management
* Support for relationships between entities
* Suitable for transactional business data
* Good integration with Java through JDBC

## Trade-offs

### Advantages

* Mature relational database
* Strong SQL support
* Widely used
* Suitable for structured business data

### Disadvantages

* Requires database server configuration
* SQL queries need to be managed
* Database schema changes require planning

## Result

MySQL is the current database used by HIIKKY.
