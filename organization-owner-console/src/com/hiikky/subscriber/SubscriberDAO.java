package com.hiikky.subscriber;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SubscriberDAO {

    public boolean saveSubscriber(Subscriber subscriber) {

        String sql = """
                INSERT INTO subscribers
                (organization_id,
                 subscription_id,
                 full_name,
                 email,
                 phone,
                 start_date,
                 end_date,
                 status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setInt(1, subscriber.getOrganizationId());
            preparedStatement.setInt(2, subscriber.getSubscriptionId());
            preparedStatement.setString(3, subscriber.getFullName());
            preparedStatement.setString(4, subscriber.getEmail());
            preparedStatement.setString(5, subscriber.getPhone());
            preparedStatement.setDate(6, Date.valueOf(subscriber.getStartDate()));
            preparedStatement.setDate(7, Date.valueOf(subscriber.getEndDate()));
            preparedStatement.setString(8, subscriber.getStatus().name());

            int row = preparedStatement.executeUpdate();

            return row > 0;

        } catch (SQLException e) {
            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
            return false;
        }
    }

    public List<Subscriber> getAllSubscribers() {

        List<Subscriber> subscribers = new ArrayList<>();

        String sql = """
                SELECT
                    subscriber_id,
                    organization_id,
                    subscription_id,
                    full_name,
                    email,
                    phone,
                    start_date,
                    end_date,
                    status
                FROM subscribers
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery()
        ) {

            while (resultSet.next()) {

                Subscriber subscriber = new Subscriber();

                subscriber.setSubscriberId(resultSet.getInt("subscriber_id"));
                subscriber.setOrganizationId(resultSet.getInt("organization_id"));
                subscriber.setSubscriptionId(resultSet.getInt("subscription_id"));
                subscriber.setFullName(resultSet.getString("full_name"));
                subscriber.setEmail(resultSet.getString("email"));
                subscriber.setPhone(resultSet.getString("phone"));
                subscriber.setStartDate(resultSet.getDate("start_date").toLocalDate());
                subscriber.setEndDate(resultSet.getDate("end_date").toLocalDate());
                subscriber.setStatus(
                        SubscriberStatus.valueOf(resultSet.getString("status"))
                );

                subscribers.add(subscriber);
            }

        } catch (SQLException e) {
            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
        }

        return subscribers;
    }

    public boolean updateSubscriber(Subscriber subscriber) {

        String sql = """
                UPDATE subscribers
                SET
                    organization_id = ?,
                    subscription_id = ?,
                    full_name = ?,
                    email = ?,
                    phone = ?,
                    start_date = ?,
                    end_date = ?,
                    status = ?
                WHERE subscriber_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setInt(1, subscriber.getOrganizationId());
            preparedStatement.setInt(2, subscriber.getSubscriptionId());
            preparedStatement.setString(3, subscriber.getFullName());
            preparedStatement.setString(4, subscriber.getEmail());
            preparedStatement.setString(5, subscriber.getPhone());
            preparedStatement.setDate(6, Date.valueOf(subscriber.getStartDate()));
            preparedStatement.setDate(7, Date.valueOf(subscriber.getEndDate()));
            preparedStatement.setString(8, subscriber.getStatus().name());
            preparedStatement.setInt(9, subscriber.getSubscriberId());

            int row = preparedStatement.executeUpdate();

            return row > 0;

        } catch (SQLException e) {
            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
            return false;
        }
    }

    public boolean deleteSubscriber(int subscriberId) {

        String sql = """
                DELETE FROM subscribers
                WHERE subscriber_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setInt(1, subscriberId);

            int row = preparedStatement.executeUpdate();

            return row > 0;

        } catch (SQLException e) {
            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
            return false;
        }
    }

    public Subscriber searchSubscriberById(int subscriberId) {

        String sql = """
                SELECT
                    subscriber_id,
                    organization_id,
                    subscription_id,
                    full_name,
                    email,
                    phone,
                    start_date,
                    end_date,
                    status
                FROM subscribers
                WHERE subscriber_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {

            preparedStatement.setInt(1, subscriberId);

            try (ResultSet resultSet = preparedStatement.executeQuery()) {

                if (resultSet.next()) {

                    return new Subscriber(
                            resultSet.getInt("subscriber_id"),
                            resultSet.getInt("organization_id"),
                            resultSet.getInt("subscription_id"),
                            resultSet.getString("full_name"),
                            resultSet.getString("email"),
                            resultSet.getString("phone"),
                            resultSet.getDate("start_date").toLocalDate(),
                            resultSet.getDate("end_date").toLocalDate(),
                            SubscriberStatus.valueOf(resultSet.getString("status"))
                    );
                }
            }

        } catch (SQLException e) {
            System.out.println("Database Error Occurred");
            System.out.println(e.getMessage());
        }

        return null;
    }
}