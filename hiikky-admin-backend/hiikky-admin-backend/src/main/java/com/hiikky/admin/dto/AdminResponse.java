package com.hiikky.admin.dto;

import com.hiikky.admin.model.AdminRole;

public class AdminResponse {

    private Long id;
    private String email;
    private AdminRole role;
    private boolean enabled;

    public AdminResponse() {
    }

    public AdminResponse(Long id, String email, AdminRole role, boolean enabled) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.enabled = enabled;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
