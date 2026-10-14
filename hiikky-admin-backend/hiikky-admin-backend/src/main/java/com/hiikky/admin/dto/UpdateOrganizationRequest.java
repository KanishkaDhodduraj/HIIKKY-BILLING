package com.hiikky.admin.dto;

import com.hiikky.admin.model.OrganizationStatus;
import jakarta.validation.constraints.Email;

public class UpdateOrganizationRequest {

    private String name;
    private Long ownerId;

    @Email(message = "Email must be a valid email address")
    private String email;

    private String phone;
    private String address;
    private OrganizationStatus status;

    public UpdateOrganizationRequest() {
    }

    public UpdateOrganizationRequest(String name, Long ownerId, String email, String phone, String address, OrganizationStatus status) {
        this.name = name;
        this.ownerId = ownerId;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
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
}
