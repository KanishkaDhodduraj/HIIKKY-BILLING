package com.hiikky.admin.dto;

import com.hiikky.admin.model.NotificationDispatch;

import java.time.LocalDateTime;

public class NotificationDetailResponse {

    private Long id;
    private String notificationType;
    private String recipientType;
    private String subject;
    private String message;
    private String status;
    private LocalDateTime createdAt;

    public NotificationDetailResponse() {
    }

    public NotificationDetailResponse(Long id, String notificationType, String recipientType,
                                      String subject, String message, String status,
                                      LocalDateTime createdAt) {
        this.id = id;
        this.notificationType = notificationType;
        this.recipientType = recipientType;
        this.subject = subject;
        this.message = message;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static NotificationDetailResponse from(NotificationDispatch dispatch) {
        return new NotificationDetailResponse(
                dispatch.getId(),
                dispatch.getNotificationType(),
                dispatch.getRecipientType(),
                dispatch.getSubject(),
                dispatch.getMessage(),
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

    public String getMessage() {
        return message;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
