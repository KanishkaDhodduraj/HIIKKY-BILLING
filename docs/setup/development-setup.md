# HIIKKY Development Setup

## Requirements

Before running HIIKKY, install:

* JDK 21 or later
* MySQL
* IntelliJ IDEA or another Java IDE
* Git

## 1. Clone the Repository

```bash
git clone https://github.com/KanishkaDhodduraj/HIIKKY-BILLING.git
```

Move into the project:

```bash
cd HIIKKY-BILLING
```

## 2. Configure MySQL

Create the required HIIKKY database in MySQL.

The database configuration should match the JDBC configuration used by the application.

## 3. Configure Database Connection

Update the database connection configuration with your local MySQL details.

Do not commit passwords or other sensitive credentials to GitHub.

## 4. Open the Project

Open the cloned project in IntelliJ IDEA.

Verify that:

* JDK is configured
* MySQL JDBC driver is available
* Project source files are recognized correctly

## 5. Run the Application

Run the main Java class from IntelliJ IDEA.

The application should start and display the HIIKKY menu.

## 6. Verify Database Connectivity

Test the application operations that communicate with MySQL.

Verify that:

* Connection is established
* SQL operations execute successfully
* Data is stored correctly
* Data can be retrieved correctly

## Security Note

Never commit:

* Database passwords
* API keys
* Private credentials
* `.env` files
* Other sensitive configuration

Use local configuration for development credentials.
