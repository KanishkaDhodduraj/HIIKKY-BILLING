package com.hiikky.admin.repository;

import com.hiikky.admin.dto.PlatformAnalyticsResponse;
import com.hiikky.admin.model.AnalyticsGrouping;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Repository
public class JdbcPlatformAnalyticsRepository implements PlatformAnalyticsRepository {

    private final JdbcTemplate jdbcTemplate;

    public JdbcPlatformAnalyticsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public PlatformAnalyticsResponse getRegistrationAnalytics(
            LocalDate fromDate, LocalDate toDate, AnalyticsGrouping grouping) {
        Timestamp from = fromDate == null ? null : Timestamp.valueOf(fromDate.atStartOfDay());
        Timestamp until = toDate == null ? null : Timestamp.valueOf(toDate.plusDays(1).atStartOfDay());
        StringBuilder sql = new StringBuilder("""
                SELECT event_date, event_type, SUM(event_count) AS event_count
                FROM (
                    SELECT DATE(created_at) AS event_date, 'OWNER_REGISTRATION' AS event_type, COUNT(*) AS event_count
                    FROM business_owners
                """);
        List<Object> parameters = new ArrayList<>();
        appendRange(sql, "created_at", from, until, parameters);
        sql.append("""
                     GROUP BY DATE(created_at)
                    UNION ALL
                    SELECT DATE(created_at) AS event_date, 'ORGANIZATION_REGISTRATION' AS event_type, COUNT(*) AS event_count
                    FROM organizations
                """);
        appendRange(sql, "created_at", from, until, parameters);
        sql.append("""
                     GROUP BY DATE(created_at)
                    UNION ALL
                    SELECT DATE(updated_at) AS event_date, 'OWNER_UPDATE' AS event_type, COUNT(*) AS event_count
                    FROM business_owners
                    WHERE updated_at > created_at
                """);
        appendRangeWithAnd(sql, "updated_at", from, until, parameters);
        sql.append("""
                     GROUP BY DATE(updated_at)
                    UNION ALL
                    SELECT DATE(updated_at) AS event_date, 'ORGANIZATION_UPDATE' AS event_type, COUNT(*) AS event_count
                    FROM organizations
                    WHERE updated_at > created_at
                """);
        appendRangeWithAnd(sql, "updated_at", from, until, parameters);
        sql.append("""
                     GROUP BY DATE(updated_at)
                    UNION ALL
                    SELECT DATE(created_at) AS event_date, 'ADMIN_REGISTRATION' AS event_type, COUNT(*) AS event_count
                    FROM admin_accounts
                """);
        appendRange(sql, "created_at", from, until, parameters);
        sql.append("""
                     GROUP BY DATE(created_at)
                    UNION ALL
                    SELECT DATE(updated_at) AS event_date, 'ADMIN_UPDATE' AS event_type, COUNT(*) AS event_count
                    FROM admin_accounts
                    WHERE updated_at > created_at
                """);
        appendRangeWithAnd(sql, "updated_at", from, until, parameters);
        sql.append("""
                GROUP BY DATE(updated_at)
                ) platform_events
                GROUP BY event_date, event_type
                ORDER BY event_date, event_type
                """);

        Map<LocalDate, long[]> grouped = new TreeMap<>();
        jdbcTemplate.query(sql.toString(), rs -> {
            Date eventDate = rs.getDate("event_date");
            if (eventDate == null) {
                return;
            }
            LocalDate periodStart = toPeriodStart(eventDate.toLocalDate(), grouping);
            long[] values = grouped.computeIfAbsent(periodStart, ignored -> new long[6]);
            long count = rs.getLong("event_count");
            switch (rs.getString("event_type")) {
                case "OWNER_REGISTRATION" -> values[0] += count;
                case "ORGANIZATION_REGISTRATION" -> values[1] += count;
                case "OWNER_UPDATE" -> values[3] += count;
                case "ORGANIZATION_UPDATE" -> values[4] += count;
                case "ADMIN_REGISTRATION" -> values[2] += count;
                case "ADMIN_UPDATE" -> values[5] += count;
                default -> throw new IllegalStateException("Unexpected platform event type");
            }
        }, parameters.toArray());

        List<PlatformAnalyticsResponse.Period> periods = grouped.entrySet().stream()
                .map(entry -> new PlatformAnalyticsResponse.Period(
                        entry.getKey(), entry.getValue()[0], entry.getValue()[1], entry.getValue()[2],
                        entry.getValue()[3], entry.getValue()[4], entry.getValue()[5]))
                .toList();
        long[] totals = periods.stream().reduce(new long[6], (accumulated, period) -> {
            accumulated[0] += period.businessOwnerRegistrations();
            accumulated[1] += period.organizationRegistrations();
            accumulated[2] += period.adminAccountRegistrations();
            accumulated[3] += period.businessOwnerUpdates();
            accumulated[4] += period.organizationUpdates();
            accumulated[5] += period.adminAccountUpdates();
            return accumulated;
        }, (left, right) -> {
            for (int index = 0; index < left.length; index++) {
                left[index] += right[index];
            }
            return left;
        });
        return new PlatformAnalyticsResponse(
                fromDate, toDate, grouping,
                new PlatformAnalyticsResponse.Summary(
                        totals[0], totals[1], totals[2], totals[3], totals[4], totals[5]),
                periods
        );
    }

    private LocalDate toPeriodStart(LocalDate date, AnalyticsGrouping grouping) {
        return switch (grouping) {
            case DAY -> date;
            case WEEK -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> date.withDayOfMonth(1);
        };
    }

    private void appendRange(StringBuilder sql, String column, Timestamp from, Timestamp until, List<Object> parameters) {
        if (from != null) {
            sql.append(" WHERE ").append(column).append(" >= ? AND ").append(column).append(" < ?");
            parameters.add(from);
            parameters.add(until);
        }
    }

    private void appendRangeWithAnd(
            StringBuilder sql, String column, Timestamp from, Timestamp until, List<Object> parameters) {
        if (from != null) {
            sql.append(" AND ").append(column).append(" >= ? AND ").append(column).append(" < ?");
            parameters.add(from);
            parameters.add(until);
        }
    }
}
