package com.hiikky.subscription;

import java.util.List;

public class SubscriptionService {

    private SubscriptionDAO subscriptionDAO;

    public SubscriptionService() {
        subscriptionDAO = new SubscriptionDAO();
    }

    public boolean registerSubscription(Subscription subscription) {
        if (!validateSubscription(subscription)) {
            return false;
        }

        return subscriptionDAO.saveSubscription(subscription);
    }

    public List<Subscription> getAllSubscriptions() {
        return subscriptionDAO.getAllSubscriptions();
    }

    public boolean updateSubscription(Subscription subscription) {
        if (!validateSubscription(subscription)) {
            return false;
        }

        return subscriptionDAO.updateSubscription(subscription);
    }

    public boolean deleteSubscription(int subscriptionId) {

        if (subscriptionId <= 0) {
            System.out.println("Invalid Subscription ID.");
            return false;
        }

        return subscriptionDAO.deleteSubscription(subscriptionId);
    }

    public Subscription searchSubscriptionById(int subscriptionId) {

        if (subscriptionId <= 0) {
            System.out.println("Invalid Subscription ID.");
            return null;
        }

        return subscriptionDAO.searchSubscriptionById(subscriptionId);
    }
    private boolean validateSubscription(Subscription subscription) {

        if (subscription.getPlanName() == null ||
                subscription.getPlanName().trim().isEmpty()) {

            System.out.println("Plan Name is required.");
            return false;
        }

        if (subscription.getDescription() == null ||
                subscription.getDescription().trim().isEmpty()) {

            System.out.println("Description is required.");
            return false;
        }

        if (subscription.getPrice() <= 0) {

            System.out.println("Price must be greater than 0.");
            return false;
        }

        if (subscription.getBillingCycle() == null ||
                subscription.getBillingCycle().trim().isEmpty()) {

            System.out.println("Billing Cycle is required.");
            return false;
        }

        if (subscription.getMaxUsers() <= 0) {

            System.out.println("Maximum Users must be greater than 0.");
            return false;
        }

        if (subscription.getStatus() == null) {

            System.out.println("Status is required.");
            return false;
        }

        return true;
    }
}