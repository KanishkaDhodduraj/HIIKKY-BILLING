package com.hiikky.admin.model;

import java.time.LocalDate;

public record LegacyReportFilters(
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
}
