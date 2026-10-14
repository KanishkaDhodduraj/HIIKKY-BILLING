package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateOrganizationRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.StatusUpdateRequest;
import com.hiikky.admin.dto.UpdateOrganizationRequest;
import com.hiikky.admin.model.OrganizationStatus;
import com.hiikky.admin.service.OrganizationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/organizations")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    /**
     * List organizations with optional search, filters, and pagination.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrganizationResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) OrganizationStatus status,
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) String search) {
        if (page < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page index must not be negative"));
        }
        if (size < 1 || size > 100) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page size must be between 1 and 100"));
        }

        List<OrganizationResponse> organizations = organizationService.listOrganizations(page, size, status, ownerId, search);
        long totalCount = organizationService.countOrganizations(status, ownerId, search);

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(totalCount))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success("Organizations retrieved successfully", organizations));
    }

    /**
     * View individual organization details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> getById(@PathVariable Long id) {
        OrganizationResponse organization = organizationService.getOrganizationById(id);
        return ResponseEntity.ok(ApiResponse.success("Organization retrieved successfully", organization));
    }

    /**
     * Create a new organization.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<OrganizationResponse>> create(
            @Valid @RequestBody CreateOrganizationRequest request) {
        OrganizationResponse created = organizationService.createOrganization(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Organization created successfully", created));
    }

    /**
     * Update an existing organization.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrganizationRequest request) {
        OrganizationResponse updated = organizationService.updateOrganization(id, request);
        return ResponseEntity.ok(ApiResponse.success("Organization updated successfully", updated));
    }

    /**
     * Activate an organization.
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<OrganizationResponse>> activate(@PathVariable Long id) {
        OrganizationResponse updated = organizationService.setOrganizationStatus(id, OrganizationStatus.ACTIVE);
        return ResponseEntity.ok(ApiResponse.success("Organization activated successfully", updated));
    }

    /**
     * Deactivate an organization.
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<OrganizationResponse>> deactivate(@PathVariable Long id) {
        OrganizationResponse updated = organizationService.setOrganizationStatus(id, OrganizationStatus.INACTIVE);
        return ResponseEntity.ok(ApiResponse.success("Organization deactivated successfully", updated));
    }

    /**
     * Update organization status (ACTIVE / INACTIVE).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrganizationResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request) {
        OrganizationStatus newStatus = request.isActive() ? OrganizationStatus.ACTIVE : OrganizationStatus.INACTIVE;
        OrganizationResponse updated = organizationService.setOrganizationStatus(id, newStatus);
        return ResponseEntity.ok(ApiResponse.success("Organization status updated successfully", updated));
    }

    /**
     * Assign or reassign owner to organization.
     */
    @PutMapping("/{id}/owner/{ownerId}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> assignOwner(
            @PathVariable Long id,
            @PathVariable Long ownerId) {
        OrganizationResponse updated = organizationService.assignOwner(id, ownerId);
        return ResponseEntity.ok(ApiResponse.success("Owner assigned to organization successfully", updated));
    }

    /**
     * Remove owner relationship from organization.
     */
    @DeleteMapping("/{id}/owner")
    public ResponseEntity<ApiResponse<OrganizationResponse>> removeOwner(@PathVariable Long id) {
        OrganizationResponse updated = organizationService.removeOwner(id);
        return ResponseEntity.ok(ApiResponse.success("Owner removed from organization successfully", updated));
    }

    /**
     * View owner of an organization.
     */
    @GetMapping("/{id}/owner")
    public ResponseEntity<ApiResponse<BusinessOwnerResponse>> getOwner(@PathVariable Long id) {
        BusinessOwnerResponse owner = organizationService.getOwnerOfOrganization(id);
        return ResponseEntity.ok(ApiResponse.success("Organization owner retrieved successfully", owner));
    }

    /**
     * Delete an organization.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        organizationService.deleteOrganization(id);
        return ResponseEntity.ok(ApiResponse.success("Organization deleted successfully", null));
    }
}
