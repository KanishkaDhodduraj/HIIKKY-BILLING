# HIIKKY System Architecture

## 1. Overview

HIIKKY is a subscription and billing management system designed for e-learning businesses.

The current version is developed using Core Java, JDBC, and MySQL.

The application follows a layered architecture to separate user interaction, business logic, and database operations.

---

## 2. High-Level Architecture

```text
                    HIIKKY
                       |
                       ↓
                Main / Menu Layer
                       |
                       ↓
                 Service Layer
                       |
                       ↓
                   DAO Layer
                       |
                       ↓
                     JDBC
                       |
                       ↓
                    MySQL
```

---

## 3. Architecture Flow

### User

The user interacts with the HIIKKY application through the menu interface.

### Main / Menu Layer

The menu layer is responsible for:

* Displaying available operations
* Accepting user input
* Navigating between application operations
* Calling appropriate service methods

### Service Layer

The service layer contains the application's business logic.

Responsibilities include:

* Business rules
* Input validation
* Processing application operations
* Coordinating between the menu layer and DAO layer

### DAO Layer

The DAO (Data Access Object) layer handles database-related operations.

Responsibilities include:

* Executing SQL queries
* Creating database records
* Reading database records
* Updating database records
* Deleting database records

### JDBC

Java Database Connectivity (JDBC) is used to connect the Java application with MySQL.

JDBC is responsible for:

* Establishing database connections
* Preparing SQL statements
* Executing SQL queries
* Processing query results
* Managing database resources

### MySQL

MySQL is used as the relational database for HIIKKY.

It stores application data related to the system's business operations.

---

## 4. Architectural Flow

A typical operation follows this flow:

```text
User
 ↓
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

The response follows the reverse direction:

```text
MySQL
 ↓
JDBC
 ↓
DAO
 ↓
Service
 ↓
Menu
 ↓
User
```

---

## 5. Why This Architecture?

The layered architecture separates different responsibilities within the application.

This makes the code easier to:

* Understand
* Maintain
* Test
* Modify
* Extend

For example, database-related code can be changed inside the DAO layer without placing SQL code directly inside the menu layer.

---

## 6. Current Technology Stack

| Layer                   | Technology    |
| ----------------------- | ------------- |
| Programming Language    | Java          |
| Database Connectivity   | JDBC          |
| Database                | MySQL         |
| Development Environment | IntelliJ IDEA |
| Version Control         | Git           |
| Repository              | GitHub        |

---

## 7. Current Scope

The current HIIKKY version focuses on learning and implementing:

* Object-Oriented Programming
* Java application development
* JDBC database connectivity
* SQL operations
* DAO pattern
* Service layer
* Layered application structure
* MySQL database management

---

## 8. Future Evolution

Future versions may introduce additional technologies and application capabilities.

Any future technology will be documented separately after it is actually implemented in the project.
