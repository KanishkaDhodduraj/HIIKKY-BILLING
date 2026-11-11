package com.hiikky.course;

import java.util.ArrayList;
import java.util.List;

public class Course {

    private int courseId;
    private String courseCode;
    private String courseName;
    private int duration;
    private String durationUnit;
    private double courseFee;
    private String paymentType;
    private String status;
    private String description;
    private List<CourseInstallment> installments;

    public Course() {
        installments = new ArrayList<>();
    }

    public int getCourseId() {
        return courseId;
    }

    public void setCourseId(int courseId) {
        this.courseId = courseId;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public int getDuration() {
        return duration;
    }

    public void setDuration(int duration) {
        this.duration = duration;
    }

    public String getDurationUnit() {
        return durationUnit;
    }

    public void setDurationUnit(String durationUnit) {
        this.durationUnit = durationUnit;
    }

    public double getCourseFee() {
        return courseFee;
    }

    public void setCourseFee(double courseFee) {
        this.courseFee = courseFee;
    }

    public String getPaymentType() {
        return paymentType;
    }

    public void setPaymentType(String paymentType) {
        this.paymentType = paymentType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<CourseInstallment> getInstallments() {
        return installments;
    }

    public void setInstallments(
            List<CourseInstallment> installments) {

        this.installments = installments;
    }

    public void addInstallment(
            CourseInstallment installment) {

        if (installments == null) {
            installments = new ArrayList<>();
        }

        installments.add(installment);
    }

    public void clearInstallments() {

        if (installments == null) {
            installments = new ArrayList<>();
        } else {
            installments.clear();
        }
    }
}