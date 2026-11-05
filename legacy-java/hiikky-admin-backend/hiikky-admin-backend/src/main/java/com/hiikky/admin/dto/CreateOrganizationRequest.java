package com.hiikky.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class CreateOrganizationRequest {

    @NotBlank(message = "Organization name is required")
    private String name;

    private Long ownerId;

    @NotBlank(message = "Organization email is required")
    @Email(message = "Email must be a valid email address")
    private String email;

    private String phone;
    private String address;

    public CreateOrganizationRequest() {
    }

    public CreateOrganizationRequest(String name, Long ownerId, String email, String phone, String address) {
        this.name = name;
        this.ownerId = ownerId;
        this.email = email;
        this.phone = phone;
        this.address = address;
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
}
