package com.hiikky.admin.repository;

import com.hiikky.admin.dto.DashboardResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class JdbcDashboardRepository implements DashboardRepository {

    private static final int RECENT_ACTIVITY_LIMIT = 20;

    private final JdbcTemplate jdbcTemplate;

    public JdbcDashboardRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public DashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate) {
        long ownerCount = count("SELECT COUNT(*) FROM business_owners");
        long organizationCount = count("SELECT COUNT(*) FROM organizations");
        long adminAccountCount = count("SELECT COUNT(*) FROM admin_accounts");

        long activeOwners = countByStatus("business_owners", "ACTIVE");
        long inactiveOwners = countByStatus("business_owners", "INACTIVE");
        long activeOrganizations = countByStatus("organizations", "ACTIVE");
        long inactiveOrganizations = countByStatus("organizations", "INACTIVE");

        Timestamp from = fromDate == null ? null : Timestamp.valueOf(fromDate.atStartOfDay());
        Timestamp until = toDate == null ? null : Timestamp.valueOf(toDate.plusDays(1).atStartOfDay());
        long ownersCreated = countCreated("business_owners", from, until);
        long organizationsCreated = countCreated("organizations", from, until);

        List<DashboardResponse.PlatformActivity> activities = findRecentActivity(from, until);
        return new DashboardResponse(
                fromDate,
                toDate,
                new DashboardResponse.PlatformSummary(ownerCount, organizationCount, adminAccountCount),
                new DashboardResponse.BusinessOwnerStatistics(ownerCount, activeOwners, inactiveOwners, ownersCreated),
                new DashboardResponse.OrganizationStatistics(
                        organizationCount, activeOrganizations, inactiveOrganizations, organizationsCreated),
                activities
        );
    }

    private long count(String sql) {
        Long result = jdbcTemplate.queryForObject(sql, Long.class);
        return result == null ? 0 : result;
    }

    private long countByStatus(String table, String status) {
        Long result = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE status = ?", Long.class, status);
        return result == null ? 0 : result;
    }

    private long countCreated(String table, Timestamp from, Timestamp until) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM ").append(table);
        List<Object> parameters = new ArrayList<>();
        appendDateRange(sql, "created_at", from, until, parameters);
        Long result = jdbcTemplate.queryForObject(sql.toString(), Long.class, parameters.toArray());
        return result == null ? 0 : result;
    }

    private List<DashboardResponse.PlatformActivity> findRecentActivity(Timestamp from, Timestamp until) {
        String sql = """
                SELECT entity_type, entity_id, display_name, activity_type, occurred_at
                FROM (
                    SELECT 'BUSINESS_OWNER' AS entity_type, id AS entity_id,
                           CONCAT(first_name, CASE WHEN last_name IS NULL OR last_name = ''
                               THEN '' ELSE CONCAT(' ', last_name) END) AS display_name,
                           CASE WHEN updated_at > created_at THEN 'UPDATED' ELSE 'REGISTERED' END AS activity_type,
                           CASE WHEN updated_at > created_at THEN updated_at ELSE created_at END AS occurred_at
                    FROM business_owners
                    UNION ALL
                    SELECT 'ORGANIZATION' AS entity_type, id AS entity_id, name AS display_name,
                           CASE WHEN updated_at > created_at THEN 'UPDATED' ELSE 'CREATED' END AS activity_type,
                           CASE WHEN updated_at > created_at THEN updated_at ELSE created_at END AS occurred_at
                    FROM organizations
                ) platform_activity
                """;
        List<Object> parameters = new ArrayList<>();
        StringBuilder query = new StringBuilder(sql);
        appendDateRange(query, "occurred_at", from, until, parameters);
        query.append(" ORDER BY occurred_at DESC, entity_type, entity_id LIMIT ?");
        parameters.add(RECENT_ACTIVITY_LIMIT);

        return jdbcTemplate.query(query.toString(), (rs, rowNum) -> {
            Timestamp occurredAt = rs.getTimestamp("occurred_at");
            return new DashboardResponse.PlatformActivity(
                    rs.getString("entity_type"),
                    rs.getLong("entity_id"),
                    rs.getString("display_name"),
                    rs.getString("activity_type"),
                    occurredAt == null ? null : occurredAt.toLocalDateTime()
            );
        }, parameters.toArray());
    }

    private void appendDateRange(
            StringBuilder sql,
            String column,
            Timestamp from,
            Timestamp until,
            List<Object> parameters
    ) {
        if (from != null && until != null) {
            sql.append(" WHERE ").append(column).append(" >= ? AND ").append(column).append(" < ?");
            parameters.add(from);
            parameters.add(until);
        }
    }
}
