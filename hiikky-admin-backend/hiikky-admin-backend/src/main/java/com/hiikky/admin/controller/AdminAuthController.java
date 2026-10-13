package com.hiikky.admin.controller;

import com.hiikky.admin.dto.AdminResponse;
import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.LoginRequest;
import com.hiikky.admin.service.AdminAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<ApiResponse<AdminResponse>> login(@Valid @RequestBody LoginRequest loginRequest,
                                                            HttpServletRequest request) {
        AdminResponse response = adminAuthService.login(loginRequest, request);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<String>> me(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Current authenticated admin", userDetails.getUsername()));
    }

    @GetMapping("/super-admin/dashboard")
    public ResponseEntity<ApiResponse<String>> superAdminDashboard() {
        return ResponseEntity.ok(ApiResponse.success("Super admin access granted", "Super admin dashboard content"));
    }
}
