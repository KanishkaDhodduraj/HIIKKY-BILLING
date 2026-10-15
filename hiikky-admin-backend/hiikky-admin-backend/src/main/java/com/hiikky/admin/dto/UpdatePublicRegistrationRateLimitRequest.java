package com.hiikky.admin.dto;

import com.hiikky.admin.model.PublicRegistrationRateLimitSetting;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdatePublicRegistrationRateLimitRequest(
        @NotNull
        @Min(PublicRegistrationRateLimitSetting.MIN_MAX_SUBMISSIONS)
        @Max(PublicRegistrationRateLimitSetting.MAX_MAX_SUBMISSIONS)
        Integer maxSubmissions) {
}
