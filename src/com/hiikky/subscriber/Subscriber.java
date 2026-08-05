package com.hiikky.subscriber;

import java.time.LocalDate;

public class Subscriber {

    private int subscriberId;
    private int organizationId;
    private int subscriptionId;
    private String fullName;
    private String email;
    private String phone;
    private LocalDate startDate;
    private LocalDate endDate;
    private SubscriberStatus status;

    public Subscriber() {
    }

    public Subscriber(
            int subscriberId,
            int organizationId,
            int subscriptionId,
            String fullName,
            String email,
            String phone,
            LocalDate startDate,
            LocalDate endDate,
            SubscriberStatus status
    ) {
        this.subscriberId = subscriberId;
        this.organizationId = organizationId;
        this.subscriptionId = subscriptionId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }

    public int getSubscriberId() {
        return subscriberId;
    }

    public void setSubscriberId(int subscriberId) {
        this.subscriberId = subscriberId;
    }

    public int getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(int organizationId) {
        this.organizationId = organizationId;
    }

    public int getSubscriptionId() {
        return subscriptionId;
    }

    public void setSubscriptionId(int subscriptionId) {
        this.subscriptionId = subscriptionId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public SubscriberStatus getStatus() {
        return status;
    }

    public void setStatus(SubscriberStatus status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return """
                
                Subscriber ID    : %d
                Organization ID  : %d
                Subscription ID  : %d
                Full Name        : %s
                Email            : %s
                Phone            : %s
                Start Date       : %s
                End Date         : %s
                Status           : %s
              
                """.formatted(
                subscriberId,
                organizationId,
                subscriptionId,
                fullName,
                email,
                phone,
                startDate,
                endDate,
                status
        );
    }
}