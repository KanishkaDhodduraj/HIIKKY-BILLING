package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.BusinessRequestDetailResponse;
import com.hiikky.admin.dto.BusinessRequestRejection;
import com.hiikky.admin.dto.BusinessRequestSummaryResponse;
import com.hiikky.admin.model.BusinessRequestSearchCriteria;
import com.hiikky.admin.model.BusinessRequestStatus;
import com.hiikky.admin.model.SortDirection;
import com.hiikky.admin.security.AdminPrincipal;
import com.hiikky.admin.service.BusinessRequestService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/business-requests")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class BusinessRequestController {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 200;
    private static final Set<String> SORT_FIELDS = Set.of("id", "createdAt", "status");

    private final BusinessRequestService requestService;

    public BusinessRequestController(BusinessRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BusinessRequestSummaryResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) BusinessRequestStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") SortDirection sortDirection) {
        validate(page, size, search, fromDate, toDate);
        if (!SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported Business Request sort field");
        }
        BusinessRequestSearchCriteria criteria = new BusinessRequestSearchCriteria(
                page, size, status, search, fromDate, toDate, sortBy, sortDirection);
        List<BusinessRequestSummaryResponse> rows = requestService.list(criteria);
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(requestService.count(criteria)))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success("Business Requests retrieved successfully", rows));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BusinessRequestDetailResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Business Request retrieved successfully", requestService.getById(id)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<BusinessRequestDetailResponse>> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Business Request approved successfully", requestService.approve(id, principal.getId())));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<BusinessRequestDetailResponse>> reject(
            @PathVariable Long id,
            @Valid @RequestBody BusinessRequestRejection rejection,
            @AuthenticationPrincipal AdminPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Business Request rejected successfully",
                requestService.reject(id, principal.getId(), rejection)));
    }

    private void validate(int page, int size, String search, LocalDate fromDate, LocalDate toDate) {
        if (page < 0) {
            throw new IllegalArgumentException("Page index must not be negative");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size must be between 1 and " + MAX_PAGE_SIZE);
        }
        if (page > Integer.MAX_VALUE / size) {
            throw new IllegalArgumentException("Page offset exceeds the supported range");
        }
        if (search != null && search.length() > MAX_SEARCH_LENGTH) {
            throw new IllegalArgumentException("Search must not exceed " + MAX_SEARCH_LENGTH + " characters");
        }
        if ((fromDate == null) != (toDate == null)) {
            throw new IllegalArgumentException("Both fromDate and toDate must be provided together");
        }
        if (fromDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("fromDate must be on or before toDate");
        }
        if (LocalDate.MAX.equals(toDate)) {
            throw new IllegalArgumentException("toDate is outside the supported range");
        }
    }
}
