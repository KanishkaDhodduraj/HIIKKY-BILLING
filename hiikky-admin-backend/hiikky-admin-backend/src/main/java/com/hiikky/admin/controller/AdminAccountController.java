package com.hiikky.admin.controller;

import com.hiikky.admin.dto.AccountStatusRequest;
import com.hiikky.admin.dto.AdminAccountResponse;
import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.CreateAdminAccountRequest;
import com.hiikky.admin.dto.UpdateAdminAccountRequest;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.service.AdminAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/accounts")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAccountController {

    private final AdminAccountService adminAccountService;

    public AdminAccountController(AdminAccountService adminAccountService) {
        this.adminAccountService = adminAccountService;
    }

    /**
     * List admin accounts with optional search, filters, and pagination.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminAccountResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) AdminRole role,
            @RequestParam(required = false) String search) {
        if (page < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page index must not be negative"));
        }
        if (size < 1 || size > 100) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page size must be between 1 and 100"));
        }
        List<AdminAccountResponse> accounts = adminAccountService.listAdminAccounts(page, size, enabled, role, search);
        long totalCount = adminAccountService.countAdminAccounts(enabled, role, search);

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(totalCount))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success("Admin accounts retrieved", accounts));
    }

    /**
     * View account details by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminAccountResponse>> getById(@PathVariable Long id) {
        AdminAccountResponse account = adminAccountService.getAccountById(id);
        return ResponseEntity.ok(ApiResponse.success("Admin account retrieved", account));
    }

    /**
     * Create a new admin account.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<AdminAccountResponse>> create(
            @Valid @RequestBody CreateAdminAccountRequest request) {
        AdminAccountResponse created = adminAccountService.createAdminAccount(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Admin account created", created));
    }

    /**
     * Update account details.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminAccountResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminAccountRequest request) {
        AdminAccountResponse updated = adminAccountService.updateAdminAccount(id, request);
        return ResponseEntity.ok(ApiResponse.success("Admin account updated", updated));
    }

    /**
     * Update account status (activate/deactivate).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminAccountResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody AccountStatusRequest request) {
        AdminAccountResponse updated = adminAccountService.setAccountStatus(id, request.getEnabled());
        return ResponseEntity.ok(ApiResponse.success("Admin account status updated", updated));
    }

    /**
     * Activate account.
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<AdminAccountResponse>> activate(@PathVariable Long id) {
        AdminAccountResponse updated = adminAccountService.setAccountStatus(id, true);
        return ResponseEntity.ok(ApiResponse.success("Admin account activated", updated));
    }

    /**
     * Deactivate account.
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<AdminAccountResponse>> deactivate(@PathVariable Long id) {
        AdminAccountResponse updated = adminAccountService.setAccountStatus(id, false);
        return ResponseEntity.ok(ApiResponse.success("Admin account deactivated", updated));
    }

    /**
     * Delete account (if required).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        adminAccountService.deleteAdminAccount(id);
        return ResponseEntity.ok(ApiResponse.success("Admin account deleted", null));
    }
}
