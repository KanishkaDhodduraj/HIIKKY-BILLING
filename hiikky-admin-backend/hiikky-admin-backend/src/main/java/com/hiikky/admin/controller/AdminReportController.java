package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.BusinessOwnerReportRow;
import com.hiikky.admin.dto.OrganizationReportRow;
import com.hiikky.admin.model.BusinessOwnerReportCriteria;
import com.hiikky.admin.model.OrganizationReportCriteria;
import com.hiikky.admin.model.OrganizationStatus;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.model.SortDirection;
import com.hiikky.admin.service.AdminReportService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminReportController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 200;
    private static final Set<String> OWNER_SORT_FIELDS =
            Set.of("id", "firstName", "lastName", "email", "status", "organizationCount", "createdAt", "updatedAt");
    private static final Set<String> ORGANIZATION_SORT_FIELDS =
            Set.of("id", "name", "status", "createdAt", "updatedAt");

    private final AdminReportService reportService;

    public AdminReportController(AdminReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/business-owners")
    public ResponseEntity<ApiResponse<List<BusinessOwnerReportRow>>> businessOwners(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) OwnerStatus status,
            @RequestParam(required = false) Long organizationId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") SortDirection sortDirection) {
        validate(page, size, search, fromDate, toDate);
        if (organizationId != null && organizationId <= 0) {
            throw new IllegalArgumentException("organizationId must be positive");
        }
        if (!OWNER_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported Business Owner report sort field");
        }

        BusinessOwnerReportCriteria criteria = new BusinessOwnerReportCriteria(
                status, organizationId, search, fromDate, toDate, page, size, sortBy, sortDirection);
        List<BusinessOwnerReportRow> rows = reportService.listBusinessOwners(criteria);
        return paginated(rows, reportService.countBusinessOwners(criteria), page, size,
                "Business Owner report retrieved successfully");
    }

    @GetMapping("/organizations")
    public ResponseEntity<ApiResponse<List<OrganizationReportRow>>> organizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) OrganizationStatus status,
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") SortDirection sortDirection) {
        validate(page, size, search, fromDate, toDate);
        if (ownerId != null && ownerId <= 0) {
            throw new IllegalArgumentException("ownerId must be positive");
        }
        if (!ORGANIZATION_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported Organization report sort field");
        }

        OrganizationReportCriteria criteria = new OrganizationReportCriteria(
                status, ownerId, search, fromDate, toDate, page, size, sortBy, sortDirection);
        List<OrganizationReportRow> rows = reportService.listOrganizations(criteria);
        return paginated(rows, reportService.countOrganizations(criteria), page, size,
                "Organization report retrieved successfully");
    }

    @GetMapping(value = "/business-owners.csv", produces = "text/csv")
    public ResponseEntity<StreamingResponseBody> exportBusinessOwners(
            @RequestParam(required = false) OwnerStatus status,
            @RequestParam(required = false) Long organizationId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") SortDirection sortDirection,
            HttpServletResponse response) {
        validate(0, DEFAULT_PAGE_SIZE, search, fromDate, toDate);
        if (organizationId != null && organizationId <= 0) {
            throw new IllegalArgumentException("organizationId must be positive");
        }
        if (!OWNER_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported Business Owner report sort field");
        }
        BusinessOwnerReportCriteria criteria = new BusinessOwnerReportCriteria(
                status, organizationId, search, fromDate, toDate, 0,
                AdminReportService.MAX_EXPORT_ROWS, sortBy, sortDirection);
        List<BusinessOwnerReportRow> rows = reportService.exportBusinessOwners(criteria);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"business-owners-report.csv\"");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(output -> writeBusinessOwnerCsv(output, rows));
    }

    @GetMapping(value = "/organizations.csv", produces = "text/csv")
    public ResponseEntity<StreamingResponseBody> exportOrganizations(
            @RequestParam(required = false) OrganizationStatus status,
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") SortDirection sortDirection,
            HttpServletResponse response) {
        validate(0, DEFAULT_PAGE_SIZE, search, fromDate, toDate);
        if (ownerId != null && ownerId <= 0) {
            throw new IllegalArgumentException("ownerId must be positive");
        }
        if (!ORGANIZATION_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported Organization report sort field");
        }
        OrganizationReportCriteria criteria = new OrganizationReportCriteria(
                status, ownerId, search, fromDate, toDate, 0,
                AdminReportService.MAX_EXPORT_ROWS, sortBy, sortDirection);
        List<OrganizationReportRow> rows = reportService.exportOrganizations(criteria);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"organizations-report.csv\"");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(output -> writeOrganizationCsv(output, rows));
    }

    private void validate(int page, int size, String search, LocalDate fromDate, LocalDate toDate) {
        if (page < 0) {
            throw new IllegalArgumentException("Page index must not be negative");
        }
        if (size < 1 || (size > MAX_PAGE_SIZE && size != AdminReportService.MAX_EXPORT_ROWS)) {
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

    private <T> ResponseEntity<ApiResponse<List<T>>> paginated(
            List<T> rows, long count, int page, int size, String message) {
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(count))
                .header("X-Page-Number", String.valueOf(page))
                .header("X-Page-Size", String.valueOf(size))
                .body(ApiResponse.success(message, rows));
    }

    private void writeBusinessOwnerCsv(java.io.OutputStream output, List<BusinessOwnerReportRow> rows)
            throws IOException {
        Writer writer = new OutputStreamWriter(output, StandardCharsets.UTF_8);
        writeRow(writer, List.of("id", "firstName", "lastName", "email", "phone", "status",
                "organizationCount", "createdAt", "updatedAt"));
        for (BusinessOwnerReportRow row : rows) {
            writeRow(writer, List.of(
                    value(row.id()), value(row.firstName()), value(row.lastName()), value(row.email()),
                    value(row.phone()), value(row.status()), value(row.organizationCount()),
                    value(row.createdAt()), value(row.updatedAt())));
        }
        writer.flush();
    }

    private void writeOrganizationCsv(java.io.OutputStream output, List<OrganizationReportRow> rows)
            throws IOException {
        Writer writer = new OutputStreamWriter(output, StandardCharsets.UTF_8);
        writeRow(writer, List.of("id", "name", "ownerId", "ownerName", "ownerEmail", "email",
                "phone", "address", "status", "createdAt", "updatedAt"));
        for (OrganizationReportRow row : rows) {
            writeRow(writer, List.of(
                    value(row.id()), value(row.name()), value(row.ownerId()), value(row.ownerName()),
                    value(row.ownerEmail()), value(row.email()), value(row.phone()), value(row.address()),
                    value(row.status()), value(row.createdAt()), value(row.updatedAt())));
        }
        writer.flush();
    }

    private void writeRow(Writer writer, List<String> values) throws IOException {
        for (int index = 0; index < values.size(); index++) {
            if (index > 0) {
                writer.write(',');
            }
            writer.write('"');
            writer.write(escapeCsvCell(values.get(index)));
            writer.write('"');
        }
        writer.write("\r\n");
    }

    private String escapeCsvCell(String value) {
        int firstContentCharacter = 0;
        while (firstContentCharacter < value.length()
                && (Character.isWhitespace(value.charAt(firstContentCharacter))
                || Character.isISOControl(value.charAt(firstContentCharacter)))) {
            firstContentCharacter++;
        }
        if (firstContentCharacter < value.length()
                && "=+-@".indexOf(value.charAt(firstContentCharacter)) >= 0) {
            value = "'" + value;
        }
        return value.replace("\"", "\"\"");
    }

    private String value(Object value) {
        return value == null ? "" : value.toString();
    }
}
