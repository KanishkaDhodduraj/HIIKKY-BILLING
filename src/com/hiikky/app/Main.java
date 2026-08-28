package com.hiikky.app;

import com.hiikky.billing.BillingMenu;
import com.hiikky.course.CourseMenu;
import com.hiikky.organization.OrganizationMenu;
import com.hiikky.organization.OrganizationService;
import com.hiikky.organization.Organization;
import com.hiikky.subscriber.SubscriberMenu;
import com.hiikky.subscription.SubscriptionMenu;

import java.util.Scanner;

public class Main {

    private static final Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {

        System.out.println("=============================================================================");
        System.out.println("              HIIKKY");
        System.out.println(" Subscription & Billing System For E-Learning Businesses");
        System.out.println("=============================================================================");

        int organizationId = selectOrganization();

        if (organizationId == -1) {
            System.out.println("Unable to start application.");
            return;
        }

        showMainMenu(organizationId);
    }

    private static int selectOrganization() {

        OrganizationService organizationService =
                new OrganizationService();

        while (true) {

            System.out.println();
            System.out.println("========================================");
            System.out.println("       SELECT ORGANIZATION");
            System.out.println("========================================");

            System.out.print("Enter Organization ID: ");

            String input = scanner.nextLine().trim();

            int organizationId;

            try {

                organizationId = Integer.parseInt(input);

            } catch (NumberFormatException e) {

                System.out.println(
                        "Please enter a valid Organization ID."
                );

                continue;
            }

            if (organizationId <= 0) {

                System.out.println(
                        "Organization ID must be greater than 0."
                );

                continue;
            }

            Organization organization =
                    organizationService.searchOrganizationById(
                            organizationId
                    );

            if (organization == null) {

                System.out.println(
                        "Organization not found."
                );

                continue;
            }

            System.out.println();
            System.out.println(
                    "Organization selected successfully."
            );

            return organizationId;
        }
    }

    // --------------------------------------------------
    // MAIN MENU FEATURE
    // --------------------------------------------------

    private static void showMainMenu(int organizationId) {

        while (true) {

            System.out.println();
            System.out.println("========================================");
            System.out.println("              MAIN MENU");
            System.out.println("========================================");

            System.out.println(
                    "Organization ID : " + organizationId
            );

            System.out.println();
            System.out.println("1. Organization");
            System.out.println("2. Subscriber");
            System.out.println("3. Subscription");
            System.out.println("4. Course");
            System.out.println("5. Billing");
            System.out.println("0. Exit");

            System.out.println("----------------------------------------");

            System.out.print("Enter choice: ");

            String choice = scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    openOrganization();
                    break;

                case "2":
                    openSubscriber();
                    break;

                case "3":
                    openSubscription();
                    break;

                case "4":
                    openCourse();
                    break;

                case "5":
                    openBilling(organizationId);
                    break;

                case "0":

                    System.out.println();
                    System.out.println(
                            "Thank you for using HIIKKY."
                    );

                    scanner.close();
                    return;

                default:

                    System.out.println(
                            "Invalid choice."
                    );
            }
        }
    }

    // --------------------------------------------------
    // ORGANIZATION MODULE
    // --------------------------------------------------

    private static void openOrganization() {

        OrganizationMenu organizationMenu =
                new OrganizationMenu();

        while (true) {

            System.out.println();
            System.out.println("========================================");
            System.out.println("        ORGANIZATION MANAGEMENT");
            System.out.println("========================================");

            System.out.println("1. Register Organization");
            System.out.println("2. View All Organizations");
            System.out.println("3. Update Organization");
            System.out.println("4. Delete Organization");
            System.out.println("5. Search Organization");
            System.out.println("0. Back");

            System.out.print("Enter choice: ");

            String choice = scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    organizationMenu.registerOrganization();
                    break;

                case "2":
                    organizationMenu.viewAllOrganizations();
                    break;

                case "3":
                    organizationMenu.updateOrganizations();
                    break;

                case "4":
                    organizationMenu.deleteOrganization();
                    break;

                case "5":
                    organizationMenu.searchOrganization();
                    break;

                case "0":
                    return;

                default:
                    System.out.println("Invalid choice.");
            }
        }
    }

    // --------------------------------------------------
    // SUBSCRIBER MODULE
    // --------------------------------------------------

    private static void openSubscriber() {

        SubscriberMenu subscriberMenu =
                new SubscriberMenu();

        while (true) {

            System.out.println();
            System.out.println("========================================");
            System.out.println("          SUBSCRIBER MANAGEMENT");
            System.out.println("========================================");

            System.out.println("1. Register Subscriber");
            System.out.println("2. View All Subscribers");
            System.out.println("3. Update Subscriber");
            System.out.println("4. Delete Subscriber");
            System.out.println("5. Search Subscriber");
            System.out.println("0. Back");

            System.out.print("Enter choice: ");

            String choice = scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    subscriberMenu.registerSubscriber();
                    break;

                case "2":
                    subscriberMenu.viewAllSubscribers();
                    break;

                case "3":
                    subscriberMenu.updateSubscriber();
                    break;

                case "4":
                    subscriberMenu.deleteSubscriber();
                    break;

                case "5":
                    subscriberMenu.searchSubscriber();
                    break;

                case "0":
                    return;

                default:
                    System.out.println("Invalid choice.");
            }
        }
    }

    // --------------------------------------------------
    // SUBSCRIPTION MODULE MAIN
    // --------------------------------------------------

    private static void openSubscription() {

        SubscriptionMenu subscriptionMenu =
                new SubscriptionMenu();

        while (true) {

            System.out.println();
            System.out.println("========================================");
            System.out.println("        SUBSCRIPTION MANAGEMENT");
            System.out.println("========================================");

            System.out.println("1. Register Subscription");
            System.out.println("2. View All Subscriptions");
            System.out.println("3. Update Subscription");
            System.out.println("4. Delete Subscription");
            System.out.println("5. Search Subscription");
            System.out.println("0. Back");

            System.out.print("Enter choice: ");

            String choice = scanner.nextLine().trim();

            switch (choice) {

                case "1":
                    subscriptionMenu.registerSubscription();
                    break;

                case "2":
                    subscriptionMenu.viewAllSubscriptions();
                    break;

                case "3":
                    subscriptionMenu.updateSubscription();
                    break;

                case "4":
                    subscriptionMenu.deleteSubscription();
                    break;

                case "5":
                    subscriptionMenu.searchSubscription();
                    break;

                case "0":
                    return;

                default:
                    System.out.println("Invalid choice.");
            }
        }
    }

    // --------------------------------------------------
    // COURSE MODULE
    // --------------------------------------------------

    private static void openCourse() {

        CourseMenu courseMenu =
                new CourseMenu();

        courseMenu.showCourseMenu(scanner);
    }

    // --------------------------------------------------
    // BILLING SECTION MODULE
    // --------------------------------------------------

    private static void openBilling(int organizationId) {

        BillingMenu billingMenu =
                new BillingMenu();

        billingMenu.show(organizationId);
    }
}