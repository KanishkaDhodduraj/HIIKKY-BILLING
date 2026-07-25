package com.hiikky.database;
import java.sql.Connection;

public class DBConnection {
    private DBConnection() {
    }

    public static Connection getConnection() {
        System.out.println("Database connection");
        return null;
    }
}