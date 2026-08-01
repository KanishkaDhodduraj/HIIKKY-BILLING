package com.hiikky.subscription;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SubscriptionDAO {

    public boolean saveSubscription(Subscription subscription) {

        String sql = """
                INSERT INTO subscriptions
                (plan_name,
                 description,
                 price,
                 billing_cycle,
                 max_users,
                 status)
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setString(1, subscription.getPlanName());
            preparedStatement.setString(2, subscription.getDescription());
            preparedStatement.setDouble(3, subscription.getPrice());
            preparedStatement.setString(4, subscription.getBillingCycle());
            preparedStatement.setInt(5, subscription.getMaxUsers());
            preparedStatement.setString(6, subscription.getStatus());

            int row = preparedStatement.executeUpdate();

            return row > 0;

        } catch (SQLException e) {

            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());

            return false;
        }
    }

    public List<Subscription> getAllSubscriptions() {

        List<Subscription> subscriptions = new ArrayList<>();

        String sql = """
                SELECT
                    subscription_id,
                    plan_name,
                    description,
                    price,
                    billing_cycle,
                    max_users,
                    status
                FROM subscriptions
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery();
        ) {

            while (resultSet.next()) {

                Subscription subscription = new Subscription();

                subscription.setSubscriptionId(resultSet.getInt("subscription_id"));
                subscription.setPlanName(resultSet.getString("plan_name"));
                subscription.setDescription(resultSet.getString("description"));
                subscription.setPrice(resultSet.getDouble("price"));
                subscription.setBillingCycle(resultSet.getString("billing_cycle"));
                subscription.setMaxUsers(resultSet.getInt("max_users"));
                subscription.setStatus(resultSet.getString("status"));

                subscriptions.add(subscription);
            }

        } catch (SQLException e) {

            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
        }

        return subscriptions;
    }

    public boolean updateSubscription(Subscription subscription) {

        String sql = """
                UPDATE subscriptions
                SET
                    plan_name = ?,
                    description = ?,
                    price = ?,
                    billing_cycle = ?,
                    max_users = ?,
                    status = ?
                WHERE subscription_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setString(1, subscription.getPlanName());
            preparedStatement.setString(2, subscription.getDescription());
            preparedStatement.setDouble(3, subscription.getPrice());
            preparedStatement.setString(4, subscription.getBillingCycle());
            preparedStatement.setInt(5, subscription.getMaxUsers());
            preparedStatement.setString(6, subscription.getStatus());
            preparedStatement.setInt(7, subscription.getSubscriptionId());

            int row = preparedStatement.executeUpdate();

            return row > 0;

        } catch (SQLException e) {

            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());

            return false;
        }
    }

    public boolean deleteSubscription(int subscriptionId) {

        String sql = """
                DELETE FROM subscriptions
                WHERE subscription_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setInt(1, subscriptionId);

            int row = preparedStatement.executeUpdate();

            return row > 0;

        } catch (SQLException e) {

            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());

            return false;
        }
    }

    public Subscription searchSubscriptionById(int subscriptionId) {

        String sql = """
                SELECT *
                FROM subscriptions
                WHERE subscription_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setInt(1, subscriptionId);

            ResultSet resultSet = preparedStatement.executeQuery();

            if (resultSet.next()) {

                Subscription subscription = new Subscription();

                subscription.setSubscriptionId(resultSet.getInt("subscription_id"));
                subscription.setPlanName(resultSet.getString("plan_name"));
                subscription.setDescription(resultSet.getString("description"));
                subscription.setPrice(resultSet.getDouble("price"));
                subscription.setBillingCycle(resultSet.getString("billing_cycle"));
                subscription.setMaxUsers(resultSet.getInt("max_users"));
                subscription.setStatus(resultSet.getString("status"));

                return subscription;
            }

        } catch (SQLException e) {

            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
        }

        return null;
    }
}