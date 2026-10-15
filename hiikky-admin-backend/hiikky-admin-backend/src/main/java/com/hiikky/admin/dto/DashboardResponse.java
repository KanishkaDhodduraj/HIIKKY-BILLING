package com.hiikky.admin.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record DashboardResponse(
        LocalDate fromDate,
        LocalDate toDate,
        PlatformSummary platformSummary,
        BusinessOwnerStatistics businessOwners,
        OrganizationStatistics organizations,
        List<PlatformActivity> recentActivity
) {
    public DashboardResponse {
        recentActivity = List.copyOf(recentActivity);
    }

    public record PlatformSummary(long businessOwnerCount, long organizationCount, long adminAccountCount) {
    }

    public record BusinessOwnerStatistics(long total, long active, long inactive, long registeredInRange) {
    }

    public record OrganizationStatistics(long total, long active, long inactive, long createdInRange) {
    }

    public record PlatformActivity(
            String entityType,
            long entityId,
            String displayName,
            String activityType,
            LocalDateTime occurredAt
    ) {
    }
}
