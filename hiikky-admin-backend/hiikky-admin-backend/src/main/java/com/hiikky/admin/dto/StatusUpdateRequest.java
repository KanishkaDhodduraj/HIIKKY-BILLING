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
        Boolean statusIsActive = null;
        if (status != null) {
            if (!"ACTIVE".equalsIgnoreCase(status) && !"INACTIVE".equalsIgnoreCase(status)) {
                throw new IllegalArgumentException("Status must be ACTIVE or INACTIVE");
            }
            statusIsActive = "ACTIVE".equalsIgnoreCase(status);
        }
        if (enabled != null && statusIsActive != null && !enabled.equals(statusIsActive)) {
            throw new IllegalArgumentException("Status and enabled values must agree");
        }
        if (enabled != null) {
            return enabled;
        }
        if (statusIsActive != null) {
            return statusIsActive;
        }
        throw new IllegalArgumentException("Either status or enabled is required");
    }
}
