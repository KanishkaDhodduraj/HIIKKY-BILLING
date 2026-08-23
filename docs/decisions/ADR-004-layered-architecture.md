# ADR-004: Use Layered Architecture

## Status

Accepted

## Date

2026-08-09

## Context

As HIIKKY grows, keeping user interaction, business logic, and database operations together would make the application harder to maintain.

## Decision

A layered architecture was selected.

The current flow is:

```text
Menu
 ↓
Service
 ↓
DAO
 ↓
JDBC
 ↓
MySQL
```

## Reasons

The architecture separates responsibilities between different parts of the application.

### Menu Layer

Handles user interaction.

### Service Layer

Handles business logic and validation.

### DAO Layer

Handles database operations.

### JDBC

Handles database connectivity.

### MySQL

Stores application data.

## Benefits

* Separation of responsibilities
* Easier maintenance
* Easier debugging
* Better organization
* Easier future expansion

## Trade-offs

### Advantages

* Clear responsibility boundaries
* Easier to understand
* Easier to modify individual layers

### Disadvantages

* More classes and files
* Simple operations may require passing through multiple layers
* Requires discipline to maintain proper separation

## Result

The layered architecture is currently used as the structural approach for HIIKKY.
