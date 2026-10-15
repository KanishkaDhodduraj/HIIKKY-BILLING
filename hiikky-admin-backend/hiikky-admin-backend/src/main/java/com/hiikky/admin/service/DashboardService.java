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

    public DashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate, int page, int size) {
        if ((fromDate == null) != (toDate == null)) {
            throw new IllegalArgumentException("Both fromDate and toDate must be provided together");
        }
        if (fromDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("fromDate must be on or before toDate");
        }
        if (page < 0) {
            throw new IllegalArgumentException("Activity page index must not be negative");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("Activity page size must be between 1 and 100");
        }
        int offset;
        try {
            offset = Math.multiplyExact(page, size);
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Activity page is too large", exception);
        }
        return dashboardRepository.getDashboard(fromDate, toDate, offset, size);
    }
}
