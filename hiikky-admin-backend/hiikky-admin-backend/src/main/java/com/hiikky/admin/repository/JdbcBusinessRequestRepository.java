package com.hiikky.admin.repository;

import com.hiikky.admin.dto.BusinessRequestSubmission;
import com.hiikky.admin.model.BusinessRequest;
import com.hiikky.admin.model.BusinessRequestHistory;
import com.hiikky.admin.model.BusinessRequestSearchCriteria;
import com.hiikky.admin.model.BusinessRequestStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.StringJoiner;

@Repository
public class JdbcBusinessRequestRepository implements BusinessRequestRepository {

    private static final String COLUMNS = """
            id, first_name, last_name, owner_email, owner_phone, organization_name,
            organization_email, organization_phone, organization_address, status,
            decision_reason, decided_by_admin_id, created_at, decided_at,
            created_owner_id, created_organization_id
            """;

    private final JdbcTemplate jdbcTemplate;

    public JdbcBusinessRequestRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public BusinessRequest create(BusinessRequestSubmission submission, String pendingIdentityHash) {
        String sql = """
                INSERT INTO business_requests
                    (first_name, last_name, owner_email, owner_phone, organization_name,
                     organization_email, organization_phone, organization_address, pending_identity_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, new String[]{"id"});
            statement.setString(1, submission.firstName());
            statement.setString(2, submission.lastName());
            statement.setString(3, submission.ownerEmail());
            statement.setString(4, submission.ownerPhone());
            statement.setString(5, submission.organizationName());
            statement.setString(6, submission.organizationEmail());
            statement.setString(7, submission.organizationPhone());
            statement.setString(8, submission.organizationAddress());
            statement.setString(9, pendingIdentityHash);
            return statement;
        }, keyHolder);
        Number id = keyHolder.getKey();
        if (id == null) {
            throw new IllegalStateException("Business request insert did not return its generated ID");
        }
        jdbcTemplate.update(
                "INSERT INTO business_request_history (business_request_id, event_type) VALUES (?, 'SUBMITTED')",
                id.longValue());
        return findById(id.longValue()).orElseThrow(
                () -> new IllegalStateException("Created business request could not be loaded"));
    }

    @Override
    public List<BusinessRequest> findAll(BusinessRequestSearchCriteria criteria, int offset) {
        QueryParts query = buildQuery(criteria);
        String sortColumn = switch (criteria.sortBy()) {
            case "id" -> "id";
            case "createdAt" -> "created_at";
            case "status" -> "status";
            default -> throw new IllegalArgumentException("Unsupported business request sort field");
        };
        List<Object> parameters = new ArrayList<>(query.parameters());
        parameters.add(criteria.size());
        parameters.add(offset);
        return jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM business_requests" + query.whereClause()
                        + " ORDER BY " + sortColumn + " " + criteria.sortDirection().name()
                        + ", id ASC LIMIT ? OFFSET ?",
                (rs, rowNum) -> mapRequest(rs),
                parameters.toArray());
    }

    @Override
    public long count(BusinessRequestSearchCriteria criteria) {
        QueryParts query = buildQuery(criteria);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM business_requests" + query.whereClause(),
                Long.class,
                query.parameters().toArray());
        return count != null ? count : 0L;
    }

    @Override
    public Optional<BusinessRequest> findById(Long id) {
        List<BusinessRequest> requests = jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM business_requests WHERE id = ?",
                (rs, rowNum) -> mapRequest(rs),
                id);
        return requests.stream().findFirst();
    }

    @Override
    public Optional<BusinessRequest> findByIdForUpdate(Long id) {
        List<BusinessRequest> requests = jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM business_requests WHERE id = ? FOR UPDATE",
                (rs, rowNum) -> mapRequest(rs),
                id);
        return requests.stream().findFirst();
    }

    @Override
    public List<BusinessRequestHistory> findHistory(Long requestId) {
        return jdbcTemplate.query("""
                        SELECT id, event_type, actor_admin_id, reason, created_owner_id,
                               created_organization_id, created_at
                        FROM business_request_history
                        WHERE business_request_id = ?
                        ORDER BY created_at ASC, id ASC
                        """,
                (rs, rowNum) -> new BusinessRequestHistory(
                        rs.getLong("id"),
                        rs.getString("event_type"),
                        nullableLong(rs, "actor_admin_id"),
                        rs.getString("reason"),
                        nullableLong(rs, "created_owner_id"),
                        nullableLong(rs, "created_organization_id"),
                        rs.getTimestamp("created_at").toLocalDateTime()),
                requestId);
    }

    @Override
    public void decide(Long id, BusinessRequestStatus status, String reason,
                       Long adminId, Long ownerId, Long organizationId) {
        int updated = jdbcTemplate.update("""
                        UPDATE business_requests
                        SET status = ?, pending_identity_hash = NULL, decision_reason = ?,
                            decided_by_admin_id = ?, decided_at = CURRENT_TIMESTAMP,
                            created_owner_id = ?, created_organization_id = ?
                        WHERE id = ? AND status = 'PENDING'
                        """,
                status.name(), reason, adminId, ownerId, organizationId, id);
        if (updated != 1) {
            throw new IllegalStateException("Business request decision was not persisted");
        }
        jdbcTemplate.update("""
                        INSERT INTO business_request_history
                            (business_request_id, event_type, actor_admin_id, reason,
                             created_owner_id, created_organization_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                id, status.name(), adminId, reason, ownerId, organizationId);
    }

