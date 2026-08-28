package com.hiikky.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Scanner;

public class BillingMenu {

    private final Scanner scanner;
    private final BillingService billingService;

    public BillingMenu() {
        scanner = new Scanner(System.in);
        billingService = new BillingService();
    }

    public void show(int organizationId) {

        while (true) {

            System.out.println();
            System.out.println("==================================================");
            System.out.println("              BILLING");
            System.out.println("==================================================");

            displaySummary(organizationId);

            System.out.println();
            System.out.println("1. View All Billing");
            System.out.println("2. Search Billing");
            System.out.println("3. Filter by Status");
            System.out.println("4. View Billing Details");
            System.out.println("5. Mark Payment as Paid");
            System.out.println("6. Send Payment Notification");
            System.out.println("7. Create Billing");
            System.out.println("0. Back");

            System.out.print("\nEnter choice: ");

            String choice = scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    displayBilling(
                            billingService.getBilling(organizationId)
                    );
                    break;

                case "2":
                    searchBilling(organizationId);
                    break;

                case "3":
                    filterBilling(organizationId);
                    break;

                case "4":
                    viewBillingDetails(organizationId);
                    break;

                case "5":
                    markAsPaid(organizationId);
                    break;

                case "6":
                    sendNotification(organizationId);
                    break;

                case "7":
                    createBilling(organizationId);
                    break;

                case "0":
                    return;

                default:
                    System.out.println("Invalid choice.");
            }
        }
    }

    private void displaySummary(int organizationId) {

        BigDecimal paid =
                billingService.getPaidTotal(organizationId);

        BigDecimal unpaid =
                billingService.getUnpaidTotal(organizationId);

        BigDecimal overdue =
                billingService.getOverdueTotal(organizationId);

        System.out.println("----------------------------------------");
        System.out.println("Paid     : ₹" + formatAmount(paid));
        System.out.println("Unpaid   : ₹" + formatAmount(unpaid));
        System.out.println("Overdue  : ₹" + formatAmount(overdue));
        System.out.println("----------------------------------------");
    }

    private void displayBilling(List<Billing> billings) {

        if (billings.isEmpty()) {
            System.out.println("\nNo billing records found.");
            return;
        }

        System.out.println();
        System.out.println(
                "------------------------------------------------------------------------------------------------"
        );

        System.out.printf(
                "%-5s %-20s %-28s %-18s %-14s %-14s %-10s%n",
                "ID",
                "STUDENT",
                "COURSE",
                "PAYMENT",
                "DUE DATE",
                "AMOUNT",
                "STATUS"
        );

        System.out.println(
                "------------------------------------------------------------------------------------------------"
        );

        for (Billing billing : billings) {

            System.out.printf(
                    "%-5d %-20s %-28s %-18s %-14s ₹%-13s %-10s%n",
                    billing.getBillingId(),
                    shorten(billing.getStudentName(), 19),
                    shorten(billing.getCourseName(), 27),
                    shorten(billing.getPaymentName(), 17),
                    billing.getDueDate(),
                    formatAmount(billing.getAmount()),
                    billing.getStatus()
            );
        }

        System.out.println(
                "----------------------------------------------------------------------------------------------------"
        );
    }

    private void searchBilling(int organizationId) {

        System.out.print("\nSearch student, course or payment: ");

        String keyword = scanner.nextLine().trim();

        if (keyword.isBlank()) {
            System.out.println("Search text cannot be empty.");
            return;
        }

        List<Billing> results =
                billingService.searchBilling(
                        organizationId,
                        keyword,
                        null
                );

        displayBilling(results);
    }

    private void filterBilling(int organizationId) {

        System.out.println("\nSelect Status");
        System.out.println("1. Paid");
        System.out.println("2. Unpaid");
        System.out.println("3. Overdue");

        System.out.print("Enter choice: ");

        String choice = scanner.nextLine().trim();

        BillingStatus status;

        switch (choice) {

            case "1":
                status = BillingStatus.PAID;
                break;

            case "2":
                status = BillingStatus.UNPAID;
                break;

            case "3":
                status = BillingStatus.OVERDUE;
                break;

            default:
                System.out.println("Invalid status.");
                return;
        }

        List<Billing> results =
                billingService.searchBilling(
                        organizationId,
                        null,
                        status
                );

        displayBilling(results);
    }

    private void viewBillingDetails(int organizationId) {

        int billingId = readInt("Enter Billing ID: ");

        Billing billing =
                billingService.getBillingById(
                        organizationId,
                        billingId
                );

        if (billing == null) {
            System.out.println("Billing record not found.");
            return;
        }

        System.out.println();
        System.out.println("================================================");
        System.out.println("          BILLING DETAILS");
        System.out.println("================================================");

        System.out.println("Billing ID   : " + billing.getBillingId());
        System.out.println("Student      : " + billing.getStudentName());
        System.out.println("Course       : " + billing.getCourseName());
        System.out.println("Payment      : " + billing.getPaymentName());
        System.out.println("Due Date     : " + billing.getDueDate());
        System.out.println("Amount       : ₹" + formatAmount(billing.getAmount()));
        System.out.println("Status       : " + billing.getStatus());

        if (billing.getPaidDate() != null) {
            System.out.println("Paid Date    : " + billing.getPaidDate());
        }

        System.out.println("==========================================");
    }

    private void markAsPaid(int organizationId) {

        int billingId = readInt("Enter Billing ID: ");

        Billing billing =
                billingService.getBillingById(
                        organizationId,
                        billingId
                );

        if (billing == null) {
            System.out.println("Billing record not found.");
            return;
        }

        if (billing.getStatus() == BillingStatus.PAID) {
            System.out.println("This payment is already paid.");
            return;
        }

        System.out.print(
                "Confirm marking ₹" +
                        formatAmount(billing.getAmount()) +
                        " as PAID? (yes/no): "
        );

        String confirmation =
                scanner.nextLine().trim();

        if (!confirmation.equalsIgnoreCase("yes")) {
            System.out.println("Operation cancelled.");
            return;
        }

        boolean success =
                billingService.markAsPaid(
                        organizationId,
                        billingId
                );

        if (success) {
            System.out.println("Payment marked as PAID.");
        } else {
            System.out.println("Unable to update payment.");
        }
    }

    private void sendNotification(int organizationId) {

        int billingId = readInt("Enter Billing ID: ");

        Billing billing =
                billingService.getBillingById(
                        organizationId,
                        billingId
                );

        if (billing == null) {
            System.out.println("Billing record not found.");
            return;
        }

        if (billing.getStatus() == BillingStatus.PAID) {
            System.out.println(
                    "Notification is not required for a paid payment."
            );
            return;
        }

        System.out.println();
        System.out.println("========================================");
        System.out.println("     SEND PAYMENT NOTIFICATION");
        System.out.println("========================================");

        System.out.println("Student  : " + billing.getStudentName());
        System.out.println("Course   : " + billing.getCourseName());
        System.out.println("Payment  : " + billing.getPaymentName());
        System.out.println("Amount   : ₹" + formatAmount(billing.getAmount()));
        System.out.println("Due Date : " + billing.getDueDate());
        System.out.println("Status   : " + billing.getStatus());

        System.out.println();
        System.out.println("Default message:");

        String defaultMessage =
                "Your payment is currently pending. " +
                        "Please complete the payment at the earliest.";

        System.out.println(defaultMessage);

        System.out.print(
                "\nUse default message? (yes/no): "
        );

        String choice =
                scanner.nextLine().trim();

        String message;

        if (choice.equalsIgnoreCase("yes")) {
            message = defaultMessage;
        } else {

            System.out.print("Enter message: ");

            message = scanner.nextLine().trim();

            if (message.isBlank()) {
                System.out.println("Message cannot be empty.");
                return;
            }
        }

        boolean success =
                billingService.sendNotification(
                        organizationId,
                        billingId,
                        message
                );

        if (success) {
            System.out.println(
                    "Payment notification sent and logged."
            );
        } else {
            System.out.println(
                    "Unable to send notification."
            );
        }
    }

    private void createBilling(int organizationId) {

        System.out.println();
        System.out.println("========================================");
        System.out.println("           CREATE BILLING");
        System.out.println("========================================");

        int subscriberId =
                readInt("Subscriber ID: ");

        int subscriptionId =
                readInt("Subscription ID: ");

        System.out.print("Payment Name: ");

        String paymentName =
                scanner.nextLine().trim();

        if (paymentName.isBlank()) {
            System.out.println("Payment name is required.");
            return;
        }

        System.out.print("Due Date (YYYY-MM-DD): ");

        LocalDate dueDate;

        try {
            dueDate =
                    LocalDate.parse(
                            scanner.nextLine().trim()
                    );
        } catch (Exception e) {
            System.out.println("Invalid date.");
            return;
        }

        System.out.print("Amount: ");

        BigDecimal amount;

        try {
            amount =
                    new BigDecimal(
                            scanner.nextLine().trim()
                    );
        } catch (Exception e) {
            System.out.println("Invalid amount.");
            return;
        }

        Billing billing = new Billing();

        billing.setOrganizationId(organizationId);
        billing.setSubscriberId(subscriberId);
        billing.setSubscriptionId(subscriptionId);
        billing.setPaymentName(paymentName);
        billing.setDueDate(dueDate);
        billing.setAmount(amount);

        boolean success =
                billingService.createBilling(billing);

        if (success) {
            System.out.println(
                    "Billing record created successfully."
            );
        } else {
            System.out.println(
                    "Unable to create billing record."
            );
        }
    }

    private int readInt(String message) {

        while (true) {

            System.out.print(message);

            try {
                return Integer.parseInt(
                        scanner.nextLine().trim()
                );

            } catch (NumberFormatException e) {
                System.out.println(
                        "Please enter a valid number."
                );
            }
        }
    }

    private String formatAmount(BigDecimal amount) {

        if (amount == null) {
            return "0.00";
        }

        return String.format(
                "%,.2f",
                amount
        );
    }

    private String shorten(String text, int maxLength) {

        if (text == null) {
            return "";
        }

        if (text.length() <= maxLength) {
            return text;
        }

        return text.substring(0, maxLength - 3) + "...";
    }
}