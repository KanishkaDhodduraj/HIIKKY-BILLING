package com.hiikky.course;

import java.math.BigDecimal;

public class Course {

    private int courseId;
    private String courseCode;
    private String courseName;
    private int duration;
    private String durationUnit;
    private BigDecimal courseFee;
    private PaymentType paymentType;
    private String status;
    private String description;

    public Course() {
    }

    public Course(String courseCode,
                  String courseName,
                  int duration,
                  String durationUnit,
                  BigDecimal courseFee,
                  PaymentType paymentType,
                  String status,
                  String description) {

        this.courseCode = courseCode;
        this.courseName = courseName;
        this.duration = duration;
        this.durationUnit = durationUnit;
        this.courseFee = courseFee;
        this.paymentType = paymentType;
        this.status = status;
        this.description = description;
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

    public BigDecimal getCourseFee() {
        return courseFee;
    }

    public void setCourseFee(BigDecimal courseFee) {
        this.courseFee = courseFee;
    }

    public PaymentType getPaymentType() {
        return paymentType;
    }

    public void setPaymentType(PaymentType paymentType) {
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
}