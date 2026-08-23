package com.hiikky.course;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class CourseDAO {

    public boolean saveCourse(Course course) {

        String sql = """
                INSERT INTO courses
                (course_code,
                 course_name,
                 duration,
                 duration_unit,
                 course_fee,
                 payment_type,
                 status,
                 description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """;

        try (
                Connection con = DBConnection.getConnection()
        ) {

            if (con == null) {
                System.out.println("Database connection failed.");
                return false;
            }

            try (
                    PreparedStatement preparedStatement =
                            con.prepareStatement(sql)
            ) {

                preparedStatement.setString(
                        1,
                        course.getCourseCode()
                );

                preparedStatement.setString(
                        2,
                        course.getCourseName()
                );

                preparedStatement.setInt(
                        3,
                        course.getDuration()
                );

                preparedStatement.setString(
                        4,
                        course.getDurationUnit()
                );

                preparedStatement.setBigDecimal(
                        5,
                        course.getCourseFee()
                );

                preparedStatement.setString(
                        6,
                        course.getPaymentType().name()
                );

                preparedStatement.setString(
                        7,
                        course.getStatus()
                );

                preparedStatement.setString(
                        8,
                        course.getDescription()
                );

                int row =
                        preparedStatement.executeUpdate();

                return row > 0;
            }

        } catch (SQLException e) {

            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());

            return false;
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
                ORDER BY course_id
                """;

        try (
                Connection con = DBConnection.getConnection()
        ) {

            if (con == null) {
                System.out.println("Database connection failed.");
                return courses;
            }

            try (
                    PreparedStatement preparedStatement =
                            con.prepareStatement(sql);

                    ResultSet resultSet =
                            preparedStatement.executeQuery()
            ) {

                while (resultSet.next()) {

                    Course course =
                            new Course();

                    course.setCourseId(
                            resultSet.getInt("course_id")
                    );

                    course.setCourseCode(
                            resultSet.getString("course_code")
                    );

                    course.setCourseName(
                            resultSet.getString("course_name")
                    );

                    course.setDuration(
                            resultSet.getInt("duration")
                    );

                    course.setDurationUnit(
                            resultSet.getString("duration_unit")
                    );

                    course.setCourseFee(
                            resultSet.getBigDecimal("course_fee")
                    );

                    String paymentType =
                            resultSet.getString("payment_type");

                    if (paymentType != null) {

                        course.setPaymentType(
                                PaymentType.valueOf(
                                        paymentType
                                )
                        );
                    }

                    course.setStatus(
                            resultSet.getString("status")
                    );

                    course.setDescription(
                            resultSet.getString("description")
                    );

                    courses.add(course);
                }
            }

        } catch (SQLException e) {

            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return courses;
    }

    public Course searchCourseById(int courseId) {

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
                Connection con = DBConnection.getConnection()
        ) {

            if (con == null) {
                System.out.println("Database connection failed.");
                return null;
            }

            try (
                    PreparedStatement preparedStatement =
                            con.prepareStatement(sql)
            ) {

                preparedStatement.setInt(
                        1,
                        courseId
                );

                try (
                        ResultSet resultSet =
                                preparedStatement.executeQuery()
                ) {

                    if (resultSet.next()) {

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
                                resultSet.getBigDecimal(
                                        "course_fee"
                                )
                        );

                        String paymentType =
                                resultSet.getString(
                                        "payment_type"
                                );

                        if (paymentType != null) {

                            course.setPaymentType(
                                    PaymentType.valueOf(
                                            paymentType
                                    )
                            );
                        }

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
                }
            }

        } catch (SQLException e) {

            System.out.println(
                    "SQL Exception Occurs"
            );

            System.out.println(
                    e.getMessage()
            );
        }

        return null;
    }

    public boolean updateCourse(Course course) {

        String sql = """
                UPDATE courses
                SET course_code = ?,
                    course_name = ?,
                    duration = ?,
                    duration_unit = ?,
                    course_fee = ?,
                    payment_type = ?,
                    status = ?,
                    description = ?
                WHERE course_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection()
        ) {

            if (con == null) {
                System.out.println("Database connection failed.");
                return false;
            }

            try (
                    PreparedStatement preparedStatement =
                            con.prepareStatement(sql)
            ) {

                preparedStatement.setString(
                        1,
                        course.getCourseCode()
                );

                preparedStatement.setString(
                        2,
                        course.getCourseName()
                );

                preparedStatement.setInt(
                        3,
                        course.getDuration()
                );

                preparedStatement.setString(
                        4,
                        course.getDurationUnit()
                );

                preparedStatement.setBigDecimal(
                        5,
                        course.getCourseFee()
                );

                preparedStatement.setString(
                        6,
                        course.getPaymentType().name()
                );

                preparedStatement.setString(
                        7,
                        course.getStatus()
                );

                preparedStatement.setString(
                        8,
                        course.getDescription()
                );

                preparedStatement.setInt(
                        9,
                        course.getCourseId()
                );

                int row =
                        preparedStatement.executeUpdate();

                return row > 0;
            }

        } catch (SQLException e) {

            System.out.println(
                    "Database Error Occurs"
            );

            System.out.println(
                    e.getMessage()
            );

            return false;
        }
    }

    public boolean deleteCourse(int courseId) {

        String sql =
                "DELETE FROM courses WHERE course_id = ?";

        try (
                Connection con = DBConnection.getConnection()
        ) {

            if (con == null) {
                System.out.println("Database connection failed.");
                return false;
            }

            try (
                    PreparedStatement preparedStatement =
                            con.prepareStatement(sql)
            ) {

                preparedStatement.setInt(
                        1,
                        courseId
                );

                int row =
                        preparedStatement.executeUpdate();

                return row > 0;
            }

        } catch (SQLException e) {

            System.out.println(
                    "SQL Exception Occurs"
            );

            System.out.println(
                    e.getMessage()
            );

            return false;
        }
    }
}