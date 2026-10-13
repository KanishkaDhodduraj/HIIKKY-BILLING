package com.hiikky.database;
import java.sql.Connection;

public class DBManager {
    private DBManager() {

    }

    public static void initialize() {

        System.out.println("Initializing database");

        Connection connection = DBConnection.getConnection();

        if(connection != null) {
            System.out.println("DB Ready");
        } else {
            System.out.println("Initialization Failed");
        }

    }
}