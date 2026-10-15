package com.hiikky.admin.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LegacyAdminReportControllerTest {

    private static final LocalDate REPORT_DATE = LocalDate.of(2026, 1, 15);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long organizationId;
    private Long subscriptionId;
    private Long subscriberId;
    private Long courseId;

    @BeforeEach
    void insertLegacyReportRows() {
        jdbcTemplate.update("DELETE FROM billing");
        jdbcTemplate.update("DELETE FROM subscribers");
        jdbcTemplate.update("DELETE FROM course_installments");
        jdbcTemplate.update("DELETE FROM subscriptions");
        jdbcTemplate.update("DELETE FROM courses");

        if (jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE email = ?",
                Long.class, "report-test@example.test") == 0) {
            jdbcTemplate.update("""
                    INSERT INTO organizations
                        (organization_name, email, status, created_at, updated_at)
                    VALUES ('Report Test Org', 'report-test@example.test', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """);
        }
        organizationId = jdbcTemplate.queryForObject(
                "SELECT organization_id FROM organizations WHERE email = ?",
                Long.class, "report-test@example.test");
        jdbcTemplate.update("""
                INSERT INTO subscriptions (plan_name, description, price, billing_cycle, max_users, status)
                VALUES ('Report Plan', 'Test plan', 12.50, 'MONTHLY', 10, 'ACTIVE')
                """);
        subscriptionId = jdbcTemplate.queryForObject(
                "SELECT MAX(subscription_id) FROM subscriptions", Long.class);
        jdbcTemplate.update("""
                INSERT INTO subscribers
                    (organization_id, subscription_id, full_name, email, phone, start_date, end_date, status)
                VALUES (?, ?, 'Report Subscriber', 'report-subscriber@example.test', '5550100', ?, ?, 'ACTIVE')
                """, organizationId, subscriptionId, REPORT_DATE, REPORT_DATE.plusMonths(1));
        subscriberId = jdbcTemplate.queryForObject(
                "SELECT MAX(subscriber_id) FROM subscribers", Long.class);
        jdbcTemplate.update("""
                INSERT INTO billing
                    (organization_id, subscriber_id, subscription_id, payment_name, due_date, amount,
                     payment_status, paid_date, created_at, original_amount, discount_amount)
                VALUES (?, ?, ?, 'January invoice', ?, 12.50, 'PAID', ?, CURRENT_TIMESTAMP, 12.50, 0.00)
                """, organizationId, subscriberId, subscriptionId, REPORT_DATE, REPORT_DATE);
        jdbcTemplate.update("""
                INSERT INTO courses (course_code, course_name, duration, duration_unit, course_fee,
                                     payment_type, status, description, created_at)
                VALUES ('RPT-01', '=1+1', 1, 'MONTHS', 20.00, 'FULL', 'ACTIVE', 'Report course', CURRENT_TIMESTAMP)
                """);
        courseId = jdbcTemplate.queryForObject(
                "SELECT course_id FROM courses WHERE course_code = 'RPT-01'", Long.class);
        jdbcTemplate.update("""
                INSERT INTO course_installments
                    (course_id, installment_number, installment_name, amount, due_days, due_date, created_at)
                VALUES (?, 1, 'First installment', 10.00, 30, ?, CURRENT_TIMESTAMP)
                """, courseId, REPORT_DATE);
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void listsAndFiltersSubscribersWithPagination() throws Exception {
        mockMvc.perform(get("/api/admin/reports/subscribers")
                        .param("organizationId", organizationId.toString())
                        .param("subscriptionId", subscriptionId.toString())
                        .param("search", "report subscriber")
                        .param("fromDate", REPORT_DATE.toString())
                        .param("toDate", REPORT_DATE.toString())
                        .param("page", "0")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "1"))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].fullName").value("Report Subscriber"))
                .andExpect(jsonPath("$.data[0].organizationId").value(organizationId.intValue()));
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void listsBillingWithPaymentAndDueDateFiltersWithoutCallingItPlatformRevenue() throws Exception {
        mockMvc.perform(get("/api/admin/reports/billing")
                        .param("organizationId", organizationId.toString())
                        .param("subscriberId", subscriberId.toString())
                        .param("paymentStatus", "PAID")
                        .param("fromDate", REPORT_DATE.toString())
                        .param("toDate", REPORT_DATE.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data[0].amount").value(12.5));
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void exportsFormulaSafeCourseCsvAndProvidesHeadersForEmptyPages() throws Exception {
        MvcResult export = mockMvc.perform(get("/api/admin/reports/courses.csv")
                        .param("search", "=1+1"))
                .andExpect(request().asyncStarted())
                .andReturn();
        mockMvc.perform(asyncDispatch(export))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().string(containsString("'=1+1")));

        mockMvc.perform(get("/api/admin/reports/courses").param("search", "missing-course"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)))
                .andExpect(header().string("X-Total-Count", "0"));
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void supportsSubscriptionAndCourseInstallmentRows() throws Exception {
        mockMvc.perform(get("/api/admin/reports/subscriptions").param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].planName").value("Report Plan"))
                .andExpect(jsonPath("$.data[0].price").value(12.5));

        mockMvc.perform(get("/api/admin/reports/course-installments")
                        .param("courseId", courseId.toString())
                        .param("fromDate", REPORT_DATE.toString())
                        .param("toDate", REPORT_DATE.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].courseName").value("=1+1"))
                .andExpect(jsonPath("$.data[0].installmentNumber").value(1));
    }

    @Test
    void requiresSuperAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/reports/subscribers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void rejectsUnsupportedFiltersAndUnsafeSortFields() throws Exception {
        mockMvc.perform(get("/api/admin/reports/subscriptions").param("fromDate", REPORT_DATE.toString()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/admin/reports/billing").param("sortBy", "amount DESC"))
                .andExpect(status().isBadRequest());
        assertTrue(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM billing", Long.class) > 0);
    }
}
