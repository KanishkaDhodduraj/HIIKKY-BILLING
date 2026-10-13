package com.hiikky.subscriber;

import java.util.List;

public class SubscriberService {

    private SubscriberDAO subscriberDAO;

    public SubscriberService() {
        subscriberDAO = new SubscriberDAO();
    }

    public boolean registerSubscriber(Subscriber subscriber) {

        if (!validateSubscriber(subscriber)) {
            return false;
        }

        return subscriberDAO.saveSubscriber(subscriber);
    }

    public List<Subscriber> getAllSubscribers() {
        return subscriberDAO.getAllSubscribers();
    }

    public boolean updateSubscriber(Subscriber subscriber) {

        if (!validateSubscriber(subscriber)) {
            return false;
        }

        return subscriberDAO.updateSubscriber(subscriber);
    }

    public boolean deleteSubscriber(int subscriberId) {

        if (subscriberId <= 0) {
            System.out.println("Invalid Subscriber ID.");
            return false;
        }

        return subscriberDAO.deleteSubscriber(subscriberId);
    }

    public Subscriber searchSubscriberById(int subscriberId) {

        if (subscriberId <= 0) {
            System.out.println("Invalid Subscriber ID.");
            return null;
        }

        return subscriberDAO.searchSubscriberById(subscriberId);
    }

    private boolean validateSubscriber(Subscriber subscriber) {

        if (subscriber.getOrganizationId() <= 0) {
            System.out.println("Invalid Organization ID.");
            return false;
        }

        if (subscriber.getSubscriptionId() <= 0) {
            System.out.println("Invalid Subscription ID.");
            return false;
        }

        if (subscriber.getFullName() == null ||
                subscriber.getFullName().trim().isEmpty()) {
            System.out.println("Subscriber Name is required.");
            return false;
        }

        if (subscriber.getEmail() == null ||
                !subscriber.getEmail().contains("@")) {
            System.out.println("Invalid Email Address.");
            return false;
        }

        if (subscriber.getPhone() == null ||
                !subscriber.getPhone().matches("\\d{10}")) {
            System.out.println("Phone Number must contain exactly 10 digits.");
            return false;
        }

        if (subscriber.getStartDate() == null) {
            System.out.println("Start Date is required.");
            return false;
        }

        if (subscriber.getEndDate() == null) {
            System.out.println("End Date is required.");
            return false;
        }

        if (subscriber.getEndDate().isBefore(subscriber.getStartDate())) {
            System.out.println("End Date cannot be before Start Date.");
            return false;
        }

        if (subscriber.getStatus() == null) {
            System.out.println("Subscriber Status is required.");
            return false;
        }

        return true;
    }
}