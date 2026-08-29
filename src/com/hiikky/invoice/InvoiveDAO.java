package com.hiikky.invoice;

import com.hiikky.database.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

class InvoiceDAO {

    public List<Invoice> getPaidInvoices(int organizationId) {

        List<Invoice> invoices = new ArrayList<>();

        String sql = """
                SELECT
                    b.billing_id,
                    b.organization_id,
                    b.subscriber_id,
                    b.subscription_id,
                    s.full_name,
                    s.email,
                    sub.plan_name,
                    b.payment_name,
                    b.paid_date,
                    b.amount,
                    b.payment_status
                FROM billing b

                INNER JOIN subscribers s
                    ON b.subscriber_id = s.subscriber_id

                INNER JOIN subscriptions sub
                    ON b.subscription_id = sub.subscription_id

                WHERE b.organization_id = ?
                  AND b.payment_status = 'PAID'

                ORDER BY b.paid_date DESC,
                         b.billing_id DESC
                """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, organizationId);

            ResultSet rs =
                    statement.executeQuery();

            while (rs.next()) {

                Invoice invoice =
                        createInvoiceFromResultSet(rs);

                invoices.add(invoice);
            }

        } catch (SQLException e) {

            System.out.println(
                    "Error loading paid invoices."
            );

            e.printStackTrace();
        }

        return invoices;
    }

    public Invoice getPaidInvoiceByBillingId(
            int organizationId,
            int billingId
    ) {

        String sql = """
                SELECT
                    b.billing_id,
                    b.organization_id,
                    b.subscriber_id,
                    b.subscription_id,
                    s.full_name,
                    s.email,
                    sub.plan_name,
                    b.payment_name,
                    b.paid_date,
                    b.amount,
                    b.payment_status
                FROM billing b

                INNER JOIN subscribers s
                    ON b.subscriber_id = s.subscriber_id

                INNER JOIN subscriptions sub
                    ON b.subscription_id = sub.subscription_id

                WHERE b.organization_id = ?
                  AND b.billing_id = ?
                  AND b.payment_status = 'PAID'
                """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, organizationId);
            statement.setInt(2, billingId);

            ResultSet rs =
                    statement.executeQuery();

            if (rs.next()) {

                return createInvoiceFromResultSet(rs);
            }

        } catch (SQLException e) {

            System.out.println(
                    "Error loading invoice."
            );

            e.printStackTrace();
        }

        return null;
    }

    private Invoice createInvoiceFromResultSet(
            ResultSet rs
    ) throws SQLException {

        return new Invoice(
                rs.getInt("billing_id"),
                rs.getInt("organization_id"),
                rs.getInt("subscriber_id"),
                rs.getInt("subscription_id"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("plan_name"),
                rs.getString("payment_name"),

                null,

                rs.getDate("paid_date") != null ? rs.getDate("paid_date").toLocalDate() : null,
                rs.getBigDecimal("amount"),
                rs.getString("payment_status")
        );
    }
}