package com.hiikky.admin.dto;

import com.hiikky.admin.model.AdminRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class UpdateAdminAccountRequest {

    @Email(message = "Email must be a valid email address")
    private String email;

    private AdminRole role;

    private Boolean enabled;

    @Size(min = 8, message = "Password must be at least 8 characters if provided")
    private String password;

    public UpdateAdminAccountRequest() {
    }

    public UpdateAdminAccountRequest(String email, AdminRole role, Boolean enabled, String password) {
        this.email = email;
        this.role = role;
        this.enabled = enabled;
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public AdminRole getRole() {
        return role;
    }

    public void setRole(AdminRole role) {
        this.role = role;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
