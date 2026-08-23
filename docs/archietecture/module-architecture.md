# HIIKKY Module Architecture

## Overview

HIIKKY is organized into separate components to keep user interaction, business logic, and database operations separated.

## Current Module Structure

```text
src/
└── com/
    └── hiikky/
        └── ...
```

The detailed module structure will be maintained here as new modules are implemented.

## Module Documentation

Each module will document:

* Purpose
* Responsibilities
* Important classes
* Dependencies
* Database interaction
* Main operations

## Current Layers

### Menu Layer

Responsible for user interaction and application navigation.

### Service Layer

Responsible for business logic and validation.

### DAO Layer

Responsible for database operations.

### Database Layer

MySQL is accessed through JDBC.

## Maintenance Rule

Whenever a new module is added to HIIKKY, its purpose and responsibilities should be documented here.
