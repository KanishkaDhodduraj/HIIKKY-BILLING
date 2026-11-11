package com.hiikky.billing;

import com.hiikky.database.DBConnection;

import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class BillingDAO {

    private static final String BASE_QUERY = """
        SELECT
            b.billing_id,
            b.organization_id,
            b.subscriber_id,
            b.subscription_id,

            s.full_name AS student_name,
            sub.plan_name AS course_name,

            b.payment_name,
            b.due_date,
            b.amount,
            b.paid_date,

            CASE
                WHEN b.payment_status = 'PAID'
                    THEN 'PAID'
                WHEN b.due_date < CURRENT_DATE
                    THEN 'OVERDUE'
                ELSE 'UNPAID'
            END AS billing_status

        FROM billing b

        INNER JOIN subscribers s
            ON b.subscriber_id = s.subscriber_id

        INNER JOIN subscriptions sub
            ON b.subscription_id = sub.subscription_id

        WHERE b.organization_id = ?
        """;

    public boolean saveBilling(Billing billing) {

        String sql = """
            INSERT INTO billing
            (
                organization_id,
                subscriber_id,
                subscription_id,
                payment_name,
                due_date,
                amount,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'UNPAID')
            """;

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {

            statement.setInt(1, billing.getOrganizationId());
            statement.setInt(2, billing.getSubscriberId());
            statement.setInt(3, billing.getSubscriptionId());
            statement.setString(4, billing.getPaymentName());
            statement.setDate(5, Date.valueOf(billing.getDueDate()));
            statement.setBigDecimal(6, billing.getAmount());

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            System.out.println("Unable to create billing: " + e.getMessage());
            return false;
        }
    }

    public List<Billing> getAllBilling(int organizationId) {

        List<Billing> billings = new ArrayList<>();

        String sql = BASE_QUERY + """
            ORDER BY b.due_date DESC, b.billing_id DESC
            """;

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {

            statement.setInt(1, organizationId);

            try (ResultSet rs = statement.executeQuery()) {

                while (rs.next()) {
                    billings.add(mapBilling(rs));
                }
            }

        } catch (SQLException e) {
            System.out.println("Unable to load billing: " + e.getMessage());
        }

        return billings;
    }

    public List<Billing> searchBilling(
            int organizationId,
            String keyword,
            BillingStatus status
    ) {

        List<Billing> billings = new ArrayList<>();

        StringBuilder sql = new StringBuilder(BASE_QUERY);

        List<Object> parameters = new ArrayList<>();
        parameters.add(organizationId);

        if (keyword != null && !keyword.isBlank()) {

            sql.append("""
                AND (
                    s.full_name LIKE ?
                    OR sub.plan_name LIKE ?
                    OR b.payment_name LIKE ?
                )
                """);

            String search = "%" + keyword.trim() + "%";

            parameters.add(search);
            parameters.add(search);
            parameters.add(search);
        }

        if (status != null) {

            sql.append("""
                AND (
                    CASE
                        WHEN b.payment_status = 'PAID'
                            THEN 'PAID'
                        WHEN b.due_date < CURRENT_DATE
                            THEN 'OVERDUE'
                        ELSE 'UNPAID'
                    END
                ) = ?
                """);

            parameters.add(status.name());
        }

        sql.append(" ORDER BY b.due_date DESC, b.billing_id DESC");

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement =
                        connection.prepareStatement(sql.toString())
        ) {

            for (int i = 0; i < parameters.size(); i++) {
                statement.setObject(i + 1, parameters.get(i));
            }

            try (ResultSet rs = statement.executeQuery()) {

                while (rs.next()) {
                    billings.add(mapBilling(rs));
                }
            }

        } catch (SQLException e) {
            System.out.println("Unable to search billing: " + e.getMessage());
        }

        return billings;
    }

    public boolean markAsPaid(int organizationId, int billingId) {

        String sql = """
            UPDATE billing
            SET
                payment_status = 'PAID',
                paid_date = CURRENT_DATE
            WHERE billing_id = ?
              AND organization_id = ?
              AND payment_status = 'UNPAID'
            """;

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {

            statement.setInt(1, billingId);
            statement.setInt(2, organizationId);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            System.out.println("Unable to update payment: " + e.getMessage());
            return false;
        }
    }

    public Billing getBillingById(int organizationId, int billingId) {

        String sql = BASE_QUERY + """
            AND b.billing_id = ?
            """;

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {

            statement.setInt(1, organizationId);
            statement.setInt(2, billingId);

            try (ResultSet rs = statement.executeQuery()) {

                if (rs.next()) {
                    return mapBilling(rs);
                }
            }

        } catch (SQLException e) {
            System.out.println("Unable to find billing: " + e.getMessage());
        }

        return null;
    }

    public BigDecimal getTotalByStatus(
            int organizationId,
            BillingStatus status
    ) {

        String sql = """
            SELECT COALESCE(SUM(amount), 0)
            FROM billing
            WHERE organization_id = ?

            AND (
                CASE
                    WHEN payment_status = 'PAID'
                        THEN 'PAID'
                    WHEN due_date < CURRENT_DATE
                        THEN 'OVERDUE'
                    ELSE 'UNPAID'
                END
            ) = ?
            """;

        try (
                Connection connection = DBConnection.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {

            statement.setInt(1, organizationId);
            statement.setString(2, status.name());

            try (ResultSet rs = statement.executeQuery()) {

                if (rs.next()) {
                    return rs.getBigDecimal(1);
                }
            }

        } catch (SQLException e) {
            System.out.println("Unable to calculate total: " + e.getMessage());
        }

        return BigDecimal.ZERO;
    }

    private Billing mapBilling(ResultSet rs) throws SQLException {

        Billing billing = new Billing();

        billing.setBillingId(rs.getInt("billing_id"));
        billing.setOrganizationId(rs.getInt("organization_id"));
        billing.setSubscriberId(rs.getInt("subscriber_id"));
        billing.setSubscriptionId(rs.getInt("subscription_id"));

        billing.setStudentName(rs.getString("student_name"));
        billing.setCourseName(rs.getString("course_name"));
        billing.setPaymentName(rs.getString("payment_name"));

        billing.setDueDate(
                rs.getDate("due_date").toLocalDate()
        );

        billing.setAmount(
                rs.getBigDecimal("amount")
        );

        billing.setStatus(
                BillingStatus.valueOf(
                        rs.getString("billing_status")
                )
        );

        Date paidDate = rs.getDate("paid_date");

        if (paidDate != null) {
            billing.setPaidDate(paidDate.toLocalDate());
        }

        return billing;
    }
}