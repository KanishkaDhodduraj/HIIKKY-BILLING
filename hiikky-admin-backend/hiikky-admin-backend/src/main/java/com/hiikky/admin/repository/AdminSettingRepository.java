package com.hiikky.admin.repository;

import com.hiikky.admin.model.PublicRegistrationRateLimitSetting;

import java.util.Optional;

public interface AdminSettingRepository {

    Optional<PublicRegistrationRateLimitSetting> findPublicRegistrationRateLimit();

    default int getPublicRegistrationMaxSubmissions() {
        return findPublicRegistrationRateLimit()
                .orElseThrow(() -> new IllegalStateException(
                        "Public registration rate limit setting is missing"))
                .maxSubmissions();
    }

    void updatePublicRegistrationMaxSubmissions(int maxSubmissions, Long updatedByAdminId);
}
