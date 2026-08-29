package com.hiikky.invoice;

import java.math.BigDecimal;
import java.time.LocalDate;

public class Invoice {

    private int billingId;
    private int organizationId;
    private int subscriberId;
    private int courseId;

    private String invoiceNumber;
    private String studentName;
    private String email;
    private String courseName;
    private String paymentName;
    private String installmentName;

    private LocalDate paymentDate;
    private BigDecimal amount;
    private String paymentStatus;

    public Invoice(
            int billingId,
            int organizationId,
            int subscriberId,
            int courseId,
            String studentName,
            String email,
            String courseName,
            String paymentName,
            String installmentName,
            LocalDate paymentDate,
            BigDecimal amount,
            String paymentStatus
    ) {

        this.billingId = billingId;
        this.organizationId = organizationId;
        this.subscriberId = subscriberId;
        this.courseId = courseId;

        this.studentName = studentName;
        this.email = email;
        this.courseName = courseName;
        this.paymentName = paymentName;
        this.installmentName = installmentName;

        this.paymentDate = paymentDate;
        this.amount = amount;
        this.paymentStatus = paymentStatus;

        this.invoiceNumber =
                generateInvoiceNumber(billingId, paymentDate);
    }

    private String generateInvoiceNumber(
            int billingId,
            LocalDate date
    ) {

        int year = date != null
                ? date.getYear()
                : LocalDate.now().getYear();

        return String.format(
                "HIK-INV-%d-%04d",
                year,
                billingId
        );
    }

    public int getBillingId() {
        return billingId;
    }

    public int getOrganizationId() {
        return organizationId;
    }

    public int getSubscriberId() {
        return subscriberId;
    }

    public int getCourseId() {
        return courseId;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public String getStudentName() {
        return studentName;
    }

    public String getEmail() {
        return email;
    }

    public String getCourseName() {
        return courseName;
    }

    public String getPaymentName() {
        return paymentName;
    }

    public String getInstallmentName() {
        return installmentName;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }
}