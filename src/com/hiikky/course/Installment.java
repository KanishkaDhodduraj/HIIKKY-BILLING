package com.hiikky.course;

import java.math.BigDecimal;

public class Installment {

    private int installmentId;
    private int courseId;
    private int installmentNumber;
    private String installmentName;
    private BigDecimal amount;
    private int dueAfterDays;

    public Installment() {
    }

    public Installment(int courseId,
                       int installmentNumber,
                       String installmentName,
                       BigDecimal amount,
                       int dueAfterDays) {

        this.courseId = courseId;
        this.installmentNumber = installmentNumber;
        this.installmentName = installmentName;
        this.amount = amount;
        this.dueAfterDays = dueAfterDays;
    }

    public int getInstallmentId() {
        return installmentId;
    }

    public void setInstallmentId(int installmentId) {
        this.installmentId = installmentId;
    }

    public int getCourseId() {
        return courseId;
    }

    public void setCourseId(int courseId) {
        this.courseId = courseId;
    }

    public int getInstallmentNumber() {
        return installmentNumber;
    }

    public void setInstallmentNumber(int installmentNumber) {
        this.installmentNumber = installmentNumber;
    }

    public String getInstallmentName() {
        return installmentName;
    }

    public void setInstallmentName(String installmentName) {
        this.installmentName = installmentName;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public int getDueAfterDays() {
        return dueAfterDays;
    }

    public void setDueAfterDays(int dueAfterDays) {
        this.dueAfterDays = dueAfterDays;
    }
}