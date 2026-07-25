package com.hiikky.database;

public class DBManager {
    private DBManager() {

    }

    public void initialize() {

        System.out.println("Initializing database");

        DBConnection.getConnection();

    }
}