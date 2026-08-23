package com.hiikky.course;

import java.math.BigDecimal;
import java.util.List;
import java.util.Scanner;

public class CourseMenu {

    private CourseService courseService;
    private Scanner scanner;

    public CourseMenu() {
        courseService = new CourseService();
        scanner = new Scanner(System.in);
    }

    public void showMenu() {

        int choice;

        do {
            System.out.println();
            System.out.println("=================================");
            System.out.println("          COURSE MANAGEMENT      ");
            System.out.println("=================================");
            System.out.println("1. Create Course");
            System.out.println("2. View All Courses");
            System.out.println("3. Search Course");
            System.out.println("4. Update Course");
            System.out.println("5. Delete Course");
            System.out.println("0. Back");
            System.out.println("=================================");
            System.out.print("Enter your choice: ");

            choice = readInt();

            switch (choice) {

                case 1:
                    createCourse();
                    break;

                case 2:
                    viewAllCourses();
                    break;

                case 3:
                    searchCourse();
                    break;

                case 4:
                    updateCourse();
                    break;

                case 5:
                    deleteCourse();
                    break;

                case 0:
                    System.out.println("Returning to main menu...");
                    break;

                default:
                    System.out.println("Invalid choice.");
            }

        } while (choice != 0);
    }

    private void createCourse() {

        System.out.println();
        System.out.println("========== CREATE COURSE ==========");

        System.out.print("Enter Course Code: ");
        String courseCode = scanner.nextLine().trim();

        System.out.print("Enter Course Name: ");
        String courseName = scanner.nextLine().trim();

        System.out.print("Enter Duration: ");
        int duration = readInt();

        System.out.println("Select Duration Unit:");
        System.out.println("1. Days");
        System.out.println("2. Weeks");
        System.out.println("3. Months");
        System.out.println("4. Years");
        System.out.print("Enter choice: ");

        int durationChoice = readInt();

        String durationUnit;

        switch (durationChoice) {

            case 1:
                durationUnit = "DAYS";
                break;

            case 2:
                durationUnit = "WEEKS";
                break;

            case 3:
                durationUnit = "MONTHS";
                break;

            case 4:
                durationUnit = "YEARS";
                break;

            default:
                System.out.println("Invalid duration unit.");
                return;
        }

        System.out.print("Enter Course Fee: ");
        BigDecimal courseFee = readBigDecimal();

        PaymentType paymentType = selectPaymentType();

        System.out.print("Enter Description: ");
        String description = scanner.nextLine().trim();

        Course course = new Course();

        course.setCourseCode(courseCode);
        course.setCourseName(courseName);
        course.setDuration(duration);
        course.setDurationUnit(durationUnit);
        course.setCourseFee(courseFee);
        course.setPaymentType(paymentType);
        course.setStatus("ACTIVE");
        course.setDescription(description);

        boolean result =
                courseService.registerCourse(course);

        if (result) {
            System.out.println();
            System.out.println("Course created successfully.");
        } else {
            System.out.println();
            System.out.println("Failed to create course.");
        }
    }

    private PaymentType selectPaymentType() {

        System.out.println();
        System.out.println("Select Payment Type:");
        System.out.println("1. Full Payment");
        System.out.println("2. Installments");
        System.out.println("3. Both");
        System.out.print("Enter choice: ");

        int choice = readInt();

        switch (choice) {

            case 1:
                return PaymentType.FULL_PAYMENT;

            case 2:
                return PaymentType.INSTALLMENTS;

            case 3:
                return PaymentType.BOTH;

            default:
                System.out.println(
                        "Invalid payment type. Full Payment selected."
                );

                return PaymentType.FULL_PAYMENT;
        }
    }

    private void viewAllCourses() {

        System.out.println();
        System.out.println("========== ALL COURSES ==========");

        List<Course> courses =
                courseService.getAllCourses();

        if (courses.isEmpty()) {

            System.out.println("No courses found.");
            return;
        }

        for (Course course : courses) {

            System.out.println("---------------------------------");
            System.out.println(
                    "Course ID       : "
                            + course.getCourseId()
            );

            System.out.println(
                    "Course Code     : "
                            + course.getCourseCode()
            );

            System.out.println(
                    "Course Name     : "
                            + course.getCourseName()
            );

            System.out.println(
                    "Duration        : "
                            + course.getDuration()
                            + " "
                            + course.getDurationUnit()
            );

            System.out.println(
                    "Course Fee      : ₹"
                            + course.getCourseFee()
            );

            System.out.println(
                    "Payment Type    : "
                            + course.getPaymentType()
            );

            System.out.println(
                    "Status          : "
                            + course.getStatus()
            );

            System.out.println(
                    "Description     : "
                            + course.getDescription()
            );
        }

        System.out.println("---------------------------------");
    }

    private void searchCourse() {

        System.out.println();
        System.out.println("========== SEARCH COURSE ==========");

        System.out.print("Enter Course ID: ");

        int courseId = readInt();

        Course course =
                courseService.searchCourseById(courseId);

        if (course == null) {

            System.out.println("Course not found.");
            return;
        }

        displayCourse(course);
    }

