package com.hiikky.admin.service;

import com.hiikky.admin.dto.NotificationDetailResponse;
import com.hiikky.admin.dto.NotificationSummaryResponse;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.NotificationSearchCriteria;
import com.hiikky.admin.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<NotificationSummaryResponse> list(NotificationSearchCriteria criteria) {
        return notificationRepository.findAll(criteria)
                .stream()
                .map(NotificationSummaryResponse::from)
                .toList();
    }

    public long count(NotificationSearchCriteria criteria) {
        return notificationRepository.count(criteria);
    }

    public NotificationDetailResponse getById(Long id) {
        return notificationRepository.findById(id)
                .map(NotificationDetailResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Notification dispatch not found"));
    }
}
