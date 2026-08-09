# ADR-002: Use JDBC for Database Connectivity

## Status

Accepted

## Date

2026-08-09

## Context

HIIKKY needs a way for the Java application to communicate with the MySQL database.

## Decision

JDBC (Java Database Connectivity) was selected for database connectivity.

## Reasons

JDBC provides direct control over:

* Database connections
* SQL queries
* Prepared statements
* Query execution
* Result processing
* Database resources

Using JDBC also provides a strong understanding of how Java applications communicate with relational databases.

## Alternatives Considered

Higher-level database frameworks and ORM technologies may be considered in future versions.

For the current version, JDBC was selected to maintain direct control over SQL and database operations.

## Trade-offs

### Advantages

* Direct SQL control
* Clear understanding of database communication
* Lightweight approach
* Useful for learning database fundamentals

### Disadvantages

* More boilerplate code
* Manual resource management
* SQL queries need to be maintained manually

## Result

HIIKKY currently uses JDBC for Java-to-MySQL database communication.
