package com.hiikky.organization;
import java.util.Scanner;
import com.hiikky.organization.Organization;

public class OrganizationMenu {

    Scanner sc = new Scanner(System.in);

    private OrganizationService organizationService;

    public OrganizationMenu() {

        organizationService = new OrganizationService();
    }

    public void registerOrganization() {

        System.out.println("REGISTER ORGANIZATION");

        System.out.println("Enter Organization Name : ");
        String organizationName = sc.nextLine();

        System.out.println("Enter Owner Name : ");
        String organizationOwner = sc.nextLine();

        System.out.println("Enter Email ID : ");
        String email = sc.nextLine();

        System.out.println("Enter Phone number : ");
        String phone = sc.nextLine();

        System.out.println("Enter Address : ");
        String address = sc.nextLine();

        Organization organization = new Organization(0, organizationName, organizationOwner, email, phone, address, "ACTIVE");

        boolean result = organizationService.registerOrganization(organization);

        if (result) {
            System.out.println("Registered Succesfully");
        } else {
            System.out.println("Registration Failed! Try Again");
        }
    }
}