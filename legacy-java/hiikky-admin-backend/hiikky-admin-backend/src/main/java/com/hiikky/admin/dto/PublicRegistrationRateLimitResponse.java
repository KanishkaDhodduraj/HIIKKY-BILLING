package com.hiikky.admin.dto;

import java.time.LocalDateTime;

public record PublicRegistrationRateLimitResponse(
        int maxSubmissions,
        int windowMinutes,
        int minimumAllowed,
        int maximumAllowed,
        int defaultValue,
        LocalDateTime updatedAt,
        Long updatedByAdminId) {
}
