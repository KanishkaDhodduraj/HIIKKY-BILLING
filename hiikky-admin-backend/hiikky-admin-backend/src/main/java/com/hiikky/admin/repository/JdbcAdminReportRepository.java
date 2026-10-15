package com.hiikky.admin.repository;

import com.hiikky.admin.dto.BusinessOwnerReportRow;
import com.hiikky.admin.dto.OrganizationReportRow;
import com.hiikky.admin.model.BusinessOwnerReportCriteria;
import com.hiikky.admin.model.OrganizationReportCriteria;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.StringJoiner;

@Repository
public class JdbcAdminReportRepository implements AdminReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public JdbcAdminReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<BusinessOwnerReportRow> findBusinessOwners(
            BusinessOwnerReportCriteria criteria, int limit, int offset) {
        QueryParts query = businessOwnerQuery(criteria);
        String sql = "SELECT b.id, b.first_name, b.last_name, b.email, b.phone, b.status, "
                + "(SELECT COUNT(*) FROM organization_business_owners org_link "
                + "WHERE org_link.business_owner_id = b.id) AS organization_count, "
                + "b.created_at, b.updated_at FROM business_owners b"
                + query.whereClause()
                + " ORDER BY " + businessOwnerSortColumn(criteria.sortBy()) + " "
                + criteria.sortDirection().name() + ", b.id ASC LIMIT ? OFFSET ?";
        List<Object> parameters = new ArrayList<>(query.parameters());
        parameters.add(limit);
        parameters.add(offset);
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Timestamp createdAt = rs.getTimestamp("created_at");
            Timestamp updatedAt = rs.getTimestamp("updated_at");
            return new BusinessOwnerReportRow(
                    rs.getLong("id"),
                    rs.getString("first_name"),
                    rs.getString("last_name"),
                    rs.getString("email"),
                    rs.getString("phone"),
                    com.hiikky.admin.model.OwnerStatus.valueOf(rs.getString("status")),
                    rs.getLong("organization_count"),
                    createdAt != null ? createdAt.toLocalDateTime() : null,
                    updatedAt != null ? updatedAt.toLocalDateTime() : null);
        }, parameters.toArray());
    }

    @Override
    public long countBusinessOwners(BusinessOwnerReportCriteria criteria) {
        QueryParts query = businessOwnerQuery(criteria);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM business_owners b" + query.whereClause(),
                Long.class,
                query.parameters().toArray());
        return count != null ? count : 0L;
    }

    @Override
    public List<OrganizationReportRow> findOrganizations(
            OrganizationReportCriteria criteria, int limit, int offset) {
        QueryParts query = organizationQuery(criteria);
        String sql = "SELECT o.organization_id AS id, o.organization_name AS name, "
                + "org_link.business_owner_id AS owner_id, bo.first_name AS owner_first_name, "
                + "bo.last_name AS owner_last_name, bo.email AS owner_email, o.email, o.phone, o.address, "
                + "o.status, o.created_at, o.updated_at FROM organizations o "
                + "LEFT JOIN organization_business_owners org_link "
                + "ON org_link.organization_id = o.organization_id "
                + "LEFT JOIN business_owners bo ON bo.id = org_link.business_owner_id"
                + query.whereClause()
                + " ORDER BY " + organizationSortColumn(criteria.sortBy()) + " "
                + criteria.sortDirection().name() + ", o.organization_id ASC LIMIT ? OFFSET ?";
        List<Object> parameters = new ArrayList<>(query.parameters());
        parameters.add(limit);
        parameters.add(offset);
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Timestamp createdAt = rs.getTimestamp("created_at");
            Timestamp updatedAt = rs.getTimestamp("updated_at");
            String firstName = rs.getString("owner_first_name");
            String lastName = rs.getString("owner_last_name");
            String ownerName = ((firstName == null ? "" : firstName) + " "
                    + (lastName == null ? "" : lastName)).trim();
            return new OrganizationReportRow(
                    rs.getLong("id"),
                    rs.getString("name"),
                    rs.getObject("owner_id", Long.class),
                    ownerName.isEmpty() ? null : ownerName,
                    rs.getString("owner_email"),
                    rs.getString("email"),
                    rs.getString("phone"),
                    rs.getString("address"),
                    com.hiikky.admin.model.OrganizationStatus.valueOf(rs.getString("status")),
                    createdAt != null ? createdAt.toLocalDateTime() : null,
                    updatedAt != null ? updatedAt.toLocalDateTime() : null);
        }, parameters.toArray());
    }

    @Override
    public long countOrganizations(OrganizationReportCriteria criteria) {
        QueryParts query = organizationQuery(criteria);
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations o "
                        + "LEFT JOIN organization_business_owners org_link "
                        + "ON org_link.organization_id = o.organization_id"
                        + query.whereClause(),
                Long.class,
                query.parameters().toArray());
        return count != null ? count : 0L;
    }

    private QueryParts businessOwnerQuery(BusinessOwnerReportCriteria criteria) {
        StringJoiner conditions = new StringJoiner(" AND ");
        List<Object> parameters = new ArrayList<>();
        if (criteria.status() != null) {
            conditions.add("b.status = ?");
            parameters.add(criteria.status().name());
        }
        if (criteria.organizationId() != null) {
            conditions.add("EXISTS (SELECT 1 FROM organizations org_filter "
                    + "JOIN organization_business_owners org_link "
                    + "ON org_link.organization_id = org_filter.organization_id "
                    + "WHERE org_link.business_owner_id = b.id AND org_filter.organization_id = ?)");
            parameters.add(criteria.organizationId());
        }
        addSearch(conditions, parameters, criteria.search(),
                "LOWER(b.email) LIKE ? OR LOWER(b.first_name) LIKE ? "
                        + "OR LOWER(b.last_name) LIKE ? OR b.phone LIKE ?");
        addDateRange(conditions, parameters, "b.created_at", criteria.fromDate(), criteria.toDate());
        return new QueryParts(whereClause(conditions), parameters);
    }

    private QueryParts organizationQuery(OrganizationReportCriteria criteria) {
        StringJoiner conditions = new StringJoiner(" AND ");
        List<Object> parameters = new ArrayList<>();
        if (criteria.status() != null) {
            conditions.add("o.status = ?");
            parameters.add(criteria.status().name());
        }
        if (criteria.ownerId() != null) {
            conditions.add("org_link.business_owner_id = ?");
            parameters.add(criteria.ownerId());
        }
        addSearch(conditions, parameters, criteria.search(),
                "LOWER(o.organization_name) LIKE ? OR LOWER(o.email) LIKE ? OR o.phone LIKE ?");
        addDateRange(conditions, parameters, "o.created_at", criteria.fromDate(), criteria.toDate());
        return new QueryParts(whereClause(conditions), parameters);
    }

    private void addSearch(StringJoiner conditions, List<Object> parameters,
                           String search, String expression) {
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            conditions.add("(" + expression + ")");
            int parameterCount = (int) expression.chars().filter(character -> character == '?').count();
            for (int index = 0; index < parameterCount; index++) {
                parameters.add(pattern);
            }
        }
    }

    private void addDateRange(StringJoiner conditions, List<Object> parameters,
                              String column, java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        if (fromDate != null) {
            conditions.add(column + " >= ?");
            parameters.add(Timestamp.valueOf(fromDate.atStartOfDay()));
            conditions.add(column + " < ?");
            parameters.add(Timestamp.valueOf(toDate.plusDays(1).atStartOfDay()));
        }
    }

    private String whereClause(StringJoiner conditions) {
        return conditions.length() == 0 ? "" : " WHERE " + conditions;
    }

    private String businessOwnerSortColumn(String sortBy) {
        return switch (sortBy) {
            case "id" -> "b.id";
            case "firstName" -> "b.first_name";
            case "lastName" -> "b.last_name";
            case "email" -> "b.email";
            case "status" -> "b.status";
            case "organizationCount" -> "organization_count";
            case "createdAt" -> "b.created_at";
            case "updatedAt" -> "b.updated_at";
            default -> throw new IllegalArgumentException("Unsupported Business Owner report sort field");
        };
    }

    private String organizationSortColumn(String sortBy) {
        return switch (sortBy) {
            case "id" -> "o.organization_id";
            case "name" -> "o.organization_name";
            case "status" -> "o.status";
            case "createdAt" -> "o.created_at";
            case "updatedAt" -> "o.updated_at";
            default -> throw new IllegalArgumentException("Unsupported Organization report sort field");
        };
    }

    private record QueryParts(String whereClause, List<Object> parameters) {
    }
}
