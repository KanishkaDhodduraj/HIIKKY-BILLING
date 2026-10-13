package com.hiikky.invoice;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Scanner;

public class InvoiceMenu {

    private final InvoiceService invoiceService;
    private final Scanner scanner;

    public InvoiceMenu() {

        invoiceService = new InvoiceService();
        scanner = new Scanner(System.in);
    }


    // ==================================================
    // MAIN INVOICE MENU
    // ==================================================

    public void show(int organizationId) {

        while (true) {

            System.out.println();
            System.out.println(
                    "========================================"
            );
            System.out.println(
                    "              INVOICES"
            );
            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "1. View Paid Invoices"
            );

            System.out.println(
                    "2. View Invoice"
            );

            System.out.println(
                    "3. Download Invoice"
            );

            System.out.println(
                    "0. Back"
            );

            System.out.println(
                    "----------------------------------------"
            );

            System.out.print(
                    "Enter choice: "
            );

            String choice =
                    scanner.nextLine().trim();


            switch (choice) {

                case "1":
                    viewPaidInvoices(
                            organizationId
                    );
                    break;

                case "2":
                    viewInvoice(
                            organizationId
                    );
                    break;

                case "3":
                    downloadInvoice(
                            organizationId
                    );
                    break;

                case "0":
                    return;

                default:
                    System.out.println(
                            "Invalid choice."
                    );
            }
        }
    }


    // ==================================================
    // VIEW ALL PAID INVOICES
    // ==================================================

    private void viewPaidInvoices(
            int organizationId
    ) {

        List<Invoice> invoices =
                invoiceService.getPaidInvoices(
                        organizationId
                );


        if (invoices.isEmpty()) {

            System.out.println();
            System.out.println(
                    "No paid invoices found."
            );

            return;
        }


        System.out.println();

        System.out.println(
                "=============================================================================================="
        );

        System.out.printf(
                "%-20s %-20s %-27s %-20s %-15s %-12s%n",
                "Invoice",
                "Student",
                "Course",
                "Payment",
                "Date",
                "Amount"
        );

        System.out.println(
                "----------------------------------------------------------------------------------------------"
        );


        for (Invoice invoice : invoices) {

            String payment =
                    getPaymentDisplayName(invoice);


            System.out.printf(
                    "%-20s %-20s %-27s %-20s %-15s ₹%-11.2f%n",

                    invoice.getInvoiceNumber(),

                    invoice.getStudentName(),

                    invoice.getCourseName(),

                    payment,

                    formatDate(
                            invoice.getPaymentDate()
                    ),

                    invoice.getAmount()
            );
        }


        System.out.println(
                "=============================================================================================="
        );
    }


    // ==================================================
    // VIEW SINGLE INVOICE
    // ==================================================

    private void viewInvoice(
            int organizationId
    ) {

        System.out.print(
                "Enter Billing ID: "
        );


        int billingId;


        try {

            billingId =
                    Integer.parseInt(
                            scanner.nextLine().trim()
                    );

        } catch (NumberFormatException e) {

            System.out.println(
                    "Invalid Billing ID."
            );

            return;
        }


        Invoice invoice =
                invoiceService.getPaidInvoice(
                        organizationId,
                        billingId
                );


        if (invoice == null) {

            System.out.println();

            System.out.println(
                    "Invoice not found or payment is not PAID."
            );

            return;
        }


        printInvoice(invoice);
    }


    // ==================================================
    // PRINT INVOICE
    // ==================================================

    private void printInvoice(
            Invoice invoice
    ) {

        System.out.println();

        System.out.println(
                "=============================================="
        );

        System.out.println(
                "                  HIIKKY"
        );

        System.out.println(
                "              PAYMENT INVOICE"
        );

        System.out.println(
                "=============================================="
        );


        System.out.println(
                "Invoice Number : "
                        + invoice.getInvoiceNumber()
        );

        System.out.println(
                "Payment Status : "
                        + invoice.getPaymentStatus()
        );


        System.out.println(
                "----------------------------------------------"
        );


        System.out.println(
                "Student        : "
                        + invoice.getStudentName()
        );

        System.out.println(
                "Email          : "
                        + invoice.getEmail()
        );

        System.out.println(
                "Course         : "
                        + invoice.getCourseName()
        );

        System.out.println(
                "Payment        : "
                        + getPaymentDisplayName(invoice)
        );

        System.out.println(
                "Payment Date   : "
                        + formatDate(
                        invoice.getPaymentDate()
                )
        );

        System.out.println(
                "Amount         : ₹"
                        + invoice.getAmount()
        );


        System.out.println(
                "----------------------------------------------"
        );

        System.out.println(
                "             PAYMENT RECEIVED"
        );

        System.out.println(
                "=============================================="
        );
    }


    // ==================================================
    // DOWNLOAD TEXT INVOICE
    // ==================================================

    private void downloadInvoice(
            int organizationId
    ) {

        System.out.print(
                "Enter Billing ID: "
        );


        int billingId;


        try {

            billingId =
                    Integer.parseInt(
                            scanner.nextLine().trim()
                    );

        } catch (NumberFormatException e) {

            System.out.println(
                    "Invalid Billing ID."
            );

            return;
        }


        Invoice invoice =
                invoiceService.getPaidInvoice(
                        organizationId,
                        billingId
                );


        if (invoice == null) {

            System.out.println();

            System.out.println(
                    "Invoice not found or payment is not PAID."
            );

            return;
        }


        generateTextInvoice(invoice);
    }


    // ==================================================
    // CREATE .TXT FILE
    // ==================================================

    private void generateTextInvoice(
            Invoice invoice
    ) {

        String folderPath = "invoices";


        File folder =
                new File(folderPath);


        if (!folder.exists()) {

            folder.mkdirs();
        }


        String fileName =
                invoice.getInvoiceNumber()
                        + ".txt";


        File file =
                new File(
                        folder,
                        fileName
                );


        try (
                FileWriter writer =
                        new FileWriter(file)
        ) {


            writer.write(
                    "==============================================\n"
            );

            writer.write(
                    "                  HIIKKY\n"
            );

            writer.write(
                    "              PAYMENT INVOICE\n"
            );

            writer.write(
                    "==============================================\n\n"
            );


            writer.write(
                    "Invoice Number : "
                            + invoice.getInvoiceNumber()
                            + "\n"
            );

            writer.write(
                    "Payment Status : "
                            + invoice.getPaymentStatus()
                            + "\n\n"
            );


            writer.write(
                    "----------------------------------------------\n"
            );


            writer.write(
                    "Student        : "
                            + invoice.getStudentName()
                            + "\n"
            );

            writer.write(
                    "Email          : "
                            + invoice.getEmail()
                            + "\n"
            );

            writer.write(
                    "Course         : "
                            + invoice.getCourseName()
                            + "\n"
            );

            writer.write(
                    "Payment        : "
                            + getPaymentDisplayName(invoice)
                            + "\n"
            );

            writer.write(
                    "Payment Date   : "
                            + formatDate(
                            invoice.getPaymentDate()
                    )
                            + "\n"
            );

            writer.write(
                    "Amount         : ₹"
                            + invoice.getAmount()
                            + "\n"
            );


            writer.write(
                    "----------------------------------------------\n\n"
            );


            writer.write(
                    "             PAYMENT RECEIVED\n"
            );


            writer.write(
                    "==============================================\n"
            );


            System.out.println();

            System.out.println(
                    "Invoice downloaded successfully."
            );

            System.out.println(
                    "File: "
                            + file.getAbsolutePath()
            );


        } catch (IOException e) {

            System.out.println(
                    "Error creating invoice file."
            );

            e.printStackTrace();
        }
    }


    // ==================================================
    // PAYMENT NAME
    // ==================================================

    private String getPaymentDisplayName(
            Invoice invoice
    ) {

        if (
                invoice.getInstallmentName() != null
                        &&
                        !invoice.getInstallmentName().isBlank()
        ) {

            return invoice.getInstallmentName();
        }


        return invoice.getPaymentName();
    }


    // ==================================================
    // DATE FORMAT
    // ==================================================

    private String formatDate(
            LocalDate date
    ) {

        if (date == null) {

            return "-";
        }


        return date.format(
                DateTimeFormatter.ofPattern(
                        "dd MMM yyyy"
                )
        );
    }
}