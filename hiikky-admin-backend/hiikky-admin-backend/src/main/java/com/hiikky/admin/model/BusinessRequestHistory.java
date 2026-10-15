package com.hiikky.admin.model;

import java.time.LocalDateTime;

public record BusinessRequestHistory(
        Long id,
        String eventType,
        Long actorAdminId,
        String reason,
        Long createdOwnerId,
        Long createdOrganizationId,
        LocalDateTime createdAt) {
}
