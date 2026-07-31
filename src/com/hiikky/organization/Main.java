package com.hiikky;
import com.hiikky.organization.OrganizationMenu;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        OrganizationMenu organizationMenu = new OrganizationMenu();

        while(true) {
            System.out.println("HIIKKY BILLING APPLICATION");
            System.out.println("1.Register Organization");
            System.out.println("2.View all Organizations");
            System.out.println("3.Update Oraganizations");
            System.out.println("4.Delete Organization");
            System.out.println("5.Search Organization");
            System.out.println("6.Exit");

            System.out.println("Enter your Choice : ");
            int choice = sc.nextInt();
            sc.nextLine();

            switch(choice) {
                case 1:
                    organizationMenu.registerOrganization();
                    break;
                case 2:
                    organizationMenu.viewAllOrganizations();
                    break;
                case 3:
                    organizationMenu.updateOrganizations();
                    break;
                case 4:
                    organizationMenu.deleteOrganization();
                    break;
                case 5:
                    organizationMenu.searchOrganization();
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