package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.PlatformAnalyticsResponse;
import com.hiikky.admin.model.AnalyticsGrouping;
import com.hiikky.admin.service.PlatformAnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class PlatformAnalyticsController {

    private final PlatformAnalyticsService analyticsService;

    public PlatformAnalyticsController(PlatformAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/registrations")
    public ResponseEntity<ApiResponse<PlatformAnalyticsResponse>> getRegistrationAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "DAY") AnalyticsGrouping groupBy) {
        if ((fromDate == null) != (toDate == null)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Both fromDate and toDate must be provided together"));
        }
        if (fromDate != null && fromDate.isAfter(toDate)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("fromDate must be on or before toDate"));
        }
        return ResponseEntity.ok(ApiResponse.success(
                "Platform registration analytics retrieved successfully",
                analyticsService.getRegistrationAnalytics(fromDate, toDate, groupBy)));
    }
}
