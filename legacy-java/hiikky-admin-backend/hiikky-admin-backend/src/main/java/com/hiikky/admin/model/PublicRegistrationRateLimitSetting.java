package com.hiikky.admin.model;

import java.time.LocalDateTime;

public record PublicRegistrationRateLimitSetting(
        int maxSubmissions,
        LocalDateTime updatedAt,
        Long updatedByAdminId) {

    public static final int DEFAULT_MAX_SUBMISSIONS = 10;
    public static final int MIN_MAX_SUBMISSIONS = 1;
    public static final int MAX_MAX_SUBMISSIONS = 100;
    public static final int WINDOW_MINUTES = 15;

    public PublicRegistrationRateLimitSetting {
        if (maxSubmissions < MIN_MAX_SUBMISSIONS || maxSubmissions > MAX_MAX_SUBMISSIONS) {
            throw new IllegalStateException("Stored public registration rate limit is outside its allowed range");
        }
    }
}
