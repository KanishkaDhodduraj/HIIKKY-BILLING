package com.hiikky.admin.model;

import java.time.LocalDate;

public record BusinessRequestSearchCriteria(
        int page,
        int size,
        BusinessRequestStatus status,
        String search,
        LocalDate fromDate,
        LocalDate toDate,
        String sortBy,
        SortDirection sortDirection) {
}