    @Override
    public boolean existsPendingIdentity(String pendingIdentityHash) {
        return exists("SELECT COUNT(*) FROM business_requests WHERE pending_identity_hash = ?",
                pendingIdentityHash);
    }

    @Override
    public boolean existsOwnerEmail(String email) {
        return exists("SELECT COUNT(*) FROM business_owners WHERE LOWER(email) = LOWER(?)", email);
    }

    @Override
    public boolean existsOrganizationName(String name) {
        return exists("SELECT COUNT(*) FROM organizations WHERE LOWER(name) = LOWER(?)", name);
    }

    @Override
    public boolean existsOrganizationEmail(String email) {
        return exists("SELECT COUNT(*) FROM organizations WHERE LOWER(email) = LOWER(?)", email);
    }

    private QueryParts buildQuery(BusinessRequestSearchCriteria criteria) {
        StringJoiner conditions = new StringJoiner(" AND ");
        List<Object> parameters = new ArrayList<>();
        if (criteria.status() != null) {
            conditions.add("status = ?");
            parameters.add(criteria.status().name());
        }
        if (criteria.search() != null && !criteria.search().isBlank()) {
            String pattern = "%" + criteria.search().trim().toLowerCase(java.util.Locale.ROOT) + "%";
            conditions.add("""
                    (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ?
                     OR LOWER(owner_email) LIKE ? OR LOWER(organization_name) LIKE ?
                     OR LOWER(organization_email) LIKE ?)
                    """.trim());
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(pattern);
            parameters.add(pattern);
        }
        if (criteria.fromDate() != null) {
            conditions.add("created_at >= ?");
            parameters.add(Timestamp.valueOf(criteria.fromDate().atStartOfDay()));
            conditions.add("created_at < ?");
            parameters.add(Timestamp.valueOf(criteria.toDate().plusDays(1).atStartOfDay()));
        }
        return new QueryParts(conditions.length() == 0 ? "" : " WHERE " + conditions, parameters);
    }

    private BusinessRequest mapRequest(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new BusinessRequest(
                rs.getLong("id"),
                rs.getString("first_name"),
                rs.getString("last_name"),
                rs.getString("owner_email"),
                rs.getString("owner_phone"),
                rs.getString("organization_name"),
                rs.getString("organization_email"),
                rs.getString("organization_phone"),
                rs.getString("organization_address"),
                BusinessRequestStatus.valueOf(rs.getString("status")),
                rs.getString("decision_reason"),
                nullableLong(rs, "decided_by_admin_id"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                nullableDateTime(rs.getTimestamp("decided_at")),
                nullableLong(rs, "created_owner_id"),
                nullableLong(rs, "created_organization_id"));
    }

    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private java.time.LocalDateTime nullableDateTime(Timestamp value) {
        return value == null ? null : value.toLocalDateTime();
    }

    private boolean exists(String sql, Object parameter) {
        Long count = jdbcTemplate.queryForObject(sql, Long.class, parameter);
        return count != null && count > 0;
    }

    private record QueryParts(String whereClause, List<Object> parameters) {
    }
}
