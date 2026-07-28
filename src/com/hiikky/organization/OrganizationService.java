package com.hiikky.organization;
import com.hiikky.organization.Organization;
import com.hiikky.organization.OrganizationDAO;
import java.util.List;

public class OrganizationService {
    private OrganizationDAO organizationDAO;

    public OrganizationService(){
        organizationDAO = new OrganizationDAO();
    }

    public boolean registerOrganization(Organization organization) {
        if(organization.getOrganizationName() == null || organization.getOrganizationName().trim().isEmpty()){
            System.out.println("Organization's name required");
            return false;
        }

        if(organization.getOrganizationOwner() == null || organization.getOrganizationOwner().trim().isEmpty()){
            System.out.println("Name required");
            return false;
        }

        if(organization.getEmail() == null || !organization.getEmail().contains("@")){
            System.out.println("Invalid Email");
            return false;
        }

        if(organization.getPhone() == null || !organization.getPhone().matches("\\d{10}")) {
            System.out.println("Phone number should be 10 digits.");
            return false;
        }

    return organizationDAO.saveOrganization(organization);
    }

    public List<Organization> getAllOrganization() {
        return  organizationDAO.getAllOrganizations();
    }

    public boolean updateOrganization(Organization organization) {
        if(organization.getOrganizationName() == null || organization.getOrganizationName().trim().isEmpty()){
            System.out.println("Organization's name required");
            return false;
        }

        if(organization.getOrganizationOwner() == null || organization.getOrganizationOwner().trim().isEmpty()){
            System.out.println("Name required");
            return false;
        }

        if(organization.getEmail() == null || !organization.getEmail().contains("@")){
            System.out.println("Invalid Email");
            return false;
        }

        if(organization.getPhone() == null || !organization.getPhone().matches("\\d{10}")) {
            System.out.println("Phone number should be 10 digits.");
            return false;
        }

        return organizationDAO.updateOrganization(organization);
    }

    public boolean deleteOrganization(int organizationId){

        if(organizationId <= 0) {
            System.out.println("Invalid");
            return false;
        }
        return organizationDAO.deleteOrganization(organizationId);
    }

}