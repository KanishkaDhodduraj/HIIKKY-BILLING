package com.hiikky.admin.dto;

import com.hiikky.admin.model.OwnerStatus;

import java.time.LocalDateTime;

public record BusinessOwnerReportRow(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        OwnerStatus status,
        long organizationCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
