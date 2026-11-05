package com.hiikky.admin.repository;

import com.hiikky.admin.model.NotificationDispatch;
import com.hiikky.admin.model.NotificationSearchCriteria;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.StringJoiner;

@Repository
public class JdbcNotificationRepository implements NotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<NotificationDispatch> rowMapper = (rs, rowNum) -> {
        NotificationDispatch dispatch = new NotificationDispatch();
        dispatch.setId(rs.getLong("notification_id"));
        dispatch.setNotificationType(rs.getString("notification_type"));
        dispatch.setRecipientType(rs.getString("recipient_type"));
        dispatch.setSubject(rs.getString("subject"));
        dispatch.setMessage(rs.getString("message"));
        dispatch.setStatus(rs.getString("status"));
        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) {
            dispatch.setCreatedAt(createdAt.toLocalDateTime());
        }
        return dispatch;
    };

    public JdbcNotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<NotificationDispatch> findAll(NotificationSearchCriteria criteria) {
        QueryParts query = buildQuery(criteria);
        String sql = "SELECT notification_id, notification_type, recipient_type, subject, message, status, created_at "
                + "FROM notification" + query.whereClause()
                + " ORDER BY " + sortColumn(criteria.sortBy()) + " " + criteria.sortDirection().name()
                + ", notification_id " + criteria.sortDirection().name()
                + " LIMIT ? OFFSET ?";
        List<Object> parameters = new ArrayList<>(query.parameters());
        parameters.add(criteria.size());
        parameters.add(criteria.offset());
        return jdbcTemplate.query(sql, rowMapper, parameters.toArray());
    }

    @Override
    public long count(NotificationSearchCriteria criteria) {
        QueryParts query = buildQuery(criteria);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification" + query.whereClause(),
                Long.class,
                query.parameters().toArray());
        return count != null ? count : 0L;
    }

    @Override
    public Optional<NotificationDispatch> findById(Long id) {
        String sql = "SELECT notification_id, notification_type, recipient_type, subject, message, status, created_at "
                + "FROM notification WHERE notification_id = ?";
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(sql, rowMapper, id));
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    private QueryParts buildQuery(NotificationSearchCriteria criteria) {
        StringJoiner conditions = new StringJoiner(" AND ");
        List<Object> parameters = new ArrayList<>();

        addExactFilter(conditions, parameters, "notification_type", criteria.notificationType());
        addExactFilter(conditions, parameters, "recipient_type", criteria.recipientType());
        addExactFilter(conditions, parameters, "status", criteria.status());

        if (criteria.search() != null && !criteria.search().trim().isEmpty()) {
            String searchPattern = "%" + criteria.search().trim().toLowerCase() + "%";
            conditions.add("(LOWER(subject) LIKE ? OR LOWER(message) LIKE ?)");
            parameters.add(searchPattern);
            parameters.add(searchPattern);
        }
        if (criteria.fromDate() != null) {
            conditions.add("created_at >= ?");
            parameters.add(Timestamp.valueOf(criteria.fromDate().atStartOfDay()));
            conditions.add("created_at < ?");
            parameters.add(Timestamp.valueOf(criteria.toDate().plusDays(1).atStartOfDay()));
        }

        String whereClause = conditions.length() == 0 ? "" : " WHERE " + conditions;
        return new QueryParts(whereClause, parameters);
    }

    private void addExactFilter(StringJoiner conditions, List<Object> parameters,
                                String column, String value) {
        if (value != null) {
            conditions.add(column + " = ?");
            parameters.add(value);
        }
    }

    private String sortColumn(String sortBy) {
        return switch (sortBy) {
            case "createdAt" -> "created_at";
            case "id" -> "notification_id";
            default -> throw new IllegalArgumentException("Unsupported notification sort field");
        };
    }

    private record QueryParts(String whereClause, List<Object> parameters) {
    }
}
