package com.hiikky.admin.controller;

import com.hiikky.admin.dto.AdminResponse;
import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.CsrfTokenResponse;
import com.hiikky.admin.dto.LoginRequest;
import com.hiikky.admin.dto.UpdateAdminProfileRequest;
import com.hiikky.admin.security.AdminPrincipal;
import com.hiikky.admin.security.AdminUserDetailsService;
import com.hiikky.admin.service.AdminAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;
    private final SecurityContextRepository securityContextRepository;
    private final AdminUserDetailsService adminUserDetailsService;

    public AdminAuthController(
            AdminAuthService adminAuthService,
            SecurityContextRepository securityContextRepository,
            AdminUserDetailsService adminUserDetailsService) {
        this.adminAuthService = adminAuthService;
        this.securityContextRepository = securityContextRepository;
        this.adminUserDetailsService = adminUserDetailsService;
    }

    @GetMapping("/auth/csrf")
    public ResponseEntity<ApiResponse<CsrfTokenResponse>> csrfToken(CsrfToken csrfToken) {
        CsrfTokenResponse token = new CsrfTokenResponse(
                csrfToken.getToken(), csrfToken.getHeaderName(), csrfToken.getParameterName());
        return ResponseEntity.ok(ApiResponse.success("CSRF token retrieved successfully", token));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<ApiResponse<AdminResponse>> login(@Valid @RequestBody LoginRequest loginRequest,
                                                            HttpServletRequest request,
                                                            HttpServletResponse response) {
        AdminResponse adminResponse = adminAuthService.login(loginRequest, request, response);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", adminResponse));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        String path = request.getContextPath().isEmpty() ? "/" : request.getContextPath() + "/";
        response.addHeader("Set-Cookie", "JSESSIONID=; Path=" + path
                + "; Max-Age=0; HttpOnly; SameSite=Lax" + (request.isSecure() ? "; Secure" : ""));
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<String>> me(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Current authenticated admin", userDetails.getUsername()));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<AdminResponse>> profile(@AuthenticationPrincipal AdminPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Admin profile retrieved successfully", adminAuthService.getProfile(principal.getId())));
    }

    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<AdminResponse>> updateProfile(
            @AuthenticationPrincipal AdminPrincipal principal,
            @Valid @RequestBody UpdateAdminProfileRequest updateRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        AdminResponse updated = adminAuthService.updateProfile(principal.getId(), updateRequest);
        AdminPrincipal updatedPrincipal = (AdminPrincipal) adminUserDetailsService.loadUserByUsername(updated.getEmail());
        var authentication = new UsernamePasswordAuthenticationToken(
                updatedPrincipal, null, updatedPrincipal.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        return ResponseEntity.ok(ApiResponse.success("Admin profile updated successfully", updated));
    }

    @GetMapping("/super-admin/dashboard")
    public ResponseEntity<ApiResponse<String>> superAdminDashboard() {
        return ResponseEntity.ok(ApiResponse.success("Super admin access granted", "Super admin dashboard content"));
    }
}
