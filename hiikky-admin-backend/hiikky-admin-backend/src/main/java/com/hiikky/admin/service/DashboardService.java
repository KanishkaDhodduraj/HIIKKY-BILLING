package com.hiikky.admin.service;

import com.hiikky.admin.dto.DashboardResponse;
import com.hiikky.admin.repository.DashboardRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;

    public DashboardService(DashboardRepository dashboardRepository) {
        this.dashboardRepository = dashboardRepository;
    }

    public DashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate) {
        if ((fromDate == null) != (toDate == null)) {
            throw new IllegalArgumentException("Both fromDate and toDate must be provided together");
        }
        if (fromDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("fromDate must be on or before toDate");
        }
        return dashboardRepository.getDashboard(fromDate, toDate);
    }
}
