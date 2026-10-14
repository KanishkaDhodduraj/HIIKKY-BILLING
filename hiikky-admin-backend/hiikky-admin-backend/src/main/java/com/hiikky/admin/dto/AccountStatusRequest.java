package com.hiikky.admin.dto;

import jakarta.validation.constraints.NotNull;

public class AccountStatusRequest {

    @NotNull(message = "Enabled status is required")
    private Boolean enabled;

    public AccountStatusRequest() {
    }

    public AccountStatusRequest(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
}
