package com.hiikky.course;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class CourseDAO {

    public boolean addCourse(Course course) {

        String courseSql = """
                INSERT INTO courses
                (
                    course_code,
                    course_name,
                    duration,
                    duration_unit,
                    course_fee,
                    payment_type,
                    status,
                    description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """;

        String installmentSql = """
                INSERT INTO course_installments
                (
                    course_id,
                    installment_number,
                    installment_name,
                    amount,
                    due_days,
                    due_date
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        Connection connection = null;

        try {

            connection = DBConnection.getConnection();

            connection.setAutoCommit(false);

            try (
                    PreparedStatement statement =
                            connection.prepareStatement(
                                    courseSql,
                                    Statement.RETURN_GENERATED_KEYS
                            )
            ) {

                statement.setString(
                        1,
                        course.getCourseCode()
                );

                statement.setString(
                        2,
                        course.getCourseName()
                );

                statement.setInt(
                        3,
                        course.getDuration()
                );

                statement.setString(
                        4,
                        course.getDurationUnit()
                );

                statement.setDouble(
                        5,
                        course.getCourseFee()
                );

                statement.setString(
                        6,
                        course.getPaymentType()
                );

                statement.setString(
                        7,
                        course.getStatus()
                );

                statement.setString(
                        8,
                        course.getDescription()
                );

                int result =
                        statement.executeUpdate();

                if (result == 0) {

                    connection.rollback();

                    return false;
                }

                try (
                        ResultSet keys =
                                statement.getGeneratedKeys()
                ) {

                    if (keys.next()) {

                        course.setCourseId(
                                keys.getInt(1)
                        );

                    } else {

                        connection.rollback();

                        return false;
                    }
                }
            }

            if (
                    course.getInstallments() != null
                            &&
                            !course.getInstallments().isEmpty()
            ) {

                try (
                        PreparedStatement statement =
                                connection.prepareStatement(
                                        installmentSql
                                )
                ) {

                    for (
                            CourseInstallment installment :
                            course.getInstallments()
                    ) {

                        statement.setInt(
                                1,
                                course.getCourseId()
                        );

                        statement.setInt(
                                2,
                                installment
                                        .getInstallmentNumber()
                        );

                        statement.setString(
                                3,
                                installment
                                        .getInstallmentName()
                        );

                        statement.setDouble(
                                4,
                                installment.getAmount()
                        );

                        statement.setInt(
                                5,
                                installment.getDueDays()
                        );

                        statement.setDate(
                                6,
                                Date.valueOf(
                                        installment.getDueDate()
                                )
                        );

                        statement.addBatch();
                    }

                    statement.executeBatch();
                }
            }

            connection.commit();

            return true;

        } catch (Exception e) {

            if (connection != null) {

                try {
                    connection.rollback();
                } catch (Exception ignored) {
                }
            }

            System.out.println(
                    "Unable to add course"
            );

            System.out.println(
                    e.getMessage()
            );

            return false;

        } finally {

            if (connection != null) {

                try {
                    connection.setAutoCommit(true);
                    connection.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    public List<Course> getAllCourses() {

        List<Course> courses =
                new ArrayList<>();

        String sql = """
                SELECT
                    course_id,
                    course_code,
                    course_name,
                    duration,
                    duration_unit,
                    course_fee,
                    payment_type,
                    status,
                    description
                FROM courses
                ORDER BY course_id DESC
                """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql);

                ResultSet resultSet =
                        statement.executeQuery()
        ) {

            while (resultSet.next()) {

                Course course =
                        mapCourse(resultSet);

                course.setInstallments(
                        getInstallments(
                                connection,
                                course.getCourseId()
                        )
                );

                courses.add(course);
            }

        } catch (Exception e) {

            System.out.println(
                    "Unable to load courses"
            );

            System.out.println(
                    e.getMessage()
            );
        }

        return courses;
    }

    public Course getCourseById(
            int courseId) {

        String sql = """
                SELECT
                    course_id,
                    course_code,
                    course_name,
                    duration,
                    duration_unit,
                    course_fee,
                    payment_type,
                    status,
                    description
                FROM courses
                WHERE course_id = ?
                """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(
                    1,
                    courseId
            );

            try (
                    ResultSet resultSet =
                            statement.executeQuery()
            ) {

                if (resultSet.next()) {

                    Course course =
                            mapCourse(resultSet);

                    course.setInstallments(
                            getInstallments(
                                    connection,
                                    courseId
                            )
                    );

                    return course;
                }
            }

        } catch (Exception e) {

            System.out.println(
                    "Unable to find course"
            );

            System.out.println(
                    e.getMessage()
            );
        }

        return null;
    }

    public Course searchByCode(
            String courseCode) {

        String sql = """
                SELECT
                    course_id,
                    course_code,
                    course_name,
                    duration,
                    duration_unit,
                    course_fee,
                    payment_type,
                    status,
                    description
                FROM courses
                WHERE course_code = ?
                """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setString(
                    1,
                    courseCode
            );

            try (
                    ResultSet resultSet =
                            statement.executeQuery()
            ) {

                if (resultSet.next()) {

                    Course course =
                            mapCourse(resultSet);

                    course.setInstallments(
                            getInstallments(
                                    connection,
                                    course.getCourseId()
                            )
                    );

                    return course;
                }
            }

        } catch (Exception e) {

            System.out.println(
                    "Unable to search course"
            );

            System.out.println(
                    e.getMessage()
            );
        }

        return null;
    }

    private Course mapCourse(
            ResultSet resultSet)
            throws Exception {

        Course course =
                new Course();

        course.setCourseId(
                resultSet.getInt(
                        "course_id"
                )
        );

        course.setCourseCode(
                resultSet.getString(
                        "course_code"
                )
        );

        course.setCourseName(
                resultSet.getString(
                        "course_name"
                )
        );

        course.setDuration(
                resultSet.getInt(
                        "duration"
                )
        );

        course.setDurationUnit(
                resultSet.getString(
                        "duration_unit"
                )
        );

        course.setCourseFee(
                resultSet.getDouble(
                        "course_fee"
                )
        );

        course.setPaymentType(
                resultSet.getString(
                        "payment_type"
                )
        );

        course.setStatus(
                resultSet.getString(
                        "status"
                )
        );

        course.setDescription(
                resultSet.getString(
                        "description"
                )
        );

        return course;
    }

    private List<CourseInstallment> getInstallments(
            Connection connection,
            int courseId)
            throws Exception {

        List<CourseInstallment> installments =
                new ArrayList<>();

        String sql = """
                SELECT
                    installment_id,
                    course_id,
                    installment_number,
                    installment_name,
                    amount,
                    due_days,
                    due_date
                FROM course_installments
                WHERE course_id = ?
                ORDER BY installment_number
                """;

        try (
                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(
                    1,
                    courseId
            );

            try (
                    ResultSet resultSet =
                            statement.executeQuery()
            ) {

                while (resultSet.next()) {

                    CourseInstallment installment =
                            new CourseInstallment();

                    installment.setInstallmentId(
                            resultSet.getInt(
                                    "installment_id"
                            )
                    );

                    installment.setCourseId(
                            resultSet.getInt(
                                    "course_id"
                            )
                    );

                    installment.setInstallmentNumber(
                            resultSet.getInt(
                                    "installment_number"
                            )
                    );

                    installment.setInstallmentName(
                            resultSet.getString(
                                    "installment_name"
                            )
                    );

                    installment.setAmount(
                            resultSet.getDouble(
                                    "amount"
                            )
                    );

                    installment.setDueDays(
                            resultSet.getInt(
                                    "due_days"
                            )
                    );

                    Date dueDate =
                            resultSet.getDate(
                                    "due_date"
                            );

                    if (dueDate != null) {

                        installment.setDueDate(
                                dueDate.toLocalDate()
                        );
                    }

                    installments.add(
                            installment
                    );
                }
            }
        }

        return installments;
    }

    public boolean updateCourse(
            Course course) {

        String updateSql = """
                UPDATE courses
                SET
                    course_code = ?,
                    course_name = ?,
                    duration = ?,
                    duration_unit = ?,
                    course_fee = ?,
                    payment_type = ?,
                    status = ?,
                    description = ?
                WHERE course_id = ?
                """;

        String deleteInstallmentsSql = """
                DELETE FROM course_installments
                WHERE course_id = ?
                """;

        String installmentSql = """
                INSERT INTO course_installments
                (
                    course_id,
                    installment_number,
                    installment_name,
                    amount,
                    due_days,
                    due_date
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        Connection connection = null;

        try {

            connection =
                    DBConnection.getConnection();

            connection.setAutoCommit(false);

            try (
                    PreparedStatement statement =
                            connection.prepareStatement(
                                    updateSql
                            )
            ) {

                statement.setString(
                        1,
                        course.getCourseCode()
                );

                statement.setString(
                        2,
                        course.getCourseName()
                );

                statement.setInt(
                        3,
                        course.getDuration()
                );

                statement.setString(
                        4,
                        course.getDurationUnit()
                );

                statement.setDouble(
                        5,
                        course.getCourseFee()
                );

                statement.setString(
                        6,
                        course.getPaymentType()
                );

                statement.setString(
                        7,
                        course.getStatus()
                );

                statement.setString(
                        8,
                        course.getDescription()
                );

                statement.setInt(
                        9,
                        course.getCourseId()
                );

                int result =
                        statement.executeUpdate();

                if (result == 0) {

                    connection.rollback();

                    return false;
                }
            }

            try (
                    PreparedStatement statement =
                            connection.prepareStatement(
                                    deleteInstallmentsSql
                            )
            ) {

                statement.setInt(
                        1,
                        course.getCourseId()
                );

                statement.executeUpdate();
            }

            if (
                    course.getInstallments() != null
                            &&
                            !course.getInstallments().isEmpty()
            ) {

                try (
                        PreparedStatement statement =
                                connection.prepareStatement(
                                        installmentSql
                                )
                ) {

                    for (
                            CourseInstallment installment :
                            course.getInstallments()
                    ) {

                        statement.setInt(
                                1,
                                course.getCourseId()
                        );

                        statement.setInt(
                                2,
                                installment
                                        .getInstallmentNumber()
                        );

                        statement.setString(
                                3,
                                installment
                                        .getInstallmentName()
                        );

                        statement.setDouble(
                                4,
                                installment.getAmount()
                        );

                        statement.setInt(
                                5,
                                installment.getDueDays()
                        );

                        statement.setDate(
                                6,
                                Date.valueOf(
                                        installment.getDueDate()
                                )
                        );

                        statement.addBatch();
                    }

                    statement.executeBatch();
                }
            }

            connection.commit();

            return true;

        } catch (Exception e) {

            if (connection != null) {

                try {
                    connection.rollback();
                } catch (Exception ignored) {
                }
            }

            System.out.println(
                    "Unable to update course"
            );

            System.out.println(
                    e.getMessage()
            );

            return false;

        } finally {

            if (connection != null) {

                try {
                    connection.setAutoCommit(true);
                    connection.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    public boolean updateCourseStatus(
            int courseId,
            String status) {

        String sql = """
                UPDATE courses
                SET status = ?
                WHERE course_id = ?
                """;

        try (
                Connection connection =
                        DBConnection.getConnection();

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setString(
                    1,
                    status
            );

            statement.setInt(
                    2,
                    courseId
            );

            return statement.executeUpdate() > 0;

        } catch (Exception e) {

            System.out.println(
                    "Unable to change course status"
            );

            System.out.println(
                    e.getMessage()
            );

            return false;
        }
    }

    public boolean deleteCourse(
            int courseId) {

        Connection connection = null;

        try {

            connection =
                    DBConnection.getConnection();

            connection.setAutoCommit(false);

            String installmentSql = """
                    DELETE FROM course_installments
                    WHERE course_id = ?
                    """;

            try (
                    PreparedStatement statement =
                            connection.prepareStatement(
                                    installmentSql
                            )
            ) {

                statement.setInt(
                        1,
                        courseId
                );

                statement.executeUpdate();
            }

            String courseSql = """
                    DELETE FROM courses
                    WHERE course_id = ?
                    """;

            try (
                    PreparedStatement statement =
                            connection.prepareStatement(
                                    courseSql
                            )
            ) {

                statement.setInt(
                        1,
                        courseId
                );

                int result =
                        statement.executeUpdate();

                if (result == 0) {

                    connection.rollback();

                    return false;
                }
            }

            connection.commit();

            return true;

        } catch (Exception e) {

            if (connection != null) {

                try {
                    connection.rollback();
                } catch (Exception ignored) {
                }
            }

            System.out.println(
                    "Unable to delete course"
            );

            System.out.println(
                    e.getMessage()
            );

            return false;

        } finally {

            if (connection != null) {

                try {
                    connection.setAutoCommit(true);
                    connection.close();
                } catch (Exception ignored) {
                }
            }
        }
    }
}