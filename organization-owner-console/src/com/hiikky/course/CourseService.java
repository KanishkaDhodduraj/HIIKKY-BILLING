package com.hiikky.course;

import java.time.LocalDate;
import java.util.List;
import java.util.Scanner;

public class CourseService {

    private final CourseDAO courseDAO;

    public CourseService() {
        courseDAO = new CourseDAO();
    }

    public void createCourse(
            Scanner scanner) {

        System.out.println();
        System.out.println(
                "================================="
        );
        System.out.println(
                "          CREATE COURSE           "
        );
        System.out.println(
                "================================="
        );

        String courseCode =
                readRequiredText(
                        scanner,
                        "Course Code : "
                );

        String courseName =
                readRequiredText(
                        scanner,
                        "Course Name : "
                );

        String description =
                readRequiredText(
                        scanner,
                        "Description : "
                );

        int duration =
                readPositiveInteger(
                        scanner,
                        "Duration : "
                );

        String durationUnit =
                selectDurationUnit(scanner);

        double courseFee =
                readPositiveAmount(
                        scanner,
                        "Course Fee : "
                );

        String paymentType =
                selectPaymentType(scanner);

        Course course =
                new Course();

        course.setCourseCode(
                courseCode
        );

        course.setCourseName(
                courseName
        );

        course.setDescription(
                description
        );

        course.setDuration(
                duration
        );

        course.setDurationUnit(
                durationUnit
        );

        course.setCourseFee(
                courseFee
        );

        course.setPaymentType(
                paymentType
        );

        course.setStatus(
                "ACTIVE"
        );

        if (
                paymentType.equals(
                        "INSTALLMENTS"
                )
                        ||
                        paymentType.equals(
                                "BOTH"
                        )
        ) {

            createInstallmentSchedule(
                    scanner,
                    course
            );
        }

        boolean result =
                courseDAO.addCourse(
                        course
                );

        if (result) {

            System.out.println();
            System.out.println(
                    "Course created successfully."
            );

            System.out.println(
                    "Course ID : " +
                            course.getCourseId()
            );

        } else {

            System.out.println();
            System.out.println(
                    "Course creation failed."
            );
        }
    }

