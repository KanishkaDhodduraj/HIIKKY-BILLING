package com.hiikky.admin.dto;

import com.hiikky.admin.model.BusinessRequestStatus;

import java.time.LocalDateTime;

public record BusinessRequestSummaryResponse(
        Long id,
        String firstName,
        String lastName,
        String ownerEmail,
        String organizationName,
        String organizationEmail,
        BusinessRequestStatus status,
        LocalDateTime createdAt,
        LocalDateTime decidedAt) {
}
