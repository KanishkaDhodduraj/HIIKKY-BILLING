package com.hiikky.admin.repository;

import com.hiikky.admin.dto.DashboardResponse;

import java.time.LocalDate;

public interface DashboardRepository {

    DashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate, int activityOffset, int activitySize);
}
