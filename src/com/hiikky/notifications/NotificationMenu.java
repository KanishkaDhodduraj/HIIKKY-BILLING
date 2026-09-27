package com.hiikky.notifications;

import java.util.Scanner;

public class NotificationMenu {

    private final NotificationService notificationService;
    private final Scanner scanner;

    public NotificationMenu() {
        notificationService = new NotificationService();
        scanner = new Scanner(System.in);
    }

    public void showMenu() {

        while (true) {

            System.out.println();
            System.out.println("========== NOTIFICATIONS ==========");
            System.out.println("1. Compose New Notification");
            System.out.println("2. View Dispatch History");
            System.out.println("3. View Notification");
            System.out.println("4. Back");
            System.out.print("Enter your choice: ");

            int choice = scanner.nextInt();
            scanner.nextLine();

            switch (choice) {

                case 1:
                    composeNotification();
                    break;

                case 2:
                    notificationService.showNotificationHistory();
                    break;

                case 3:
                    viewNotification();
                    break;

                case 4:
                    return;

                default:
                    System.out.println("Invalid choice.");
            }
        }
    }

    private void composeNotification() {

        System.out.println();
        System.out.println("========== COMPOSE NOTIFICATION ==========");

        System.out.println("Select Notification Type:");
        System.out.println("1. Announcement");
        System.out.println("2. System Alert");
        System.out.print("Enter choice: ");

        int typeChoice = scanner.nextInt();
        scanner.nextLine();

        String type;

        if (typeChoice == 1) {
            type = "ANNOUNCEMENT";
        } else if (typeChoice == 2) {
            type = "SYSTEM_ALERT";
        } else {
            System.out.println("Invalid notification type.");
            return;
        }

        System.out.println();
        System.out.println("Select Recipients:");
        System.out.println("1. All Active Users");
        System.out.println("2. Backend Only");
        System.out.println("3. Unpaid Segment");
        System.out.print("Enter choice: ");

        int recipientChoice = scanner.nextInt();
        scanner.nextLine();

        String recipient;

        if (recipientChoice == 1) {
            recipient = "ALL_ACTIVE_USERS";
        } else if (recipientChoice == 2) {
            recipient = "BACKEND_ONLY";
        } else if (recipientChoice == 3) {
            recipient = "UNPAID_SEGMENT";
        } else {
            System.out.println("Invalid recipient.");
            return;
        }

        System.out.print("Enter Subject: ");
        String subject = scanner.nextLine();

        System.out.print("Enter Message: ");
        String message = scanner.nextLine();

        System.out.println();
        System.out.println("========== CONFIRM ==========");
        System.out.println("Type      : " + type);
        System.out.println("Recipients: " + recipient);
        System.out.println("Subject   : " + subject);
        System.out.println("Message   : " + message);

        System.out.print("Dispatch notification? (Y/N): ");
        String confirmation = scanner.nextLine();

        if (confirmation.equalsIgnoreCase("Y")) {

            notificationService.createNotification(
                    type,
                    recipient,
                    subject,
                    message
            );

        } else {
            System.out.println("Notification cancelled.");
        }
    }

    private void viewNotification() {

        System.out.print("Enter Notification ID: ");
        int notificationId = scanner.nextInt();
        scanner.nextLine();

        notificationService.viewNotification(notificationId);
    }
}