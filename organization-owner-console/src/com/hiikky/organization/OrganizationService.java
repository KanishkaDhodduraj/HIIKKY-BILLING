package com.hiikky.organization;

import java.util.List;

public class OrganizationService {
    private OrganizationDAO organizationDAO;

    public OrganizationService(){
        organizationDAO = new OrganizationDAO();
    }

    public boolean registerOrganization(Organization organization) {
            if (!validateOrganization(organization)) {
                return false;
            }

            return organizationDAO.saveOrganization(organization);
        }

    public List<Organization> getAllOrganization() {
        return  organizationDAO.getAllOrganizations();
    }

    public boolean updateOrganization(Organization organization) {
        if (!validateOrganization(organization)) {
            return false;
        }

        return organizationDAO.updateOrganization(organization);
    }

    public boolean deleteOrganization(int organizationId){

        if (organizationId <= 0) {
            System.out.println("Invalid Organization ID.");
            return false;
        }

        return organizationDAO.deleteOrganization(organizationId);
    }

    public Organization searchOrganizationById(int organizationId){

        if (organizationId <= 0) {
            System.out.println("Invalid Organization ID.");
            return null;
        }

        return organizationDAO.searchOrganizationById(organizationId);
    }

    private boolean validateOrganization(Organization organization) {

        if (organization.getOrganizationName() == null ||
                organization.getOrganizationName().trim().isEmpty()) {

            System.out.println("Organization name is required.");
            return false;
        }

        if (organization.getOrganizationOwner() == null ||
                organization.getOrganizationOwner().trim().isEmpty()) {

            System.out.println("Organization owner is required.");
            return false;
        }

        if (organization.getEmail() == null ||
                !organization.getEmail().contains("@")) {

            System.out.println("Invalid email.");
            return false;
        }

        if (organization.getPhone() == null ||
                !organization.getPhone().matches("\\d{10}")) {

            System.out.println("Phone number should contain exactly 10 digits.");
            return false;
        }

        return true;
    }
}