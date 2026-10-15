package com.hiikky.admin.service;

import com.hiikky.admin.dto.PlatformAnalyticsResponse;
import com.hiikky.admin.model.AnalyticsGrouping;
import com.hiikky.admin.repository.PlatformAnalyticsRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class PlatformAnalyticsService {

    private final PlatformAnalyticsRepository analyticsRepository;

    public PlatformAnalyticsService(PlatformAnalyticsRepository analyticsRepository) {
        this.analyticsRepository = analyticsRepository;
    }

    public PlatformAnalyticsResponse getRegistrationAnalytics(
            LocalDate fromDate, LocalDate toDate, AnalyticsGrouping grouping) {
        if ((fromDate == null) != (toDate == null)) {
            throw new IllegalArgumentException("Both fromDate and toDate must be provided together");
        }
        if (fromDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("fromDate must be on or before toDate");
        }
        return analyticsRepository.getRegistrationAnalytics(fromDate, toDate, grouping);
    }
}
