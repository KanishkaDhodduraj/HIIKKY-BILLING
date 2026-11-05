package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.model.LegacyReportFilters;
import com.hiikky.admin.model.LegacyReportKind;
import com.hiikky.admin.model.SortDirection;
import com.hiikky.admin.service.AdminReportService;
import com.hiikky.admin.service.LegacyAdminReportService;
import com.hiikky.admin.util.CsvExportWriter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class LegacyAdminReportController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 200;

    private final LegacyAdminReportService reportService;

    public LegacyAdminReportController(LegacyAdminReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/{report:subscribers|subscriptions|billing|courses|course-installments}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> list(
            @PathVariable String report,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long organizationId,
            @RequestParam(required = false) Long subscriberId,
            @RequestParam(required = false) Long subscriptionId,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String paymentType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") SortDirection sortDirection) {
        LegacyReportKind kind = kind(report);
        LegacyReportFilters filters = filters(kind, organizationId, subscriberId, subscriptionId, courseId,
                status, paymentStatus, paymentType, search, fromDate, toDate, sortBy, sortDirection);
        validate(kind, page, size, filters);
        List<Map<String, Object>> rows = reportService.list(kind, filters, page, size);
        long count = reportService.count(kind, filters);
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(count))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success(report + " report retrieved successfully", rows));
    }

    @GetMapping(value = "/{report:subscribers|subscriptions|billing|courses|course-installments}.csv",
            produces = "text/csv")
    public ResponseEntity<StreamingResponseBody> export(
            @PathVariable String report,
            @RequestParam(required = false) Long organizationId,
            @RequestParam(required = false) Long subscriberId,
            @RequestParam(required = false) Long subscriptionId,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String paymentType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") SortDirection sortDirection,
            HttpServletResponse response) {
        LegacyReportKind kind = kind(report);
        LegacyReportFilters filters = filters(kind, organizationId, subscriberId, subscriptionId, courseId,
                status, paymentStatus, paymentType, search, fromDate, toDate, sortBy, sortDirection);
        validate(kind, 0, DEFAULT_PAGE_SIZE, filters);
        List<Map<String, Object>> rows = reportService.export(kind, filters);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + report + "-report.csv\"");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(output -> writeCsv(output, kind, rows));
    }

    private LegacyReportFilters filters(
            LegacyReportKind kind,
            Long organizationId,
            Long subscriberId,
            Long subscriptionId,
            Long courseId,
            String status,
            String paymentStatus,
            String paymentType,
            String search,
            LocalDate fromDate,
            LocalDate toDate,
            String sortBy,
            SortDirection sortDirection) {
        if (organizationId != null && kind != LegacyReportKind.SUBSCRIBERS
                && kind != LegacyReportKind.BILLING) {
            throw new IllegalArgumentException("organizationId is not supported for this report");
        }
        if (subscriberId != null && kind != LegacyReportKind.BILLING) {
            throw new IllegalArgumentException("subscriberId is only supported for the billing report");
        }
        if (subscriptionId != null && kind != LegacyReportKind.SUBSCRIBERS
                && kind != LegacyReportKind.BILLING) {
            throw new IllegalArgumentException("subscriptionId is not supported for this report");
        }
        if (courseId != null && kind != LegacyReportKind.COURSE_INSTALLMENTS) {
            throw new IllegalArgumentException("courseId is only supported for the installment report");
        }
        if (paymentStatus != null && kind != LegacyReportKind.BILLING) {
            throw new IllegalArgumentException("paymentStatus is only supported for the billing report");
        }
        if (paymentType != null && kind != LegacyReportKind.COURSES) {
            throw new IllegalArgumentException("paymentType is only supported for the course report");
        }
        if (status != null && kind != LegacyReportKind.SUBSCRIBERS
                && kind != LegacyReportKind.SUBSCRIPTIONS && kind != LegacyReportKind.COURSES) {
            throw new IllegalArgumentException("status is not supported for this report");
        }
        if ((fromDate != null || toDate != null) && kind == LegacyReportKind.SUBSCRIPTIONS) {
            throw new IllegalArgumentException("Date filtering is not supported for subscriptions");
        }
        return new LegacyReportFilters(
                organizationId, subscriberId, subscriptionId, courseId, status, paymentStatus, paymentType,
                search, fromDate, toDate, sortBy, sortDirection);
    }

    private void validate(LegacyReportKind kind, int page, int size, LegacyReportFilters filters) {
        if (page < 0) {
            throw new IllegalArgumentException("Page index must not be negative");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Page size must be between 1 and " + MAX_PAGE_SIZE);
        }
        if (page > Integer.MAX_VALUE / size) {
            throw new IllegalArgumentException("Page offset exceeds the supported range");
        }
        if (filters.search() != null && filters.search().length() > MAX_SEARCH_LENGTH) {
            throw new IllegalArgumentException("Search must not exceed " + MAX_SEARCH_LENGTH + " characters");
        }
        for (Long id : new Long[]{filters.organizationId(), filters.subscriberId(),
                filters.subscriptionId(), filters.courseId()}) {
            if (id != null && id <= 0) {
                throw new IllegalArgumentException("Filter IDs must be positive");
            }
        }
        if ((filters.fromDate() == null) != (filters.toDate() == null)) {
            throw new IllegalArgumentException("Both fromDate and toDate must be provided together");
        }
        if (filters.fromDate() != null && filters.fromDate().isAfter(filters.toDate())) {
            throw new IllegalArgumentException("fromDate must be on or before toDate");
        }
        if (LocalDate.MAX.equals(filters.toDate())) {
            throw new IllegalArgumentException("toDate is outside the supported range");
        }
        if (filters.status() != null && filters.status().length() > 20) {
            throw new IllegalArgumentException("status must not exceed 20 characters");
        }
        if (filters.paymentType() != null && filters.paymentType().length() > 20) {
            throw new IllegalArgumentException("paymentType must not exceed 20 characters");
        }
        if (filters.paymentStatus() != null
                && !Set.of("PAID", "UNPAID").contains(filters.paymentStatus())) {
            throw new IllegalArgumentException("paymentStatus must be PAID or UNPAID");
        }
        Set<String> sortFields = switch (kind) {
            case SUBSCRIBERS -> Set.of("id", "fullName", "email", "startDate", "endDate", "status");
            case SUBSCRIPTIONS -> Set.of("id", "planName", "price", "billingCycle", "maxUsers", "status");
            case BILLING -> Set.of("id", "organizationId", "subscriberId", "dueDate", "amount",
                    "paymentStatus", "paidDate", "createdAt");
            case COURSES -> Set.of("id", "courseCode", "courseName", "courseFee", "paymentType",
                    "status", "createdAt");
            case COURSE_INSTALLMENTS -> Set.of("id", "courseId", "courseName", "installmentNumber",
                    "installmentName", "amount", "dueDate");
        };
        if (!sortFields.contains(filters.sortBy())) {
            throw new IllegalArgumentException("Unsupported " + kind.name().toLowerCase() + " report sort field");
        }
    }

    private LegacyReportKind kind(String report) {
        return switch (report) {
            case "subscribers" -> LegacyReportKind.SUBSCRIBERS;
            case "subscriptions" -> LegacyReportKind.SUBSCRIPTIONS;
            case "billing" -> LegacyReportKind.BILLING;
            case "courses" -> LegacyReportKind.COURSES;
            case "course-installments" -> LegacyReportKind.COURSE_INSTALLMENTS;
            default -> throw new IllegalArgumentException("Unsupported report type");
        };
    }

    private void writeCsv(java.io.OutputStream output, LegacyReportKind kind, List<Map<String, Object>> rows)
            throws java.io.IOException {
        Writer writer = new OutputStreamWriter(output, StandardCharsets.UTF_8);
        List<String> headers = headers(kind);
        CsvExportWriter.writeRow(writer, headers);
        for (Map<String, Object> row : rows) {
            CsvExportWriter.writeRow(writer, headers.stream().map(row::get).toList());
        }
        writer.flush();
    }

    private List<String> headers(LegacyReportKind kind) {
        return switch (kind) {
            case SUBSCRIBERS -> List.of("id", "organizationId", "subscriptionId", "fullName",
                    "email", "phone", "startDate", "endDate", "status");
            case SUBSCRIPTIONS -> List.of("id", "planName", "description", "price",
                    "billingCycle", "maxUsers", "status");
            case BILLING -> List.of("id", "organizationId", "subscriberId", "subscriptionId",
                    "paymentName", "dueDate", "amount", "paymentStatus", "paidDate", "createdAt",
                    "originalAmount", "discountId", "discountAmount");
            case COURSES -> List.of("id", "courseCode", "courseName", "duration",
                    "durationUnit", "courseFee", "paymentType", "status", "description", "createdAt");
            case COURSE_INSTALLMENTS -> List.of("id", "courseId", "courseName", "installmentNumber",
                    "installmentName", "amount", "dueDays", "dueDate", "createdAt");
        };
    }
}
