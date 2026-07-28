package com.hiikky.organization;
import java.util.Scanner;
import com.hiikky.organization.Organization;
import com.hiikky.organization.OrganizationDAO;
import java.util.List;

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

    public void viewAllOrganizations() {
        List<Organization> organizations = organizationService.getAllOrganization();

        if (organizations.isEmpty()) {
            System.out.println("Not found");
            return;
        }

        System.out.println("ORGANIZATION LIST");

        for (Organization organization : organizations) {
            System.out.println("Organization ID:" + organization.getOrganizationId());
            System.out.println("Organization Name:" + organization.getOrganizationName());
            System.out.println("Organization Owner:" + organization.getOrganizationOwner());
            System.out.println(" Email ID:" + organization.getEmail());
            System.out.println("Phone:" + organization.getPhone());
            System.out.println("Address :" + organization.getAddress());
            System.out.println("Status :" + organization.getStatus());
        }
    }

    public void updateOrganizations() {
        System.out.println("UPDATE ORGANIZATION");

        System.out.println("Enter Organization ID:");
        int organizationId = Integer.parseInt(sc.nextLine());

        System.out.println("Enter Organization Name :");
        String organizationName = sc.nextLine();

        System.out.println("Enter Organization Owner Name :");
        String organizationOwner = sc.nextLine();

        System.out.println("Enter Email ID :");
        String email = sc.nextLine();

        System.out.println("Enter Phone number :");
        String phone = sc.nextLine();

        System.out.println("Address :");
        String address = sc.nextLine();

        System.out.println("Enter Status (ACTIVE / INACTIVE) :");
        String status = sc.nextLine();

        Organization organization = new Organization(organizationId, organizationName, organizationOwner, email, phone, address, "ACTIVE");

        boolean result = organizationService.updateOrganization(organization);

        if (result) {
            System.out.println("Organization Updated Successfully!");
        } else {
            System.out.println("Failed to update");
        }
    }
}