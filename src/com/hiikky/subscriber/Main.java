package com.hiikky.subscriber;

import java.util.Scanner;

public class Main {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);

        SubscriberMenu subscriberMenu = new SubscriberMenu();

        while (true) {

            System.out.println("SUBSCRIBER MANAGEMENT");

            System.out.println("1. Register Subscriber");
            System.out.println("2. View All Subscribers");
            System.out.println("3. Update Subscriber");
            System.out.println("4. Delete Subscriber");
            System.out.println("5. Search Subscriber");
            System.out.println("6. Exit");
            System.out.print("Enter Your Choice : ");

            int choice = Integer.parseInt(sc.nextLine());

            switch (choice) {

                case 1:
                    subscriberMenu.registerSubscriber();
                    break;

                case 2:
                    subscriberMenu.viewAllSubscribers();
                    break;

                case 3:
                    subscriberMenu.updateSubscriber();
                    break;

                case 4:
                    subscriberMenu.deleteSubscriber();
                    break;

                case 5:
                    subscriberMenu.searchSubscriber();
                    break;

                case 6:
                    System.out.println("Thank You");
                    System.exit(0);
                    break;

                default:
                    System.out.println("Invalid Choice.");
            }
        }
    }
}