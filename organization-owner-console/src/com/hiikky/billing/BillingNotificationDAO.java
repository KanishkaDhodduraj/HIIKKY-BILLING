package com.hiikky.billing;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class BillingNotificationDAO {

    public boolean saveNotification(
            Billing billing,
            String message
    ) {

        String sql = """
            INSERT INTO billing_notifications
            (
                billing_id,
                organization_id,
                subscriber_id,
                message
            )
            VALUES (?, ?, ?, ?)
            """;

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, billing.getBillingId());
            statement.setInt(2, billing.getOrganizationId());
            statement.setInt(3, billing.getSubscriberId());
            statement.setString(4, message);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            System.out.println(
                    "Unable to save notification: " + e.getMessage()
            );

            return false;
        }
    }
}