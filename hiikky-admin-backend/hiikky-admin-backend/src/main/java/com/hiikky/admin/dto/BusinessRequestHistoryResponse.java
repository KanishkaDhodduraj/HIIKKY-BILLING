package com.hiikky.admin.dto;

import java.time.LocalDateTime;

public record BusinessRequestHistoryResponse(
        Long id,
        String eventType,
        Long actorAdminId,
        String reason,
        Long createdOwnerId,
        Long createdOrganizationId,
        LocalDateTime createdAt) {
}
