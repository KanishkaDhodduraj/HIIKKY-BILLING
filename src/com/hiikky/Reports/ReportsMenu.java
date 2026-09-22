package com.hiikky.Reports;

import java.util.Scanner;

public class ReportsMenu {

    private final ReportsService reportsService;
    private final Scanner scanner;

    public ReportsMenu() {
        reportsService = new ReportsService();
        scanner = new Scanner(System.in);
    }

    public void showMenu() {

        int choice;

        do {

            System.out.println();
            System.out.println("====================================");
            System.out.println("              REPORTS");
            System.out.println("====================================");
            System.out.println("1. Revenue Report");
            System.out.println("2. Billing Report");
            System.out.println("3. Subscription Report");
            System.out.println("4. Student Report");
            System.out.println("5. Course Report");
            System.out.println("6. Back");
            System.out.println("====================================");

            System.out.print("Enter your choice: ");
            choice = scanner.nextInt();

            switch (choice) {

                case 1:
                    reportsService.showRevenueReport();
                    break;

                case 2:
                    reportsService.showBillingReport();
                    break;

                case 3:
                    reportsService.showSubscriptionReport();
                    break;

                case 4:
                    reportsService.showStudentReport();
                    break;

                case 5:
                    reportsService.showCourseReport();
                    break;

                case 6:
                    System.out.println("Returning to previous menu...");
                    break;

                default:
                    System.out.println("Invalid choice. Please try again.");
            }

        } while (choice != 6);
    }
}