package com.hiikky.admin.service;

import com.hiikky.admin.dto.PublicRegistrationRateLimitResponse;
import com.hiikky.admin.model.PublicRegistrationRateLimitSetting;
import com.hiikky.admin.repository.AdminSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminSettingService {

    private final AdminSettingRepository settingRepository;

    public AdminSettingService(AdminSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public PublicRegistrationRateLimitResponse getPublicRegistrationRateLimit() {
        return settingRepository.findPublicRegistrationRateLimit()
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalStateException(
                        "Public registration rate limit setting is missing"));
    }

    @Transactional
    public PublicRegistrationRateLimitResponse updatePublicRegistrationRateLimit(
            int maxSubmissions, Long updatedByAdminId) {
        if (maxSubmissions < PublicRegistrationRateLimitSetting.MIN_MAX_SUBMISSIONS
                || maxSubmissions > PublicRegistrationRateLimitSetting.MAX_MAX_SUBMISSIONS) {
            throw new IllegalArgumentException("maxSubmissions must be between 1 and 100");
        }
        settingRepository.updatePublicRegistrationMaxSubmissions(maxSubmissions, updatedByAdminId);
        return getPublicRegistrationRateLimit();
    }

    private PublicRegistrationRateLimitResponse toResponse(PublicRegistrationRateLimitSetting setting) {
        return new PublicRegistrationRateLimitResponse(
                setting.maxSubmissions(),
                PublicRegistrationRateLimitSetting.WINDOW_MINUTES,
                PublicRegistrationRateLimitSetting.MIN_MAX_SUBMISSIONS,
                PublicRegistrationRateLimitSetting.MAX_MAX_SUBMISSIONS,
                PublicRegistrationRateLimitSetting.DEFAULT_MAX_SUBMISSIONS,
                setting.updatedAt(),
                setting.updatedByAdminId());
    }
}
