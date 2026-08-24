package com.hiikky.course;

import java.util.Scanner;

public class CourseMenu {

    private final CourseService courseService;

    public CourseMenu() {
        courseService =
                new CourseService();
    }

    public void showCourseMenu(
            Scanner scanner) {

        while (true) {

            System.out.println();

            System.out.println(
                    "================================="
            );

            System.out.println(
                    "          COURSE MODULE           "
            );

            System.out.println(
                    "================================="
            );

            System.out.println(
                    "1. Create Course"
            );

            System.out.println(
                    "2. View Courses"
            );

            System.out.println(
                    "3. Search Course"
            );

            System.out.println(
                    "4. Update Course"
            );

            System.out.println(
                    "5. Change Course Status"
            );

            System.out.println(
                    "6. Delete Course"
            );

            System.out.println(
                    "7. Back"
            );

            System.out.println(
                    "================================="
            );

            System.out.print(
                    "Choose an option : "
            );

            String choice =
                    scanner.nextLine().trim();

            switch (choice) {

                case "1":

                    courseService.createCourse(
                            scanner
                    );

                    break;

                case "2":

                    courseService.viewCourses();

                    break;

                case "3":

                    courseService.searchCourse(
                            scanner
                    );

                    break;

                case "4":

                    courseService.updateCourse(
                            scanner
                    );

                    break;

                case "5":

                    courseService.changeCourseStatus(
                            scanner
                    );

                    break;

                case "6":

                    courseService.deleteCourse(
                            scanner
                    );

                    break;

                case "7":

                    return;

                default:

                    System.out.println(
                            "Invalid option."
                    );
            }
        }
    }
}