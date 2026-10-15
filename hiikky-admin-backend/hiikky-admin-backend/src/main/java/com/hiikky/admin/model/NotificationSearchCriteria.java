package com.hiikky.admin.model;

import java.time.LocalDate;

public record NotificationSearchCriteria(
        int page,
        int size,
        String notificationType,
        String recipientType,
        String status,
        String search,
        LocalDate fromDate,
        LocalDate toDate,
        String sortBy,
        SortDirection sortDirection) {

    public int offset() {
        return page * size;
    }
}
