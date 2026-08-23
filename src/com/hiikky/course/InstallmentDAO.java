package com.hiikky.course;

import com.hiikky.database.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class InstallmentDAO {

    public void saveInstallments(
            Connection connection,
            int courseId,
            List<Installment> installments) throws SQLException {

        String sql = """
                INSERT INTO installment_schedule
                (course_id, installment_number, installment_name,
                 amount, due_after_days)
                VALUES (?, ?, ?, ?, ?)
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {

            for (Installment installment : installments) {

                statement.setInt(1, courseId);
                statement.setInt(
                        2,
                        installment.getInstallmentNumber()
                );
                statement.setString(
                        3,
                        installment.getInstallmentName()
                );
                statement.setBigDecimal(
                        4,
                        installment.getAmount()
                );
                statement.setInt(
                        5,
                        installment.getDueAfterDays()
                );

                statement.addBatch();
            }

            statement.executeBatch();
        }
    }

    public List<Installment> findByCourseId(int courseId)
            throws SQLException {

        String sql = """
                SELECT *
                FROM installment_schedule
                WHERE course_id = ?
                ORDER BY installment_number
                """;

        List<Installment> installments = new ArrayList<>();

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, courseId);

            try (ResultSet rs = statement.executeQuery()) {

                while (rs.next()) {

                    Installment installment = new Installment();

                    installment.setInstallmentId(
                            rs.getInt("installment_id")
                    );

                    installment.setCourseId(
                            rs.getInt("course_id")
                    );

                    installment.setInstallmentNumber(
                            rs.getInt("installment_number")
                    );

                    installment.setInstallmentName(
                            rs.getString("installment_name")
                    );

                    installment.setAmount(
                            rs.getBigDecimal("amount")
                    );

                    installment.setDueAfterDays(
                            rs.getInt("due_after_days")
                    );

                    installments.add(installment);
                }
            }
        }

        return installments;
    }
}