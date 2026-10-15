package com.hiikky.admin.controller;

import com.hiikky.admin.config.SecurityConfig;
import com.hiikky.admin.dto.DashboardResponse;
import com.hiikky.admin.security.AdminUserDetailsService;
import com.hiikky.admin.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardController.class)
@Import(SecurityConfig.class)
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService dashboardService;

    @MockitoBean
    private AdminUserDetailsService adminUserDetailsService;

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void returnsFreshDashboardWithDateFilters() throws Exception {
        LocalDate fromDate = LocalDate.of(2026, 10, 1);
        LocalDate toDate = LocalDate.of(2026, 10, 15);
        DashboardResponse dashboard = new DashboardResponse(
                fromDate,
                toDate,
                "database-session",
                new DashboardResponse.PlatformSummary(3, 2, 1),
                new DashboardResponse.BusinessOwnerStatistics(3, 2, 1, 1),
                new DashboardResponse.OrganizationStatistics(2, 2, 0, 1),
                new DashboardResponse.AdminAccountStatistics(1, 1, 0),
                List.of(new DashboardResponse.PlatformActivity(
                        "BUSINESS_OWNER", 3, "Alex Doe", "REGISTERED", LocalDateTime.of(2026, 10, 2, 10, 0))),
                1, 0, 20
        );
        Mockito.when(dashboardService.getDashboard(fromDate, toDate, 0, 20)).thenReturn(dashboard);

        mockMvc.perform(get("/api/admin/dashboard")
                        .param("fromDate", "2026-10-01")
                        .param("toDate", "2026-10-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.platformSummary.businessOwnerCount", is(3)))
                .andExpect(jsonPath("$.data.businessOwners.registeredInRange", is(1)))
                .andExpect(jsonPath("$.data.recentActivity[0].activityType", is("REGISTERED")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void regularAdminCannotAccessDashboard() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void rejectsIncompleteDateRange() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard").param("fromDate", "2026-10-01"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/admin/dashboard")
                        .param("fromDate", "2026-10-16")
                        .param("toDate", "2026-10-15"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/admin/dashboard").param("size", "101"))
                .andExpect(status().isBadRequest());

        Mockito.verifyNoInteractions(dashboardService);
    }
}
