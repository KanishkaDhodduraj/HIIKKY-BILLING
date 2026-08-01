package com.hiikky.subscription;

import java.util.List;

public class SubscriptionService {

    private SubscriptionDAO subscriptionDAO;

    public SubscriptionService() {
        subscriptionDAO = new SubscriptionDAO();
    }

    public boolean registerSubscription(Subscription subscription) {
        return subscriptionDAO.saveSubscription(subscription);
    }

    public List<Subscription> getAllSubscriptions() {
        return subscriptionDAO.getAllSubscriptions();
    }

    public boolean updateSubscription(Subscription subscription) {
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
}