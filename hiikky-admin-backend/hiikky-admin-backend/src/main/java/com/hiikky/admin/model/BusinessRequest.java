package com.hiikky.admin.model;

import java.time.LocalDateTime;

public record BusinessRequest(
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
        Long createdOrganizationId) {
}
