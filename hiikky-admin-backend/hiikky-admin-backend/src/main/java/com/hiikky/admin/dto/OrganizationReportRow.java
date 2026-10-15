package com.hiikky.admin.dto;

import com.hiikky.admin.model.OrganizationStatus;

import java.time.LocalDateTime;

public record OrganizationReportRow(
        Long id,
        String name,
        Long ownerId,
        String ownerName,
        String ownerEmail,
        String email,
        String phone,
        String address,
        OrganizationStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
