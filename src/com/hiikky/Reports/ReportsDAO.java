package com.hiikky.Reports;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class ReportsDAO {

    public double getTotalRevenue() {

        String sql = """
                SELECT COALESCE(SUM(amount), 0)
                FROM billing
                WHERE payment_status = 'PAID'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getDouble(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public double getTotalOriginalAmount() {

        String sql = """
                SELECT COALESCE(SUM(original_amount), 0)
                FROM billing
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getDouble(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public double getTotalDiscount() {

        String sql = """
                SELECT COALESCE(SUM(discount_amount), 0)
                FROM billing
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getDouble(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getTotalBills() {

        String sql = "SELECT COUNT(*) FROM billing";

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getPaidBills() {

        String sql = """
                SELECT COUNT(*)
                FROM billing
                WHERE payment_status = 'PAID'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getUnpaidBills() {

        String sql = """
                SELECT COUNT(*)
                FROM billing
                WHERE payment_status = 'UNPAID'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getOverdueBills() {

        String sql = """
                SELECT COUNT(*)
                FROM billing
                WHERE payment_status = 'UNPAID'
                AND due_date < CURRENT_DATE
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public double getTotalBillingAmount() {

        String sql = """
                SELECT COALESCE(SUM(amount), 0)
                FROM billing
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getDouble(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public double getPendingAmount() {

        String sql = """
                SELECT COALESCE(SUM(amount), 0)
                FROM billing
                WHERE payment_status = 'UNPAID'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getDouble(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getTotalSubscribers() {

        String sql = "SELECT COUNT(*) FROM subscribers";

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getActiveSubscribers() {

        String sql = """
                SELECT COUNT(*)
                FROM subscribers
                WHERE status = 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getInactiveSubscribers() {

        String sql = """
                SELECT COUNT(*)
                FROM subscribers
                WHERE status <> 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getTotalSubscriptions() {

        String sql = "SELECT COUNT(*) FROM subscriptions";

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getActiveSubscriptions() {

        String sql = """
                SELECT COUNT(*)
                FROM subscriptions
                WHERE status = 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getInactiveSubscriptions() {

        String sql = """
                SELECT COUNT(*)
                FROM subscriptions
                WHERE status <> 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getTotalCourses() {

        String sql = "SELECT COUNT(*) FROM courses";

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getActiveCourses() {

        String sql = """
                SELECT COUNT(*)
                FROM courses
                WHERE status = 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public int getInactiveCourses() {

        String sql = """
                SELECT COUNT(*)
                FROM courses
                WHERE status <> 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getInt(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }


    public double getTotalCourseFees() {

        String sql = """
                SELECT COALESCE(SUM(course_fee), 0)
                FROM courses
                WHERE status = 'ACTIVE'
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            if (resultSet.next()) {
                return resultSet.getDouble(1);
            }

        } catch (Exception e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return 0;
    }
}