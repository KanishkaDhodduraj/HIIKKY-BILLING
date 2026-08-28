package com.hiikky.billing;

public class BillingNotification {

    private int notificationId;
    private int billingId;
    private int organizationId;
    private int subscriberId;
    private String message;

    public BillingNotification() {
    }

    public BillingNotification(
            int notificationId,
            int billingId,
            int organizationId,
            int subscriberId,
            String message
    ) {
        this.notificationId = notificationId;
        this.billingId = billingId;
        this.organizationId = organizationId;
        this.subscriberId = subscriberId;
        this.message = message;
    }

    public int getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(int notificationId) {
        this.notificationId = notificationId;
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}