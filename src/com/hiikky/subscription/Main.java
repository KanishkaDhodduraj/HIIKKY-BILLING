package com.hiikky.subscription;
import com.hiikky.subscription.SubscriptionMenu;
import com.hiikky.subscription.Subscription;

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {

        System.out.println("SUBSCRIPTION DETAILS");
                Scanner sc = new Scanner(System.in);

                SubscriptionMenu subscriptionMenu = new SubscriptionMenu();

                while(true) {
                    System.out.println("HIIKKY BILLING APPLICATION");
                    System.out.println("1.Register Subscription");
                    System.out.println("2.View all Subscription");
                    System.out.println("3.Update Subscription");
                    System.out.println("4.Delete Subscription");
                    System.out.println("5.Search Subscription");
                    System.out.println("6.Exit");

                    System.out.println("Enter your Choice : ");
                    int choice = sc.nextInt();
                    sc.nextLine();

                    switch(choice) {
                        case 1:
                            subscriptionMenu.registerSubscription();
                            break;
                        case 2:
                            subscriptionMenu.viewAllSubscriptions();
                            break;
                        case 3:
                            subscriptionMenu.updateSubscription();
                            break;
                        case 4:
                            subscriptionMenu.deleteSubscription();
                            break;
                        case 5:
                            subscriptionMenu.searchSubscription();
                            break;
                        case 6:
                            System.out.println("Thank You");
                            System.exit(0);
                            break;
                        default:
                            System.out.println("Invalid choice");
                    }

                }

            }
        }