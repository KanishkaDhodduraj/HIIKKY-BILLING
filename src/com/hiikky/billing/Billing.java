package com.hiikky.billing;

import java.math.BigDecimal;
import java.time.LocalDate;

public class Billing {

    private int billingId;
    private int organizationId;
    private int subscriberId;
    private int subscriptionId;

    private String studentName;
    private String courseName;
    private String paymentName;

    private LocalDate dueDate;
    private BigDecimal amount;

    private BillingStatus status;
    private LocalDate paidDate;

    public Billing() {
    }

    public Billing(
            int billingId,
            int organizationId,
            int subscriberId,
            int subscriptionId,
            String studentName,
            String courseName,
            String paymentName,
            LocalDate dueDate,
            BigDecimal amount,
            BillingStatus status,
            LocalDate paidDate
    ) {
        this.billingId = billingId;
        this.organizationId = organizationId;
        this.subscriberId = subscriberId;
        this.subscriptionId = subscriptionId;
        this.studentName = studentName;
        this.courseName = courseName;
        this.paymentName = paymentName;
        this.dueDate = dueDate;
        this.amount = amount;
        this.status = status;
        this.paidDate = paidDate;
    }

    public int getBillingId() {
        return billingId;
    }

    public void setBillingId(int billingId) {
        this.billingId = billingId;
    }

    public int getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(int organizationId) {
        this.organizationId = organizationId;
    }

    public int getSubscriberId() {
        return subscriberId;
    }

    public void setSubscriberId(int subscriberId) {
        this.subscriberId = subscriberId;
    }

    public int getSubscriptionId() {
        return subscriptionId;
    }

    public void setSubscriptionId(int subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public String getPaymentName() {
        return paymentName;
    }

    public void setPaymentName(String paymentName) {
        this.paymentName = paymentName;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BillingStatus getStatus() {
        return status;
    }

    public void setStatus(BillingStatus status) {
        this.status = status;
    }

    public LocalDate getPaidDate() {
        return paidDate;
    }

    public void setPaidDate(LocalDate paidDate) {
        this.paidDate = paidDate;
    }
}