package com.hiikky.subscription;

public class Subscription {

    private int subscriptionId;
    private String planName;
    private String description;
    private double price;
    private String billingCycle;
    private int maxUsers;
    private SubscriptionStatus status;

    public Subscription() {
    }

    public Subscription(
            int subscriptionId,
            String planName,
            String description,
            double price,
            String billingCycle,
            int maxUsers,
            SubscriptionStatus status
    ) {
        this.subscriptionId = subscriptionId;
        this.planName = planName;
        this.description = description;
        this.price = price;
        this.billingCycle = billingCycle;
        this.maxUsers = maxUsers;
        this.status = status;
    }

    public int getSubscriptionId() {
        return subscriptionId;
    }

    public void setSubscriptionId(int subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getBillingCycle() {
        return billingCycle;
    }

    public void setBillingCycle(String billingCycle) {
        this.billingCycle = billingCycle;
    }

    public int getMaxUsers() {
        return maxUsers;
    }

    public void setMaxUsers(int maxUsers) {
        this.maxUsers = maxUsers;
    }

    public SubscriptionStatus getStatus() {
        return status;
    }

    public void setStatus(SubscriptionStatus status) {
        this.status = status;
    }


    @Override
    public String toString() {
        return """
                Subscription Details :
                
                Subscription ID : %d
                Plan Name       : %s
                Description     : %s
                Price           : %.2f
                Billing Cycle   : %s
                Maximum Users   : %d
                Status          : %s
                """
                .formatted(
                        subscriptionId,
                        planName,
                        description,
                        price,
                        billingCycle,
                        maxUsers,
                        status
                );
    }
}