package com.hiikky.admin.dto;

import com.hiikky.admin.model.OwnerStatus;
import jakarta.validation.constraints.Email;

public class UpdateBusinessOwnerRequest {

    private String firstName;
    private String lastName;

    @Email(message = "Email must be a valid email address")
    private String email;

    private String phone;
    private OwnerStatus status;

    public UpdateBusinessOwnerRequest() {
    }

    public UpdateBusinessOwnerRequest(String firstName, String lastName, String email, String phone, OwnerStatus status) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.status = status;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
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

    public OwnerStatus getStatus() {
        return status;
    }

    public void setStatus(OwnerStatus status) {
        this.status = status;
    }
}
