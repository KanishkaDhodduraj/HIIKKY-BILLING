package com.hiikky.course;

import java.math.BigDecimal;
import java.util.List;

public class CourseService {

    private CourseDAO courseDAO;

    public CourseService() {
        courseDAO = new CourseDAO();
    }
    public boolean registerCourse(Course course) {

        if (!validateCourse(course)) {
            return false;
        }

        return courseDAO.saveCourse(course);
    }

    public List<Course> getAllCourses() {

        return courseDAO.getAllCourses();
    }

    public boolean updateCourse(Course course) {

        if (!validateCourse(course)) {
            return false;
        }

        if (course.getCourseId() <= 0) {
            System.out.println("Invalid Course ID.");
            return false;
        }

        return courseDAO.updateCourse(course);
    }

    public boolean deleteCourse(int courseId) {

        if (courseId <= 0) {
            System.out.println("Invalid Course ID.");
            return false;
        }

        return courseDAO.deleteCourse(courseId);
    }

    public Course searchCourseById(int courseId) {

        if (courseId <= 0) {
            System.out.println("Invalid Course ID.");
            return null;
        }

        return courseDAO.searchCourseById(courseId);
    }

    private boolean validateCourse(Course course) {

        if (course == null) {
            System.out.println("Course cannot be null.");
            return false;
        }

        if (course.getCourseCode() == null ||
                course.getCourseCode().trim().isEmpty()) {

            System.out.println("Course code is required.");
            return false;
        }

        if (course.getCourseName() == null ||
                course.getCourseName().trim().isEmpty()) {

            System.out.println("Course name is required.");
            return false;
        }

        if (course.getDuration() <= 0) {

            System.out.println("Duration must be greater than 0.");
            return false;
        }

        if (course.getDurationUnit() == null ||
                course.getDurationUnit().trim().isEmpty()) {

            System.out.println("Duration unit is required.");
            return false;
        }

        if (course.getCourseFee() == null ||
                course.getCourseFee().compareTo(BigDecimal.ZERO) <= 0) {

            System.out.println("Course fee must be greater than 0.");
            return false;
        }

        if (course.getPaymentType() == null) {

            System.out.println("Payment type is required.");
            return false;
        }

        if (course.getStatus() == null ||
                course.getStatus().trim().isEmpty()) {

            System.out.println("Course status is required.");
            return false;
        }

        return true;
    }
}