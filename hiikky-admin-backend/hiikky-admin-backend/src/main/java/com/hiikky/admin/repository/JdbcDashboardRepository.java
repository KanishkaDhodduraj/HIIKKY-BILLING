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

    private static final String ACTIVITY_SELECT = """
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
                UNION ALL
                SELECT 'ADMIN_ACCOUNT' AS entity_type, id AS entity_id, email AS display_name,
                       CASE WHEN updated_at > created_at THEN 'UPDATED' ELSE 'REGISTERED' END AS activity_type,
                       CASE WHEN updated_at > created_at THEN updated_at ELSE created_at END AS occurred_at
                FROM admin_accounts
            ) platform_activity
            """;

    private final JdbcTemplate jdbcTemplate;

    public JdbcDashboardRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public DashboardResponse getDashboard(LocalDate fromDate, LocalDate toDate, int activityOffset, int activitySize) {
        Timestamp from = fromDate == null ? null : Timestamp.valueOf(fromDate.atStartOfDay());
        Timestamp until = toDate == null ? null : Timestamp.valueOf(toDate.plusDays(1).atStartOfDay());
        StatusStatistics owners = getStatusStatistics("business_owners", from, until);
        StatusStatistics organizations = getStatusStatistics("organizations", from, until);
        AdminStatistics admins = getAdminStatistics();

        List<DashboardResponse.PlatformActivity> activities = findRecentActivity(from, until, activityOffset, activitySize);
        long activityCount = countRecentActivity(from, until);
        return new DashboardResponse(
                fromDate,
                toDate,
                "database-session",
                new DashboardResponse.PlatformSummary(owners.total(), organizations.total(), admins.total()),
                new DashboardResponse.BusinessOwnerStatistics(
                        owners.total(), owners.active(), owners.inactive(), owners.inRange()),
                new DashboardResponse.OrganizationStatistics(
                        organizations.total(), organizations.active(), organizations.inactive(), organizations.inRange()),
                new DashboardResponse.AdminAccountStatistics(admins.total(), admins.enabled(), admins.disabled()),
                activities,
                activityCount,
                activityOffset / activitySize,
                activitySize
        );
    }

    private StatusStatistics getStatusStatistics(String table, Timestamp from, Timestamp until) {
        boolean filterByDate = from != null;
        String createdInRange = filterByDate
                ? "SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END)"
                : "COUNT(*)";
        String sql = "SELECT COUNT(*), "
                + "COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0), "
                + "COALESCE(SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END), 0), "
                + "COALESCE(" + createdInRange + ", 0) FROM " + table;
        Object[] parameters = filterByDate ? new Object[]{from, until} : new Object[0];
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new StatusStatistics(
                rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4)), parameters);
    }

    private AdminStatistics getAdminStatistics() {
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(*),
                       COALESCE(SUM(CASE WHEN enabled = TRUE THEN 1 ELSE 0 END), 0),
                       COALESCE(SUM(CASE WHEN enabled = FALSE THEN 1 ELSE 0 END), 0)
                FROM admin_accounts
                """, (rs, rowNum) -> new AdminStatistics(rs.getLong(1), rs.getLong(2), rs.getLong(3)));
    }

    private long countRecentActivity(Timestamp from, Timestamp until) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM (").append(ACTIVITY_SELECT).append(") activity_count");
        List<Object> parameters = new ArrayList<>();
        appendDateRange(sql, "occurred_at", from, until, parameters);
        Long result = jdbcTemplate.queryForObject(sql.toString(), Long.class, parameters.toArray());
        return result == null ? 0 : result;
    }

    private List<DashboardResponse.PlatformActivity> findRecentActivity(
            Timestamp from, Timestamp until, int offset, int size) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder query = new StringBuilder(ACTIVITY_SELECT);
        appendDateRange(query, "occurred_at", from, until, parameters);
        query.append(" ORDER BY occurred_at DESC, entity_type, entity_id LIMIT ? OFFSET ?");
        parameters.add(size);
        parameters.add(offset);

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

    private record StatusStatistics(long total, long active, long inactive, long inRange) {
    }

    private record AdminStatistics(long total, long enabled, long disabled) {
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