    private void updateCourse() {

        System.out.println();
        System.out.println("========== UPDATE COURSE ==========");

        System.out.print("Enter Course ID: ");

        int courseId = readInt();

        Course existingCourse =
                courseService.searchCourseById(courseId);

        if (existingCourse == null) {

            System.out.println("Course not found.");
            return;
        }

        System.out.println();
        System.out.println("Current Course Details:");
        displayCourse(existingCourse);

        System.out.println();
        System.out.print("Enter New Course Code: ");
        String courseCode = scanner.nextLine().trim();

        System.out.print("Enter New Course Name: ");
        String courseName = scanner.nextLine().trim();

        System.out.print("Enter New Duration: ");
        int duration = readInt();

        System.out.println("Select Duration Unit:");
        System.out.println("1. Days");
        System.out.println("2. Weeks");
        System.out.println("3. Months");
        System.out.println("4. Years");
        System.out.print("Enter choice: ");

        int durationChoice = readInt();

        String durationUnit;

        switch (durationChoice) {

            case 1:
                durationUnit = "DAYS";
                break;

            case 2:
                durationUnit = "WEEKS";
                break;

            case 3:
                durationUnit = "MONTHS";
                break;

            case 4:
                durationUnit = "YEARS";
                break;

            default:
                System.out.println("Invalid duration unit.");
                return;
        }

        System.out.print("Enter New Course Fee: ");
        BigDecimal courseFee = readBigDecimal();

        PaymentType paymentType =
                selectPaymentType();

        System.out.print("Enter New Description: ");
        String description = scanner.nextLine().trim();

        System.out.println();
        System.out.println("Select Status:");
        System.out.println("1. Active");
        System.out.println("2. Inactive");
        System.out.print("Enter choice: ");

        int statusChoice = readInt();

        String status;

        if (statusChoice == 1) {
            status = "ACTIVE";
        } else if (statusChoice == 2) {
            status = "INACTIVE";
        } else {
            System.out.println("Invalid status.");
            return;
        }

        Course course = new Course();

        course.setCourseId(courseId);
        course.setCourseCode(courseCode);
        course.setCourseName(courseName);
        course.setDuration(duration);
        course.setDurationUnit(durationUnit);
        course.setCourseFee(courseFee);
        course.setPaymentType(paymentType);
        course.setStatus(status);
        course.setDescription(description);

        boolean result =
                courseService.updateCourse(course);

        if (result) {
            System.out.println(
                    "Course updated successfully."
            );
        } else {
            System.out.println(
                    "Failed to update course."
            );
        }
    }

    private void deleteCourse() {

        System.out.println();
        System.out.println("========== DELETE COURSE ==========");

        System.out.print("Enter Course ID: ");

        int courseId = readInt();

        Course course =
                courseService.searchCourseById(courseId);

        if (course == null) {

            System.out.println("Course not found.");
            return;
        }

        displayCourse(course);

        System.out.print(
                "Are you sure you want to delete this course? (Y/N): "
        );

        String confirmation =
                scanner.nextLine().trim();

        if (!confirmation.equalsIgnoreCase("Y")) {

            System.out.println("Delete cancelled.");
            return;
        }

        boolean result =
                courseService.deleteCourse(courseId);

        if (result) {

            System.out.println(
                    "Course deleted successfully."
            );

        } else {

            System.out.println(
                    "Failed to delete course."
            );
        }
    }

    private void displayCourse(Course course) {

        System.out.println("---------------------------------");

        System.out.println(
                "Course ID       : "
                        + course.getCourseId()
        );

        System.out.println(
                "Course Code     : "
                        + course.getCourseCode()
        );

        System.out.println(
                "Course Name     : "
                        + course.getCourseName()
        );

        System.out.println(
                "Duration        : "
                        + course.getDuration()
                        + " "
                        + course.getDurationUnit()
        );

        System.out.println(
                "Course Fee      : ₹"
                        + course.getCourseFee()
        );

        System.out.println(
                "Payment Type    : "
                        + course.getPaymentType()
        );

        System.out.println(
                "Status          : "
                        + course.getStatus()
        );

        System.out.println(
                "Description     : "
                        + course.getDescription()
        );

        System.out.println("---------------------------------");
    }

    private int readInt() {

        while (true) {

            try {

                int value =
                        Integer.parseInt(
                                scanner.nextLine().trim()
                        );

                return value;

            } catch (NumberFormatException e) {

                System.out.print(
                        "Please enter a valid number: "
                );
            }
        }
    }

    private BigDecimal readBigDecimal() {

        while (true) {

            try {

                BigDecimal value =
                        new BigDecimal(
                                scanner.nextLine().trim()
                        );

                if (value.compareTo(BigDecimal.ZERO) <= 0) {

                    System.out.print(
                            "Amount must be greater than 0: "
                    );

                    continue;
                }

                return value;

            } catch (NumberFormatException e) {

                System.out.print(
                        "Please enter a valid amount: "
                );
            }
        }
    }
}