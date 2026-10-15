package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.NotificationDetailResponse;
import com.hiikky.admin.dto.NotificationSummaryResponse;
import com.hiikky.admin.model.NotificationSearchCriteria;
import com.hiikky.admin.model.SortDirection;
import com.hiikky.admin.service.NotificationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class NotificationController {

    private static final Set<String> NOTIFICATION_TYPES = Set.of("ANNOUNCEMENT", "SYSTEM_ALERT");
    private static final Set<String> RECIPIENT_TYPES =
            Set.of("ALL_ACTIVE_USERS", "BACKEND_ONLY", "UNPAID_SEGMENT");
    private static final Set<String> STATUSES = Set.of("DISPATCHED");
    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "id");

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationSummaryResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String notificationType,
            @RequestParam(required = false) String recipientType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") SortDirection sortDirection) {
        if (page < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page index must not be negative"));
        }
        if (size < 1 || size > 100) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page size must be between 1 and 100"));
        }
        if (page > Integer.MAX_VALUE / size) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Page offset exceeds the supported range"));
        }
        if ((fromDate == null) != (toDate == null)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Both fromDate and toDate must be provided together"));
        }
        if (fromDate != null && fromDate.isAfter(toDate)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("fromDate must be on or before toDate"));
        }
        if (LocalDate.MAX.equals(toDate)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("toDate is outside the supported range"));
        }
        if (notificationType != null && !NOTIFICATION_TYPES.contains(notificationType)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported notificationType"));
        }
        if (recipientType != null && !RECIPIENT_TYPES.contains(recipientType)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported recipientType"));
        }
        if (status != null && !STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported notification status"));
        }
        if (!SORT_FIELDS.contains(sortBy)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported notification sort field"));
        }

        NotificationSearchCriteria criteria = new NotificationSearchCriteria(
                page, size, notificationType, recipientType, status, search,
                fromDate, toDate, sortBy, sortDirection);
        List<NotificationSummaryResponse> notifications = notificationService.list(criteria);
        long totalCount = notificationService.count(criteria);
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(totalCount))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success("Notification dispatches retrieved successfully", notifications));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationDetailResponse>> getById(@PathVariable Long id) {
        NotificationDetailResponse notification = notificationService.getById(id);
        return ResponseEntity.ok(ApiResponse.success("Notification dispatch retrieved successfully", notification));
    }
}
