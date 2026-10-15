package com.hiikky.admin.dto;

import com.hiikky.admin.model.AnalyticsGrouping;

import java.time.LocalDate;
import java.util.List;

public record PlatformAnalyticsResponse(
        LocalDate fromDate,
        LocalDate toDate,
        AnalyticsGrouping groupBy,
        Summary summary,
        List<Period> periods
) {
    public PlatformAnalyticsResponse {
        periods = List.copyOf(periods);
    }

    public record Summary(
            long businessOwnerRegistrations,
            long organizationRegistrations,
            long adminAccountRegistrations,
            long businessOwnerUpdates,
            long organizationUpdates,
            long adminAccountUpdates
    ) {
    }

    public record Period(
            LocalDate periodStart,
            long businessOwnerRegistrations,
            long organizationRegistrations,
            long adminAccountRegistrations,
            long businessOwnerUpdates,
            long organizationUpdates,
            long adminAccountUpdates
    ) {
    }
}
