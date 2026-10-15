package com.hiikky.admin.model;

import java.time.LocalDate;

public record OrganizationReportCriteria(
        OrganizationStatus status,
        Long ownerId,
        String search,
        LocalDate fromDate,
        LocalDate toDate,
        int page,
        int size,
        String sortBy,
        SortDirection sortDirection) {
}
