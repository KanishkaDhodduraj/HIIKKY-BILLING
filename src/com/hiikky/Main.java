package com.hiikky;

import com.hiikky.config.AppConfig;
import com.hiikky.database.DBConnection;

public class Main {
    public static void main(String[] args) {

        System.out.println("HIIKKY BILLING APPLICATION");
        System.out.println("Application : " + AppConfig.APP_NAME);
        System.out.println("About Application : " + AppConfig.APP_TAGLINE);
        System.out.println(" ");

        DBConnection.getConnection();
        System.out.println("Database Ready.");
    }
}