    private String selectDurationUnit(
            Scanner scanner) {

        while (true) {

            System.out.println();
            System.out.println(
                    "Duration Unit"
            );

            System.out.println(
                    "1. Months"
            );

            System.out.println(
                    "2. Weeks"
            );

            System.out.println(
                    "3. Days"
            );

            System.out.print(
                    "Choose Duration Unit : "
            );

            String choice =
                    scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    return "MONTHS";

                case "2":
                    return "WEEKS";

                case "3":
                    return "DAYS";

                default:

                    System.out.println(
                            "Invalid duration unit."
                    );
            }
        }
    }

    private String selectPaymentType(
            Scanner scanner) {

        while (true) {

            System.out.println();
            System.out.println(
                    "ASSIGN PAYMENT"
            );

            System.out.println(
                    "1. Full Payment"
            );

            System.out.println(
                    "2. Installments"
            );

            System.out.println(
                    "3. Both"
            );

            System.out.print(
                    "Choose Payment Type : "
            );

            String choice =
                    scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    return "FULL_PAYMENT";

                case "2":
                    return "INSTALLMENTS";

                case "3":
                    return "BOTH";

                default:

                    System.out.println(
                            "Invalid payment type."
                    );
            }
        }
    }

    private void createInstallmentSchedule(
            Scanner scanner,
            Course course) {

        System.out.println();
        System.out.println(
                "================================="
        );

        System.out.println(
                "       INSTALLMENT SCHEDULE       "
        );

        System.out.println(
                "================================="
        );

        System.out.println(
                "Course Fee : ₹" +
                        String.format(
                                "%.2f",
                                course.getCourseFee()
                        )
        );

        System.out.println();

        System.out.println(
                "1. Split Amount Equally"
        );

        System.out.println(
                "2. Add Installments Manually"
        );

        System.out.print(
                "Choose option : "
        );

        String choice =
                scanner.nextLine().trim();

        if (choice.equals("1")) {

            splitAmountEqually(
                    scanner,
                    course
            );

        } else if (choice.equals("2")) {

            createManualInstallments(
                    scanner,
                    course
            );

        } else {

            System.out.println(
                    "Invalid option."
            );

            createInstallmentSchedule(
                    scanner,
                    course
            );
        }
    }

    private void splitAmountEqually(
            Scanner scanner,
            Course course) {

        int count =
                readPositiveInteger(
                        scanner,
                        "Number of Installments : "
                );

        double total =
                course.getCourseFee();

        double baseAmount =
                Math.floor(
                        (total / count) * 100
                ) / 100;

        double remaining =
                total;

        for (
                int i = 1;
                i <= count;
                i++
        ) {

            double amount;

            if (i == count) {

                amount =
                        Math.round(
                                remaining * 100
                        ) / 100.0;

            } else {

                amount =
                        baseAmount;
            }

            String name;

            if (i == 1) {

                name =
                        readRequiredText(
                                scanner,
                                "Installment " +
                                        i +
                                        " Name : "
                        );

            } else {

                System.out.print(
                        "Installment " +
                                i +
                                " Name : "
                );

                name =
                        scanner.nextLine().trim();

                if (name.isEmpty()) {

                    name =
                            "Installment " + i;
                }
            }

            int dueDays =
                    readNonNegativeInteger(
                            scanner,
                            "Due Days : "
                    );

            CourseInstallment installment =
                    new CourseInstallment();

            installment.setInstallmentNumber(
                    i
            );

            installment.setInstallmentName(
                    name
            );

            installment.setAmount(
                    amount
            );

            installment.setDueDays(
                    dueDays
            );

            installment.setDueDate(
                    LocalDate.now()
                            .plusDays(
                                    dueDays
                            )
            );

            course.addInstallment(
                    installment
            );

            remaining -= amount;
        }

        displayInstallmentSummary(
                course
        );
    }

    private void createManualInstallments(
            Scanner scanner,
            Course course) {

        double total =
                course.getCourseFee();

        double enteredAmount = 0;

        int installmentNumber = 1;

        while (
                enteredAmount <
                        total
        ) {

            double remaining =
                    total -
                            enteredAmount;

            System.out.println();
            System.out.println(
                    "Remaining Amount : ₹" +
                            String.format(
                                    "%.2f",
                                    remaining
                            )
            );

            String name =
                    readRequiredText(
                            scanner,
                            "Installment " +
                                    installmentNumber +
                                    " Name : "
                    );

            double amount;

            while (true) {

                amount =
                        readPositiveAmount(
                                scanner,
                                "Amount (₹) : "
                        );

                if (
                        amount <=
                                remaining
                ) {

                    break;
                }

                System.out.println(
                        "Amount cannot exceed ₹" +
                                String.format(
                                        "%.2f",
                                        remaining
                                )
                );
            }

            int dueDays =
                    readNonNegativeInteger(
                            scanner,
                            "Due Days : "
                    );

            CourseInstallment installment =
                    new CourseInstallment();

            installment.setInstallmentNumber(
                    installmentNumber
            );

            installment.setInstallmentName(
                    name
            );

            installment.setAmount(
                    amount
            );

            installment.setDueDays(
                    dueDays
            );

            installment.setDueDate(
                    LocalDate.now()
                            .plusDays(
                                    dueDays
                            )
            );

            course.addInstallment(
                    installment
            );

            enteredAmount += amount;

            installmentNumber++;
        }

        displayInstallmentSummary(
                course
        );
    }

    private void displayInstallmentSummary(
            Course course) {

        System.out.println();
        System.out.println(
                "INSTALLMENT SUMMARY"
        );

        System.out.println(
                "================================="
        );

        double total = 0;

        for (
                CourseInstallment installment :
                course.getInstallments()
        ) {

            System.out.println(
                    installment
                            .getInstallmentNumber()
                            + ". "
                            + installment
                            .getInstallmentName()
                            + " | ₹"
                            + String.format(
                            "%.2f",
                            installment.getAmount()
                    )
                            + " | Due in "
                            + installment.getDueDays()
                            + " days"
                            + " | "
                            + installment.getDueDate()
            );

            total +=
                    installment.getAmount();
        }

        System.out.println(
                "================================="
        );

        System.out.println(
                "Total : ₹" +
                        String.format(
                                "%.2f",
                                total
                        )
        );
    }

    public void viewCourses() {

        List<Course> courses =
                courseDAO.getAllCourses();

        System.out.println();
        System.out.println(
                "================================="
        );

        System.out.println(
                "           ALL COURSES            "
        );

        System.out.println(
                "================================="
        );

        if (courses.isEmpty()) {

            System.out.println(
                    "No courses available."
            );

            return;
        }

        for (Course course : courses) {

            displayCourse(
                    course
            );

            System.out.println(
                    "---------------------------------"
            );
        }
    }

    public void searchCourse(
            Scanner scanner) {

        System.out.println();

        System.out.println(
                "1. Search by Course ID"
        );

        System.out.println(
                "2. Search by Course Code"
        );

        System.out.print(
                "Choose option : "
        );

        String choice =
                scanner.nextLine().trim();

        Course course = null;

        if (choice.equals("1")) {

            int courseId =
                    readPositiveInteger(
                            scanner,
                            "Course ID : "
                    );

            course =
                    courseDAO.getCourseById(
                            courseId
                    );

        } else if (choice.equals("2")) {

            String courseCode =
                    readRequiredText(
                            scanner,
                            "Course Code : "
                    );

            course =
                    courseDAO.searchByCode(
                            courseCode
                    );

        } else {

            System.out.println(
                    "Invalid option."
            );

            return;
        }

        if (course == null) {

            System.out.println(
                    "Course not found."
            );

            return;
        }

        displayCourse(
                course
        );
    }

    public void updateCourse(
            Scanner scanner) {

        int courseId =
                readPositiveInteger(
                        scanner,
                        "Enter Course ID : "
                );

        Course existing =
                courseDAO.getCourseById(
                        courseId
                );

        if (existing == null) {

            System.out.println(
                    "Course not found."
            );

            return;
        }

        System.out.println();

        System.out.println(
                "Current Course Code : " +
                        existing.getCourseCode()
        );

        System.out.print(
                "New Course Code : "
        );

        String courseCode =
                scanner.nextLine().trim();

        if (courseCode.isEmpty()) {

            courseCode =
                    existing.getCourseCode();
        }

        System.out.println(
                "Current Course Name : " +
                        existing.getCourseName()
        );

        System.out.print(
                "New Course Name : "
        );

        String courseName =
                scanner.nextLine().trim();

        if (courseName.isEmpty()) {

            courseName =
                    existing.getCourseName();
        }

        System.out.println(
                "Current Description : " +
                        existing.getDescription()
        );

        System.out.print(
                "New Description : "
        );

        String description =
                scanner.nextLine().trim();

        if (description.isEmpty()) {

            description =
                    existing.getDescription();
        }

        System.out.println(
                "Current Duration : " +
                        existing.getDuration()
                        + " "
                        + existing.getDurationUnit()
        );

        int duration =
                readPositiveInteger(
                        scanner,
                        "New Duration : "
                );

        String durationUnit =
                selectDurationUnit(
                        scanner
                );

        double courseFee =
                readPositiveAmount(
                        scanner,
                        "New Course Fee : "
                );

        String paymentType =
                selectPaymentType(
                        scanner
                );

        Course updated =
                new Course();

        updated.setCourseId(
                existing.getCourseId()
        );

        updated.setCourseCode(
                courseCode
        );

        updated.setCourseName(
                courseName
        );

        updated.setDescription(
                description
        );

        updated.setDuration(
                duration
        );

        updated.setDurationUnit(
                durationUnit
        );

        updated.setCourseFee(
                courseFee
        );

        updated.setPaymentType(
                paymentType
        );

        updated.setStatus(
                existing.getStatus()
        );

        if (
                paymentType.equals(
                        "INSTALLMENTS"
                )
                        ||
                        paymentType.equals(
                                "BOTH"
                        )
        ) {

            createInstallmentSchedule(
                    scanner,
                    updated
            );
        }

        boolean result =
                courseDAO.updateCourse(
                        updated
                );

        if (result) {

            System.out.println(
                    "Course updated successfully."
            );

        } else {

            System.out.println(
                    "Course update failed."
            );
        }
    }

    public void changeCourseStatus(
            Scanner scanner) {

        int courseId =
                readPositiveInteger(
                        scanner,
                        "Enter Course ID : "
                );

        Course course =
                courseDAO.getCourseById(
                        courseId
                );

        if (course == null) {

            System.out.println(
                    "Course not found."
            );

            return;
        }

        String newStatus;

        if (
                course.getStatus()
                        .equalsIgnoreCase(
                                "ACTIVE"
                        )
        ) {

            newStatus =
                    "INACTIVE";

        } else {

            newStatus =
                    "ACTIVE";
        }

        boolean result =
                courseDAO.updateCourseStatus(
                        courseId,
                        newStatus
                );

        if (result) {

            System.out.println(
                    "Course status changed to "
                            + newStatus
            );

        } else {

            System.out.println(
                    "Unable to change course status."
            );
        }
    }

    public void deleteCourse(
            Scanner scanner) {

        int courseId =
                readPositiveInteger(
                        scanner,
                        "Enter Course ID : "
                );

        Course course =
                courseDAO.getCourseById(
                        courseId
                );

        if (course == null) {

            System.out.println(
                    "Course not found."
            );

            return;
        }

        displayCourse(
                course
        );

        System.out.println();

        System.out.print(
                "Enter YES to delete : "
        );

        String confirmation =
                scanner.nextLine().trim();

        if (
                !confirmation.equalsIgnoreCase(
                        "YES"
                )
        ) {

            System.out.println(
                    "Deletion cancelled."
            );

            return;
        }

        boolean result =
                courseDAO.deleteCourse(
                        courseId
                );

        if (result) {

            System.out.println(
                    "Course deleted successfully."
            );

        } else {

            System.out.println(
                    "Course deletion failed."
            );
        }
    }

    private void displayCourse(
            Course course) {

        System.out.println();

        System.out.println(
                "Course ID      : " +
                        course.getCourseId()
        );

        System.out.println(
                "Course Code    : " +
                        course.getCourseCode()
        );

        System.out.println(
                "Course Name    : " +
                        course.getCourseName()
        );

        System.out.println(
                "Description    : " +
                        course.getDescription()
        );

        System.out.println(
                "Duration       : " +
                        course.getDuration()
                        + " "
                        + course.getDurationUnit()
        );

        System.out.println(
                "Course Fee     : ₹" +
                        String.format(
                                "%.2f",
                                course.getCourseFee()
                        )
        );

        System.out.println(
                "Payment Type   : " +
                        course.getPaymentType()
        );

        System.out.println(
                "Status         : " +
                        course.getStatus()
        );

        if (
                course.getInstallments() != null
                        &&
                        !course.getInstallments().isEmpty()
        ) {

            System.out.println();

            System.out.println(
                    "INSTALLMENT SCHEDULE"
            );

            for (
                    CourseInstallment installment :
                    course.getInstallments()
            ) {

                System.out.println(
                        installment
                                .getInstallmentNumber()
                                + ". "
                                + installment
                                .getInstallmentName()
                                + " | ₹"
                                + String.format(
                                "%.2f",
                                installment.getAmount()
                        )
                                + " | Due Days: "
                                + installment.getDueDays()
                                + " | Due Date: "
                                + installment.getDueDate()
                );
            }
        }
    }

    private String readRequiredText(
            Scanner scanner,
            String message) {

        while (true) {

            System.out.print(
                    message
            );

            String value =
                    scanner.nextLine().trim();

            if (!value.isEmpty()) {

                return value;
            }

            System.out.println(
                    "This field is required."
            );
        }
    }

    private int readPositiveInteger(
            Scanner scanner,
            String message) {

        while (true) {

            System.out.print(
                    message
            );

            try {

                int value =
                        Integer.parseInt(
                                scanner.nextLine().trim()
                        );

                if (value > 0) {

                    return value;
                }

                System.out.println(
                        "Enter a value greater than zero."
                );

            } catch (NumberFormatException e) {

                System.out.println(
                        "Enter a valid number."
                );
            }
        }
    }

    private int readNonNegativeInteger(
            Scanner scanner,
            String message) {

        while (true) {

            System.out.print(
                    message
            );

            try {

                int value =
                        Integer.parseInt(
                                scanner.nextLine().trim()
                        );

                if (value >= 0) {

                    return value;
                }

                System.out.println(
                        "Enter zero or a positive number."
                );

            } catch (NumberFormatException e) {

                System.out.println(
                        "Enter a valid number."
                );
            }
        }
    }

    private double readPositiveAmount(
            Scanner scanner,
            String message) {

        while (true) {

            System.out.print(
                    message
            );

            try {

                double value =
                        Double.parseDouble(
                                scanner.nextLine().trim()
                        );

                if (value > 0) {

                    return value;
                }

                System.out.println(
                        "Amount must be greater than zero."
                );

            } catch (NumberFormatException e) {

                System.out.println(
                        "Enter a valid amount."
                );
            }
        }
    }
}