package com.hiikky.notifications;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class NotificationDAO {

    public boolean addNotification(Notification notification) {

        String sql = "INSERT INTO notification " +
                "(notification_type, recipient_type, subject, message, status) " +
                "VALUES (?, ?, ?, ?, ?)";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, notification.getNotificationType());
            statement.setString(2, notification.getRecipientType());
            statement.setString(3, notification.getSubject());
            statement.setString(4, notification.getMessage());
            statement.setString(5, notification.getStatus());

            return statement.executeUpdate() > 0;

        } catch (Exception e) {
            System.out.println("Error while creating notification: " + e.getMessage());
            return false;
        }
    }

    public List<Notification> getAllNotifications() {

        List<Notification> notifications = new ArrayList<>();

        String sql = "SELECT * FROM notification ORDER BY created_at DESC";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {

            while (resultSet.next()) {

                Notification notification = new Notification();

                notification.setNotificationId(
                        resultSet.getInt("notification_id")
                );

                notification.setNotificationType(
                        resultSet.getString("notification_type")
                );

                notification.setRecipientType(
                        resultSet.getString("recipient_type")
                );

                notification.setSubject(
                        resultSet.getString("subject")
                );

                notification.setMessage(
                        resultSet.getString("message")
                );

                notification.setStatus(
                        resultSet.getString("status")
                );

                if (resultSet.getTimestamp("created_at") != null) {
                    notification.setCreatedAt(
                            resultSet.getTimestamp("created_at").toLocalDateTime()
                    );
                }

                notifications.add(notification);
            }

        } catch (Exception e) {
            System.out.println("Error while fetching notifications: " + e.getMessage());
        }

        return notifications;
    }

    public Notification getNotificationById(int notificationId) {

        String sql = "SELECT * FROM notification WHERE notification_id = ?";

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, notificationId);

            try (ResultSet resultSet = statement.executeQuery()) {

                if (resultSet.next()) {

                    Notification notification = new Notification();

                    notification.setNotificationId(
                            resultSet.getInt("notification_id")
                    );

                    notification.setNotificationType(
                            resultSet.getString("notification_type")
                    );

                    notification.setRecipientType(
                            resultSet.getString("recipient_type")
                    );

                    notification.setSubject(
                            resultSet.getString("subject")
                    );

                    notification.setMessage(
                            resultSet.getString("message")
                    );

                    notification.setStatus(
                            resultSet.getString("status")
                    );

                    if (resultSet.getTimestamp("created_at") != null) {
                        notification.setCreatedAt(
                                resultSet.getTimestamp("created_at").toLocalDateTime()
                        );
                    }

                    return notification;
                }
            }

        } catch (Exception e) {
            System.out.println("Error while fetching notification: " + e.getMessage());
        }

        return null;
    }
}