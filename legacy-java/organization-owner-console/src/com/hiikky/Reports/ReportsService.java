package com.hiikky.Reports;

public class ReportsService {

    private final ReportsDAO reportsDAO;

    public ReportsService() {
        reportsDAO = new ReportsDAO();
    }

    public void showRevenueReport() {

        double revenue = reportsDAO.getTotalRevenue();
        double originalAmount = reportsDAO.getTotalOriginalAmount();
        double discount = reportsDAO.getTotalDiscount();

        System.out.println();
        System.out.println("============================================");
        System.out.println("              REVENUE REPORT");
        System.out.println("============================================");
        System.out.println("Original Amount : Rs. " + originalAmount);
        System.out.println("Discount Given  : Rs. " + discount);
        System.out.println("Revenue         : Rs. " + revenue);
        System.out.println("============================================");
    }

    public void showBillingReport() {

        int totalBills = reportsDAO.getTotalBills();
        int paidBills = reportsDAO.getPaidBills();
        int unpaidBills = reportsDAO.getUnpaidBills();
        int overdueBills = reportsDAO.getOverdueBills();

        double totalAmount = reportsDAO.getTotalBillingAmount();
        double pendingAmount = reportsDAO.getPendingAmount();
        double discount = reportsDAO.getTotalDiscount();

        System.out.println();
        System.out.println("============================================");
        System.out.println("              BILLING REPORT");
        System.out.println("============================================");
        System.out.println("Total Bills     : " + totalBills);
        System.out.println("Paid Bills      : " + paidBills);
        System.out.println("Unpaid Bills    : " + unpaidBills);
        System.out.println("Overdue Bills   : " + overdueBills);
        System.out.println("--------------------------------------------");
        System.out.println("Total Amount    : Rs. " + totalAmount);
        System.out.println("Collected       : Rs. " + reportsDAO.getTotalRevenue());
        System.out.println("Pending Amount  : Rs. " + pendingAmount);
        System.out.println("Discount Given  : Rs. " + discount);
        System.out.println("============================================");
    }

    public void showSubscriptionReport() {

        int total = reportsDAO.getTotalSubscriptions();
        int active = reportsDAO.getActiveSubscriptions();
        int inactive = reportsDAO.getInactiveSubscriptions();

        System.out.println();
        System.out.println("============================================");
        System.out.println("           SUBSCRIPTION REPORT");
        System.out.println("============================================");
        System.out.println("Total Subscriptions  : " + total);
        System.out.println("Active Subscriptions : " + active);
        System.out.println("Inactive             : " + inactive);
        System.out.println("============================================");
    }

    public void showStudentReport() {

        int total = reportsDAO.getTotalSubscribers();
        int active = reportsDAO.getActiveSubscribers();
        int inactive = reportsDAO.getInactiveSubscribers();

        System.out.println();
        System.out.println("============================================");
        System.out.println("               STUDENT REPORT");
        System.out.println("============================================");
        System.out.println("Total Students    : " + total);
        System.out.println("Active Students   : " + active);
        System.out.println("Inactive Students : " + inactive);
        System.out.println("============================================");
    }

    public void showCourseReport() {

        int total = reportsDAO.getTotalCourses();
        int active = reportsDAO.getActiveCourses();
        int inactive = reportsDAO.getInactiveCourses();
        double fees = reportsDAO.getTotalCourseFees();

        System.out.println();
        System.out.println("============================================");
        System.out.println("                COURSE REPORT");
        System.out.println("============================================");
        System.out.println("Total Courses    : " + total);
        System.out.println("Active Courses   : " + active);
        System.out.println("Inactive Courses : " + inactive);
        System.out.println("Active Course Fees : Rs. " + fees);
        System.out.println("============================================");
    }
}