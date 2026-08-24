package com.hiikky.course;

import java.util.Scanner;

public class Main {

    public static void main(String[] args) {

        Scanner scanner =
                new Scanner(System.in);

        CourseMenu courseMenu =
                new CourseMenu();

        courseMenu.showCourseMenu(
                scanner
        );

        scanner.close();
    }
}