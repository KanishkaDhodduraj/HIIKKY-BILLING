package com.hiikky.admin.dto;

import com.hiikky.admin.model.NotificationDispatch;

import java.time.LocalDateTime;

public class NotificationSummaryResponse {

    private Long id;
    private String notificationType;
    private String recipientType;
    private String subject;
    private String status;
    private LocalDateTime createdAt;

    public NotificationSummaryResponse() {
    }

    public NotificationSummaryResponse(Long id, String notificationType, String recipientType,
                                       String subject, String status, LocalDateTime createdAt) {
        this.id = id;
        this.notificationType = notificationType;
        this.recipientType = recipientType;
        this.subject = subject;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static NotificationSummaryResponse from(NotificationDispatch dispatch) {
        return new NotificationSummaryResponse(
                dispatch.getId(),
                dispatch.getNotificationType(),
                dispatch.getRecipientType(),
                dispatch.getSubject(),
                dispatch.getStatus(),
                dispatch.getCreatedAt());
    }

    public Long getId() {
        return id;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public String getRecipientType() {
        return recipientType;
    }

    public String getSubject() {
        return subject;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
