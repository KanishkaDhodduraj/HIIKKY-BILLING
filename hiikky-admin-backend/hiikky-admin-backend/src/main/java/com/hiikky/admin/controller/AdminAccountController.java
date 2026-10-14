package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.AdminAccountResponse;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.service.AdminAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/accounts")
public class AdminAccountController {

    private final AdminAccountService adminAccountService;

    public AdminAccountController(AdminAccountService adminAccountService) {
        this.adminAccountService = adminAccountService;
    }

    /**
     * List admin accounts with optional pagination and filters.
     * Only SUPER_ADMIN may access.
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AdminAccountResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) AdminRole role) {
        // Enforce reasonable page size limit (e.g., 100) to prevent abuse.
        if (size < 1 || size > 100) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page size must be between 1 and 100"));
        }
        List<AdminAccountResponse> accounts = adminAccountService.listAdminAccounts(page, size, enabled, role);
        return ResponseEntity.ok(ApiResponse.success("Admin accounts retrieved", accounts));
    }
}
