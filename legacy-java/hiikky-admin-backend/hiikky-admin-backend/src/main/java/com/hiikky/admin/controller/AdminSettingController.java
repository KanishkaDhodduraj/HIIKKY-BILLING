package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.PublicRegistrationRateLimitResponse;
import com.hiikky.admin.dto.UpdatePublicRegistrationRateLimitRequest;
import com.hiikky.admin.security.AdminPrincipal;
import com.hiikky.admin.service.AdminSettingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminSettingController {

    private final AdminSettingService settingService;

    public AdminSettingController(AdminSettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping("/public-registration-rate-limit")
    public ResponseEntity<ApiResponse<PublicRegistrationRateLimitResponse>> getPublicRegistrationRateLimit() {
        return ResponseEntity.ok(ApiResponse.success(
                "Public registration rate limit retrieved successfully",
                settingService.getPublicRegistrationRateLimit()));
    }

    @PutMapping("/public-registration-rate-limit")
    public ResponseEntity<ApiResponse<PublicRegistrationRateLimitResponse>> updatePublicRegistrationRateLimit(
            @Valid @RequestBody UpdatePublicRegistrationRateLimitRequest request,
            @AuthenticationPrincipal AdminPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Public registration rate limit updated successfully",
                settingService.updatePublicRegistrationRateLimit(
                        request.maxSubmissions(), principal.getId())));
    }
}
