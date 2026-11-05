package com.hiikky.admin.controller;

import com.hiikky.admin.dto.AdminResponse;
import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.FirstSuperAdminSetupRequest;
import com.hiikky.admin.service.AdminBootstrapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/setup")
public class AdminBootstrapController {

    private final AdminBootstrapService bootstrapService;

    public AdminBootstrapController(AdminBootstrapService bootstrapService) {
        this.bootstrapService = bootstrapService;
    }

    @PostMapping("/first-super-admin")
    public ResponseEntity<ApiResponse<AdminResponse>> initialize(
            @RequestHeader("X-Admin-Bootstrap-Secret") String setupSecret,
            @Valid @RequestBody FirstSuperAdminSetupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "First Super Admin account created; sign in to continue",
                        bootstrapService.initialize(request, setupSecret)));
    }
}
