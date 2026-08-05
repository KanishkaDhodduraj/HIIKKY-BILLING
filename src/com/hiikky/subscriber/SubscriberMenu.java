package com.hiikky.subscriber;

import java.time.LocalDate;
import java.util.List;
import java.util.Scanner;

public class SubscriberMenu {

    Scanner sc = new Scanner(System.in);

    private SubscriberService subscriberService;

    public SubscriberMenu() {
        subscriberService = new SubscriberService();
    }

    public void registerSubscriber() {

        try {

            System.out.println("REGISTER SUBSCRIBER");

            System.out.println("Enter Organization ID :");
            int organizationId = Integer.parseInt(sc.nextLine());

            System.out.println("Enter Subscription ID :");
            int subscriptionId = Integer.parseInt(sc.nextLine());

            System.out.println("Enter Full Name :");
            String fullName = sc.nextLine();

            System.out.println("Enter Email :");
            String email = sc.nextLine();

            System.out.println("Enter Phone Number :");
            String phone = sc.nextLine();

            System.out.println("Enter Start Date (YYYY-MM-DD) :");
            LocalDate startDate = LocalDate.parse(sc.nextLine());

            System.out.println("Enter End Date (YYYY-MM-DD) :");
            LocalDate endDate = LocalDate.parse(sc.nextLine());

            System.out.println("Enter Status (ACTIVE / INACTIVE) :");
            SubscriberStatus status =
                    SubscriberStatus.valueOf(sc.nextLine().toUpperCase());

            Subscriber subscriber = new Subscriber(
                    0,
                    organizationId,
                    subscriptionId,
                    fullName,
                    email,
                    phone,
                    startDate,
                    endDate,
                    status
            );

            boolean result = subscriberService.registerSubscriber(subscriber);

            if (result) {
                System.out.println("Subscriber Registered Successfully!");
            } else {
                System.out.println("Registration Failed!");
            }

        } catch (Exception e) {
            System.out.println("Invalid Input.");
        }
    }

    public void viewAllSubscribers() {

        List<Subscriber> subscribers = subscriberService.getAllSubscribers();

        if (subscribers.isEmpty()) {
            System.out.println("No Subscribers Found.");
            return;
        }

        System.out.println("SUBSCRIBER LIST");

        for (Subscriber subscriber : subscribers) {
            System.out.println(subscriber);
        }
    }

    public void updateSubscriber() {

        try {

            System.out.println("UPDATE SUBSCRIBER");

            System.out.println("Enter Subscriber ID :");
            int subscriberId = Integer.parseInt(sc.nextLine());

            System.out.println("Enter Organization ID :");
            int organizationId = Integer.parseInt(sc.nextLine());

            System.out.println("Enter Subscription ID :");
            int subscriptionId = Integer.parseInt(sc.nextLine());

            System.out.println("Enter Full Name :");
            String fullName = sc.nextLine();

            System.out.println("Enter Email :");
            String email = sc.nextLine();

            System.out.println("Enter Phone Number :");
            String phone = sc.nextLine();

            System.out.println("Enter Start Date (YYYY-MM-DD) :");
            LocalDate startDate = LocalDate.parse(sc.nextLine());

            System.out.println("Enter End Date (YYYY-MM-DD) :");
            LocalDate endDate = LocalDate.parse(sc.nextLine());

            System.out.println("Enter Status (ACTIVE / INACTIVE) :");
            SubscriberStatus status =
                    SubscriberStatus.valueOf(sc.nextLine().toUpperCase());

            Subscriber subscriber = new Subscriber(
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

            boolean result = subscriberService.updateSubscriber(subscriber);

            if (result) {
                System.out.println("Subscriber Updated Successfully!");
            } else {
                System.out.println("Failed to Update.");
            }

        } catch (Exception e) {
            System.out.println("Invalid Input.");
        }
    }

    public void deleteSubscriber() {

        try {

            System.out.println("DELETE SUBSCRIBER");

            System.out.println("Enter Subscriber ID :");
            int subscriberId = Integer.parseInt(sc.nextLine());

            System.out.println("Are You Sure? (Y/N)");
            String choice = sc.nextLine();

            if (!choice.equalsIgnoreCase("Y")) {
                System.out.println("Deletion Cancelled.");
                return;
            }

            boolean result = subscriberService.deleteSubscriber(subscriberId);

            if (result) {
                System.out.println("Subscriber Deleted Successfully!");
            } else {
                System.out.println("Failed to Delete.");
            }

        } catch (Exception e) {
            System.out.println("Invalid Subscriber ID.");
        }
    }

    public void searchSubscriber() {

        try {

            System.out.println("SEARCH SUBSCRIBER");

            System.out.println("Enter Subscriber ID :");
            int subscriberId = Integer.parseInt(sc.nextLine());

            Subscriber subscriber =
                    subscriberService.searchSubscriberById(subscriberId);

            if (subscriber == null) {
                System.out.println("Subscriber Not Found.");
                return;
            }

            System.out.println(subscriber);

        } catch (Exception e) {
            System.out.println("Invalid Subscriber ID.");
        }
    }
}