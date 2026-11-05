package com.hiikky.admin.model;

import java.time.LocalDate;

public record BusinessOwnerReportCriteria(
        OwnerStatus status,
        Long organizationId,
        String search,
        LocalDate fromDate,
        LocalDate toDate,
        int page,
        int size,
        String sortBy,
        SortDirection sortDirection) {
}
