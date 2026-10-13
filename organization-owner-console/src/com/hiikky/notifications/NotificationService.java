package com.hiikky.notifications;

import java.util.List;

public class NotificationService {

    private final NotificationDAO notificationDAO;

    public NotificationService() {
        notificationDAO = new NotificationDAO();
    }

    public void createNotification(String type,
                                   String recipient,
                                   String subject,
                                   String message) {

        if (subject == null || subject.trim().isEmpty()) {
            System.out.println("Subject cannot be empty.");
            return;
        }

        if (message == null || message.trim().isEmpty()) {
            System.out.println("Message cannot be empty.");
            return;
        }

        Notification notification = new Notification(
                type,
                recipient,
                subject,
                message,
                "DISPATCHED"
        );

        boolean result = notificationDAO.addNotification(notification);

        if (result) {
            System.out.println("Notification dispatched successfully.");
        } else {
            System.out.println("Failed to dispatch notification.");
        }
    }

    public void showNotificationHistory() {

        List<Notification> notifications =
                notificationDAO.getAllNotifications();

        if (notifications.isEmpty()) {
            System.out.println("No notification history found.");
            return;
        }

        System.out.println();
        System.out.println(" NOTIFICATION HISTORY ");

        for (Notification notification : notifications) {

            System.out.println("                                     ");
            System.out.println("ID       : " + notification.getNotificationId());
            System.out.println("Subject  : " + notification.getSubject());
            System.out.println("Type     : " + notification.getNotificationType());
            System.out.println("Sent To  : " + notification.getRecipientType());
            System.out.println("Status   : " + notification.getStatus());
            System.out.println("Date     : " + notification.getCreatedAt());
        }

        System.out.println("------------------------------------------");
    }

    public void viewNotification(int notificationId) {

        Notification notification =
                notificationDAO.getNotificationById(notificationId);

        if (notification == null) {
            System.out.println("Notification not found.");
            return;
        }

        System.out.println();
        System.out.println("NOTIFICATION DETAILS : ");
        System.out.println("ID       : " + notification.getNotificationId());
        System.out.println("Type     : " + notification.getNotificationType());
        System.out.println("Sent To  : " + notification.getRecipientType());
        System.out.println("Subject  : " + notification.getSubject());
        System.out.println("Message  : " + notification.getMessage());
        System.out.println("Status   : " + notification.getStatus());
        System.out.println("Date     : " + notification.getCreatedAt());
    }
}