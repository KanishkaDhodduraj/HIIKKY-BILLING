package com.hiikky.admin.repository;

import com.hiikky.admin.dto.PlatformAnalyticsResponse;
import com.hiikky.admin.model.AnalyticsGrouping;

import java.time.LocalDate;

public interface PlatformAnalyticsRepository {

    PlatformAnalyticsResponse getRegistrationAnalytics(
            LocalDate fromDate, LocalDate toDate, AnalyticsGrouping grouping);
}
