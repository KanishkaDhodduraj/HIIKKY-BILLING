package com.hiikky.admin.dto;

import com.hiikky.admin.model.BusinessRequestStatus;

import java.time.LocalDateTime;

public record BusinessRequestSubmissionResponse(
        Long id,
        BusinessRequestStatus status,
        LocalDateTime submittedAt) {
}
