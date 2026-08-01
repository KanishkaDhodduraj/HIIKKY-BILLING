package com.hiikky.subscription;

import java.util.List;
import java.util.Scanner;

public class SubscriptionMenu {

    Scanner sc = new Scanner(System.in);

    private SubscriptionService subscriptionService;

    public SubscriptionMenu() {
        subscriptionService = new SubscriptionService();
    }

    public void registerSubscription() {

        System.out.println("REGISTER SUBSCRIPTION");

        System.out.println("Enter Plan Name : ");
        String planName = sc.nextLine();

        System.out.println("Enter Description : ");
        String description = sc.nextLine();

        System.out.println("Enter Price : ");
        double price = Double.parseDouble(sc.nextLine());

        System.out.println("Enter Billing Cycle (MONTHLY / YEARLY) : ");
        String billingCycle = sc.nextLine();

        System.out.println("Enter Maximum Users : ");
        int maxUsers = Integer.parseInt(sc.nextLine());

        Subscription subscription = new Subscription(
                0,
                planName,
                description,
                price,
                billingCycle,
                maxUsers,
                "ACTIVE"
        );

        boolean result = subscriptionService.registerSubscription(subscription);

        if (result) {
            System.out.println("Subscription Registered Successfully!");
        } else {
            System.out.println("Registration Failed!");
        }
    }

    public void viewAllSubscriptions() {

        List<Subscription> subscriptions = subscriptionService.getAllSubscriptions();

        if (subscriptions.isEmpty()) {
            System.out.println("No Subscription Plans Found.");
            return;
        }

        System.out.println("SUBSCRIPTION LIST");

        for (Subscription subscription : subscriptions) {
            System.out.println("Subscription ID : " + subscription.getSubscriptionId());
            System.out.println("Plan Name       : " + subscription.getPlanName());
            System.out.println("Description     : " + subscription.getDescription());
            System.out.println("Price           : " + subscription.getPrice());
            System.out.println("Billing Cycle   : " + subscription.getBillingCycle());
            System.out.println("Maximum Users   : " + subscription.getMaxUsers());
            System.out.println("Status          : " + subscription.getStatus());
        }
    }

    public void updateSubscription() {

        System.out.println("UPDATE SUBSCRIPTION");

        System.out.println("Enter Subscription ID : ");
        int subscriptionId = Integer.parseInt(sc.nextLine());

        System.out.println("Enter Plan Name : ");
        String planName = sc.nextLine();

        System.out.println("Enter Description : ");
        String description = sc.nextLine();

        System.out.println("Enter Price : ");
        double price = Double.parseDouble(sc.nextLine());

        System.out.println("Enter Billing Cycle (MONTHLY / YEARLY) : ");
        String billingCycle = sc.nextLine();

        System.out.println("Enter Maximum Users : ");
        int maxUsers = Integer.parseInt(sc.nextLine());

        System.out.println("Enter Status (ACTIVE / INACTIVE) : ");
        String status = sc.nextLine();

        Subscription subscription = new Subscription(
                subscriptionId,
                planName,
                description,
                price,
                billingCycle,
                maxUsers,
                status
        );

        boolean result = subscriptionService.updateSubscription(subscription);

        if (result) {
            System.out.println("Subscription Updated Successfully!");
        } else {
            System.out.println("Failed to Update Subscription!");
        }
    }

    public void deleteSubscription() {

        System.out.println("DELETE SUBSCRIPTION");

        System.out.println("Enter Subscription ID : ");
        int subscriptionId = Integer.parseInt(sc.nextLine());

        System.out.println("Are you sure? (Y/N)");

        String choice = sc.nextLine();

        if (!choice.equalsIgnoreCase("Y")) {
            System.out.println("Deletion Cancelled.");
            return;
        }

        boolean result = subscriptionService.deleteSubscription(subscriptionId);

        if (result) {
            System.out.println("Subscription Deleted Successfully!");
        } else {
            System.out.println("Failed to Delete Subscription!");
        }
    }

    public void searchSubscription() {

        System.out.println("SEARCH SUBSCRIPTION");

        System.out.println("Enter Subscription ID : ");
        int subscriptionId = Integer.parseInt(sc.nextLine());

        Subscription subscription = subscriptionService.searchSubscriptionById(subscriptionId);

        if (subscription == null) {
            System.out.println("Subscription Not Found.");
            return;
        }

        System.out.println("Subscription ID : " + subscription.getSubscriptionId());
        System.out.println("Plan Name       : " + subscription.getPlanName());
        System.out.println("Description     : " + subscription.getDescription());
        System.out.println("Price           : " + subscription.getPrice());
        System.out.println("Billing Cycle   : " + subscription.getBillingCycle());
        System.out.println("Maximum Users   : " + subscription.getMaxUsers());
        System.out.println("Status          : " + subscription.getStatus());
    }
}