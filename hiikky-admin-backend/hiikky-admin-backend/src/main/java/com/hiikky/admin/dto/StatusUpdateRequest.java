package com.hiikky.admin.dto;

public class StatusUpdateRequest {

    private String status;
    private Boolean enabled;

    public StatusUpdateRequest() {
    }

    public StatusUpdateRequest(String status) {
        this.status = status;
    }

    public StatusUpdateRequest(Boolean enabled) {
        this.enabled = enabled;
        this.status = (enabled != null && enabled) ? "ACTIVE" : "INACTIVE";
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isActive() {
        if (enabled != null) {
            return enabled;
        }
        return "ACTIVE".equalsIgnoreCase(status);
    }
}
