package com.hiikky.Reports;

public class Reports {

    private String reportName;
    private double amount;
    private int count;

    public Reports() {
    }

    public Reports(String reportName, double amount, int count) {
        this.reportName = reportName;
        this.amount = amount;
        this.count = count;
    }

    public String getReportName() {
        return reportName;
    }

    public void setReportName(String reportName) {
        this.reportName = reportName;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }
}