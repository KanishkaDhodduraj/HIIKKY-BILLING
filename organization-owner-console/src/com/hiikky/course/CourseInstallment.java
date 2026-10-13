package com.hiikky.course;

import java.time.LocalDate;

public class CourseInstallment {

    private int installmentId;
    private int courseId;
    private int installmentNumber;
    private String installmentName;
    private double amount;
    private int dueDays;
    private LocalDate dueDate;

    public CourseInstallment() {
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

    public void setInstallmentNumber(
            int installmentNumber) {

        this.installmentNumber = installmentNumber;
    }

    public String getInstallmentName() {
        return installmentName;
    }

    public void setInstallmentName(
            String installmentName) {

        this.installmentName = installmentName;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public int getDueDays() {
        return dueDays;
    }

    public void setDueDays(int dueDays) {
        this.dueDays = dueDays;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
}