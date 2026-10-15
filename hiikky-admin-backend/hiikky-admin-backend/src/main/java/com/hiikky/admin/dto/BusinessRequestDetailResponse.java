package com.hiikky.admin.dto;

import com.hiikky.admin.model.BusinessRequestStatus;

import java.time.LocalDateTime;
import java.util.List;

public record BusinessRequestDetailResponse(
        Long id,
        String firstName,
        String lastName,
        String ownerEmail,
        String ownerPhone,
        String organizationName,
        String organizationEmail,
        String organizationPhone,
        String organizationAddress,
        BusinessRequestStatus status,
        String decisionReason,
        Long decidedByAdminId,
        LocalDateTime createdAt,
        LocalDateTime decidedAt,
        Long createdOwnerId,
        Long createdOrganizationId,
        List<BusinessRequestHistoryResponse> history) {
}
