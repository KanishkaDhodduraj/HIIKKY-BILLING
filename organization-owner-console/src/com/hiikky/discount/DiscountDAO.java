package com.hiikky.discount;

import com.hiikky.database.DBConnection;

import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class DiscountDAO {

    public boolean save(Discount discount) {

        String sql = """
            INSERT INTO discounts
            (
                organization_id,
                discount_name,
                course_id,
                subscriber_id,
                discount_type,
                discount_value,
                start_date,
                end_date,
                reason,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(
                    1,
                    discount.getOrganizationId()
            );

            statement.setString(
                    2,
                    discount.getDiscountName()
            );

            if (discount.getCourseId() == null) {
                statement.setNull(3, Types.INTEGER);
            } else {
                statement.setInt(
                        3,
                        discount.getCourseId()
                );
            }

            if (discount.getSubscriberId() == null) {
                statement.setNull(4, Types.INTEGER);
            } else {
                statement.setInt(
                        4,
                        discount.getSubscriberId()
                );
            }

            statement.setString(
                    5,
                    discount.getDiscountType().name()
            );

            statement.setBigDecimal(
                    6,
                    discount.getDiscountValue()
            );

            statement.setDate(
                    7,
                    Date.valueOf(discount.getStartDate())
            );

            statement.setDate(
                    8,
                    Date.valueOf(discount.getEndDate())
            );

            statement.setString(
                    9,
                    discount.getReason()
            );

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {

            System.out.println(
                    "Unable to create discount: "
                            + e.getMessage()
            );

            return false;
        }
    }

    public List<Discount> findAll(int organizationId) {

        List<Discount> discounts =
                new ArrayList<>();

        String sql = """
            SELECT
                discount_id,
                organization_id,
                discount_name,
                course_id,
                subscriber_id,
                discount_type,
                discount_value,
                start_date,
                end_date,
                reason,
                CASE
                    WHEN status = 'INACTIVE'
                        THEN 'INACTIVE'
                    WHEN end_date < CURRENT_DATE
                        THEN 'EXPIRED'
                    ELSE 'ACTIVE'
                END AS calculated_status
            FROM discounts
            WHERE organization_id = ?
            ORDER BY created_at DESC, discount_id DESC
            """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(
                    1,
                    organizationId
            );

            try (ResultSet rs =
                         statement.executeQuery()) {

                while (rs.next()) {
                    discounts.add(map(rs));
                }
            }

        } catch (SQLException e) {

            System.out.println(
                    "Unable to load discounts: "
                            + e.getMessage()
            );
        }

        return discounts;
    }

    public Discount findApplicableDiscount(
            int organizationId,
            Integer courseId,
            Integer subscriberId,
            LocalDate date
    ) {

        String sql = """
            SELECT *
            FROM discounts
            WHERE organization_id = ?

              AND status = 'ACTIVE'

              AND start_date <= ?
              AND end_date >= ?

              AND
              (
                  subscriber_id = ?
                  OR
                  (
                      subscriber_id IS NULL
                      AND
                      (
                          course_id = ?
                          OR course_id IS NULL
                      )
                  )
              )

            ORDER BY
                CASE
                    WHEN subscriber_id = ?
                        THEN 1
                    WHEN course_id = ?
                        THEN 2
                    ELSE 3
                END,
                discount_id DESC

            LIMIT 1
            """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, organizationId);

            statement.setDate(
                    2,
                    Date.valueOf(date)
            );

            statement.setDate(
                    3,
                    Date.valueOf(date)
            );

            if (subscriberId == null) {
                statement.setNull(4, Types.INTEGER);
            } else {
                statement.setInt(4, subscriberId);
            }

            if (courseId == null) {
                statement.setNull(5, Types.INTEGER);
            } else {
                statement.setInt(5, courseId);
            }

            if (subscriberId == null) {
                statement.setNull(6, Types.INTEGER);
            } else {
                statement.setInt(6, subscriberId);
            }

            if (courseId == null) {
                statement.setNull(7, Types.INTEGER);
            } else {
                statement.setInt(7, courseId);
            }

            try (ResultSet rs =
                         statement.executeQuery()) {

                if (rs.next()) {
                    return map(rs);
                }
            }

        } catch (SQLException e) {

            System.out.println(
                    "Unable to find discount: "
                            + e.getMessage()
            );
        }

        return null;
    }

    public boolean deactivate(
            int organizationId,
            int discountId
    ) {

        String sql = """
            UPDATE discounts
            SET status = 'INACTIVE'
            WHERE discount_id = ?
              AND organization_id = ?
              AND status = 'ACTIVE'
            """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, discountId);
            statement.setInt(2, organizationId);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {

            System.out.println(
                    "Unable to deactivate discount: "
                            + e.getMessage()
            );

            return false;
        }
    }

    private Discount map(ResultSet rs)
            throws SQLException {

        Discount discount = new Discount();

        discount.setDiscountId(
                rs.getInt("discount_id")
        );

        discount.setOrganizationId(
                rs.getInt("organization_id")
        );

        discount.setDiscountName(
                rs.getString("discount_name")
        );

        int courseId =
                rs.getInt("course_id");

        if (!rs.wasNull()) {
            discount.setCourseId(courseId);
        }

        int subscriberId =
                rs.getInt("subscriber_id");

        if (!rs.wasNull()) {
            discount.setSubscriberId(subscriberId);
        }

        discount.setDiscountType(
                DiscountType.valueOf(
                        rs.getString("discount_type")
                )
        );

        discount.setDiscountValue(
                rs.getBigDecimal(
                        "discount_value"
                )
        );

        discount.setStartDate(
                rs.getDate(
                        "start_date"
                ).toLocalDate()
        );

        discount.setEndDate(
                rs.getDate(
                        "end_date"
                ).toLocalDate()
        );

        discount.setReason(
                rs.getString("reason")
        );

        discount.setStatus(
                DiscountStatus.valueOf(
                        rs.getString("calculated_status")
                )
        );

        return discount;
    }
}