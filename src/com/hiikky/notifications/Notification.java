package com.hiikky.notifications;

import java.time.LocalDateTime;

public class Notification {

    private int notificationId;
    private String notificationType;
    private String recipientType;
    private String subject;
    private String message;
    private String status;
    private LocalDateTime createdAt;

    public Notification() {
    }

    public Notification(String notificationType, String recipientType,
                        String subject, String message, String status) {
        this.notificationType = notificationType;
        this.recipientType = recipientType;
        this.subject = subject;
        this.message = message;
        this.status = status;
    }

    public int getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(int notificationId) {
        this.notificationId = notificationId;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public String getRecipientType() {
        return recipientType;
    }

    public void setRecipientType(String recipientType) {
        this.recipientType = recipientType;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}