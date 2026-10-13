package com.hiikky.organization;

public class Organization {

    private int organizationId;
    private String organizationName;
    private String organizationOwner;
    private String email;
    private String phone;
    private String address;
    private OrganizationStatus status;

    public Organization() {
    }

    public Organization(
            int organizationId,
            String organizationName,
            String organizationOwner,
            String email,
            String phone,
            String address,
            OrganizationStatus status
    ) {
        this.organizationId = organizationId;
        this.organizationName = organizationName;
        this.organizationOwner = organizationOwner;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.status = status;
    }

    public int getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(int organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public String getOrganizationOwner() {
        return organizationOwner;
    }

    public void setOrganizationOwner(String organizationOwner) {
        this.organizationOwner = organizationOwner;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationStatus status) {
        this.status = status;
    }


    @Override

    public String toString() {
        return """
                Organization Details :
                           
                Organization ID    : %d
                Organization Name  : %s
                Owner              : %s
                Email              : %s
                Phone              : %s
                Address            : %s
                Status             : %s
                """.formatted(
                organizationId,
                organizationName,
                organizationOwner,
                email,
                phone,
                address,
                status
        );
    }
}