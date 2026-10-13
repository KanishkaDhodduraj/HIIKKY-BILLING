package com.hiikky.database;

import com.hiikky.config.DatabaseConfig;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;


public class DBConnection {
    private DBConnection() {
    }

    public static Connection getConnection() {

        try {
            Connection con = DriverManager.getConnection(DatabaseConfig.URL,DatabaseConfig.USERNAME, DatabaseConfig.PASSWORD);
            System.out.println("Database Connected");
            return con;
        } catch (SQLException e) {
            System.out.println("DB connection failed.");
            System.out.println((e.getMessage()));
            return null;
        }

    }
}