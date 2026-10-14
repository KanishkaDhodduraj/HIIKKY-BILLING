package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateBusinessOwnerRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.StatusUpdateRequest;
import com.hiikky.admin.dto.UpdateBusinessOwnerRequest;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.service.BusinessOwnerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/business-owners")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class BusinessOwnerController {

    private final BusinessOwnerService businessOwnerService;

    public BusinessOwnerController(BusinessOwnerService businessOwnerService) {
        this.businessOwnerService = businessOwnerService;
    }

    /**
     * List business owners with optional search, filters, and pagination.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BusinessOwnerResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) OwnerStatus status,
            @RequestParam(required = false) String search) {
        if (page < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page index must not be negative"));
        }
        if (size < 1 || size > 100) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page size must be between 1 and 100"));
        }

        List<BusinessOwnerResponse> owners = businessOwnerService.listOwners(page, size, status, search);
        long totalCount = businessOwnerService.countOwners(status, search);

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(totalCount))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success("Business owners retrieved successfully", owners));
    }

    /**
     * View individual business owner details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> getById(@PathVariable Long id) {
        BusinessOwnerResponse owner = businessOwnerService.getOwnerById(id);
        return ResponseEntity.ok(ApiResponse.success("Business owner retrieved successfully", owner));
    }

    /**
     * Create a new business owner.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> create(
            @Valid @RequestBody CreateBusinessOwnerRequest request) {
        BusinessOwnerResponse created = businessOwnerService.createOwner(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Business owner created successfully", created));
    }

    /**
     * Update an existing business owner.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBusinessOwnerRequest request) {
        BusinessOwnerResponse updated = businessOwnerService.updateOwner(id, request);
        return ResponseEntity.ok(ApiResponse.success("Business owner updated successfully", updated));
    }

    /**
     * Activate a business owner.
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> activate(@PathVariable Long id) {
        BusinessOwnerResponse updated = businessOwnerService.setOwnerStatus(id, OwnerStatus.ACTIVE);
        return ResponseEntity.ok(ApiResponse.success("Business owner activated successfully", updated));
    }

    /**
     * Deactivate a business owner.
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> deactivate(@PathVariable Long id) {
        BusinessOwnerResponse updated = businessOwnerService.setOwnerStatus(id, OwnerStatus.INACTIVE);
        return ResponseEntity.ok(ApiResponse.success("Business owner deactivated successfully", updated));
    }

    /**
     * Update business owner status (ACTIVE / INACTIVE).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request) {
        OwnerStatus newStatus = request.isActive() ? OwnerStatus.ACTIVE : OwnerStatus.INACTIVE;
        BusinessOwnerResponse updated = businessOwnerService.setOwnerStatus(id, newStatus);
        return ResponseEntity.ok(ApiResponse.success("Business owner status updated successfully", updated));
    }

    /**
     * View organizations owned by a business owner.
     */
    @GetMapping("/{id}/organizations")
    public ResponseEntity<ApiResponse<List<OrganizationResponse>>> getOrganizations(@PathVariable Long id) {
        List<OrganizationResponse> orgs = businessOwnerService.getOrganizationsByOwner(id);
        return ResponseEntity.ok(ApiResponse.success("Owner organizations retrieved successfully", orgs));
    }

    /**
     * Delete a business owner.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        businessOwnerService.deleteOwner(id);
        return ResponseEntity.ok(ApiResponse.success("Business owner deleted successfully", null));
    }
}
