package com.hiikky.discount;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Scanner;

public class DiscountMenu {

    private final DiscountService discountService;
    private final Scanner scanner;

    public DiscountMenu() {
        this.discountService = new DiscountService();
        this.scanner = new Scanner(System.in);
    }

    public void show(int organizationId) {

        while (true) {

            System.out.println();
            System.out.println("========================================");
            System.out.println("          DISCOUNT MANAGEMENT");
            System.out.println("========================================");

            System.out.println("1. View All Discounts");
            System.out.println("2. Create Discount");
            System.out.println("3. Deactivate Discount");
            System.out.println("0. Back");

            System.out.println("----------------------------------------");
            System.out.print("Enter choice: ");

            String choice = scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    viewAllDiscounts(organizationId);
                    break;

                case "2":
                    createDiscount(organizationId);
                    break;

                case "3":
                    deactivateDiscount(organizationId);
                    break;

                case "0":
                    return;

                default:
                    System.out.println(
                            "Invalid choice. Please try again."
                    );
            }
        }
    }

    private void viewAllDiscounts(int organizationId) {

        System.out.println();
        System.out.println("========================================");
        System.out.println("           ALL DISCOUNTS");
        System.out.println("========================================");

        List<Discount> discounts =
                discountService.getDiscounts(organizationId);

        if (discounts == null || discounts.isEmpty()) {

            System.out.println("No discounts found.");
            return;
        }

        System.out.println();

        System.out.printf(
                "%-5s %-25s %-15s %-15s %-12s %-12s%n",
                "ID",
                "NAME",
                "TYPE",
                "VALUE",
                "START",
                "STATUS"
        );

        System.out.println(
                "--------------------------------------------------------------------------------"
        );

        for (Discount discount : discounts) {

            String value;

            if (discount.getDiscountType()
                    == DiscountType.PERCENTAGE) {

                value =
                        discount.getDiscountValue()
                                .stripTrailingZeros()
                                .toPlainString()
                                + "%";

            } else {

                value =
                        "₹"
                                + discount.getDiscountValue()
                                .setScale(2)
                                .toPlainString();
            }

            System.out.printf(
                    "%-5d %-25s %-15s %-15s %-12s %-12s%n",
                    discount.getDiscountId(),
                    shorten(
                            discount.getDiscountName(),
                            24
                    ),
                    discount.getDiscountType(),
                    value,
                    discount.getStartDate(),
                    discount.getStatus()
            );
        }

        System.out.println(
                "--------------------------------------------------------------------------------------------"
        );
    }

    private void createDiscount(int organizationId) {

        System.out.println();
        System.out.println("========================================");
        System.out.println("            CREATE DISCOUNT");
        System.out.println("========================================");

        System.out.print("Discount Name: ");

        String name =
                scanner.nextLine().trim();

        if (name.isBlank()) {

            System.out.println(
                    "Discount name cannot be empty."
            );

            return;
        }

        System.out.println();
        System.out.println(
                "Course ID (0 = All Courses)"
        );

        System.out.print("Course ID: ");

        int courseId = readInteger();

        if (courseId < 0) {

            System.out.println(
                    "Course ID cannot be negative."
            );

            return;
        }

        System.out.println();
        System.out.println(
                "Subscriber ID (0 = All Students)"
        );

        System.out.print("Subscriber ID: ");

        int subscriberId = readInteger();

        if (subscriberId < 0) {

            System.out.println(
                    "Subscriber ID cannot be negative."
            );

            return;
        }

        System.out.println();
        System.out.println("Discount Type");

        System.out.println(
                "1. Percentage (%)"
        );

        System.out.println(
                "2. Fixed Amount (₹)"
        );

        System.out.print("Enter choice: ");

        String typeChoice =
                scanner.nextLine().trim();

        DiscountType discountType;

        if (typeChoice.equals("1")) {

            discountType =
                    DiscountType.PERCENTAGE;

        } else if (typeChoice.equals("2")) {

            discountType =
                    DiscountType.FIXED;

        } else {

            System.out.println(
                    "Invalid discount type."
            );

            return;
        }

        System.out.println();

        if (discountType == DiscountType.PERCENTAGE) {

            System.out.print(
                    "Discount Percentage (0-100): "
            );

        } else {

            System.out.print(
                    "Discount Amount (₹): "
            );
        }

        BigDecimal discountValue =
                readBigDecimal();

        if (discountValue == null) {
            return;
        }

        if (discountValue.compareTo(
                BigDecimal.ZERO
        ) <= 0) {

            System.out.println(
                    "Discount value must be greater than 0."
            );

            return;
        }

        if (discountType == DiscountType.PERCENTAGE
                &&
                discountValue.compareTo(
                        new BigDecimal("100")
                ) > 0) {

            System.out.println(
                    "Percentage discount cannot be greater than 100%."
            );

            return;
        }

        System.out.println();
        System.out.print(
                "Start Date (YYYY-MM-DD): "
        );

        LocalDate startDate =
                readDate();

        if (startDate == null) {
            return;
        }

        System.out.print(
                "End Date (YYYY-MM-DD): "
        );

        LocalDate endDate =
                readDate();

        if (endDate == null) {
            return;
        }

        if (endDate.isBefore(startDate)) {

            System.out.println(
                    "End date cannot be before start date."
            );

            return;
        }
        System.out.println();
        System.out.print("Reason: ");

        String reason =
                scanner.nextLine().trim();

        Discount discount =
                new Discount();

        discount.setOrganizationId(
                organizationId
        );

        discount.setDiscountName(
                name
        );

        // 0 means all courses included
        if (courseId == 0) {

            discount.setCourseId(null);

        } else {

            discount.setCourseId(courseId);
        }

        // 0 means all students
        if (subscriberId == 0) {

            discount.setSubscriberId(null);

        } else {

            discount.setSubscriberId(
                    subscriberId
            );
        }

        discount.setDiscountType(
                discountType
        );

        discount.setDiscountValue(
                discountValue
        );

        discount.setStartDate(
                startDate
        );

        discount.setEndDate(
                endDate
        );

        discount.setReason(
                reason
        );

        discount.setStatus(
                DiscountStatus.ACTIVE
        );

        System.out.println();

        System.out.println(
                "Creating discount..."
        );

        boolean created =
                discountService.createDiscount(
                        discount
                );

        if (created) {

            System.out.println();
            System.out.println(
                    "✓ Discount created successfully."
            );

            System.out.println(
                    "Discount Name : "
                            + discount.getDiscountName()
            );

            System.out.println(
                    "Discount Type : "
                            + discount.getDiscountType()
            );

            System.out.println(
                    "Discount Value : "
                            + discount.getDiscountValue()
            );

        } else {

            System.out.println();
            System.out.println(
                    "✗ Failed to create discount."
            );
        }
    }

    private void deactivateDiscount(
            int organizationId
    ) {

        System.out.println();
        System.out.println("========================================");
        System.out.println("         DEACTIVATE DISCOUNT");
        System.out.println("========================================");

        System.out.print(
                "Enter Discount ID: "
        );

        int discountId =
                readInteger();

        if (discountId <= 0) {

            System.out.println(
                    "Invalid Discount ID."
            );

            return;
        }

        System.out.print(
                "Are you sure? (Y/N): "
        );

        String confirmation =
                scanner.nextLine()
                        .trim()
                        .toUpperCase();

        if (!confirmation.equals("Y")) {

            System.out.println(
                    "Operation cancelled."
            );

            return;
        }

        boolean success =
                discountService.deactivateDiscount(
                        organizationId,
                        discountId
                );

        if (success) {

            System.out.println();
            System.out.println(
                    "✓ Discount deactivated successfully."
            );

        } else {

            System.out.println();
            System.out.println(
                    "✗ Discount not found or already inactive."
            );
        }
    }

    private int readInteger() {

        while (true) {

            String input =
                    scanner.nextLine().trim();

            try {

                return Integer.parseInt(input);

            } catch (NumberFormatException e) {

                System.out.print(
                        "Please enter a valid number: "
                );
            }
        }
    }

    private BigDecimal readBigDecimal() {

        String input =
                scanner.nextLine().trim();

        try {

            return new BigDecimal(input);

        } catch (NumberFormatException e) {

            System.out.println(
                    "Invalid amount. Please enter a valid number."
            );

            return null;
        }
    }

    private LocalDate readDate() {

        String input =
                scanner.nextLine().trim();

        try {

            return LocalDate.parse(input);

        } catch (DateTimeParseException e) {

            System.out.println(
                    "Invalid date. Use YYYY-MM-DD."
            );

            return null;
        }
    }
    private String shorten(
            String text,
            int maxLength
    ) {

        if (text == null) {
            return "";
        }

        if (text.length() <= maxLength) {
            return text;
        }

        return text.substring(
                0,
                maxLength - 3
        ) + "...";
    }
}