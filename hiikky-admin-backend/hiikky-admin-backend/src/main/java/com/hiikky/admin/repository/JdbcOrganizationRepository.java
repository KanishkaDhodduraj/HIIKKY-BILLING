package com.hiikky.admin.repository;

import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OrganizationStatus;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcOrganizationRepository implements OrganizationRepository {

    private static final String SELECT_ORGANIZATIONS = """
            SELECT o.organization_id AS id, o.organization_name AS name,
                   owner_link.business_owner_id AS owner_id, o.email, o.phone, o.address,
                   o.status, o.created_at, o.updated_at
            FROM organizations o
            LEFT JOIN organization_business_owners owner_link
                ON owner_link.organization_id = o.organization_id
            """;

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Organization> rowMapper = (rs, rowNum) -> {
        Organization org = new Organization();
        org.setId(rs.getLong("id"));
        org.setName(rs.getString("name"));
        long ownerId = rs.getLong("owner_id");
        if (!rs.wasNull()) {
            org.setOwnerId(ownerId);
        }
        org.setEmail(rs.getString("email"));
        org.setPhone(rs.getString("phone"));
        org.setAddress(rs.getString("address"));
        org.setStatus(OrganizationStatus.valueOf(rs.getString("status")));
        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) {
            org.setCreatedAt(createdAt.toLocalDateTime());
        }
        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) {
            org.setUpdatedAt(updatedAt.toLocalDateTime());
        }
        return org;
    };

    public JdbcOrganizationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<Organization> findById(Long id) {
        String sql = SELECT_ORGANIZATIONS + " WHERE o.organization_id = ?";
        try {
            Organization org = jdbcTemplate.queryForObject(sql, rowMapper, id);
            return Optional.ofNullable(org);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Organization> findByName(String name) {
        String sql = SELECT_ORGANIZATIONS + " WHERE LOWER(o.organization_name) = LOWER(?)";
        try {
            Organization org = jdbcTemplate.queryForObject(sql, rowMapper, name);
            return Optional.ofNullable(org);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Organization> findByEmail(String email) {
        String sql = SELECT_ORGANIZATIONS + " WHERE LOWER(o.email) = LOWER(?)";
        try {
            Organization org = jdbcTemplate.queryForObject(sql, rowMapper, email);
            return Optional.ofNullable(org);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public boolean existsById(Long id) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE organization_id = ?", Long.class, id);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByName(String name) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE LOWER(organization_name) = LOWER(?)", Long.class, name);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByNameAndIdNot(String name, Long id) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE LOWER(organization_name) = LOWER(?) "
                        + "AND organization_id <> ?", Long.class, name, id);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmail(String email) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE LOWER(email) = LOWER(?)", Long.class, email);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmailAndIdNot(String email, Long id) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE LOWER(email) = LOWER(?) "
                        + "AND organization_id <> ?", Long.class, email, id);
        return count != null && count > 0;
    }

    @Override
    @Transactional
    public Organization save(Organization organization) {
        LocalDateTime now = LocalDateTime.now();
        if (organization.getId() == null) {
            String sql = "INSERT INTO organizations "
                    + "(organization_name, email, phone, address, status, created_at, updated_at) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, new String[]{"organization_id"});
                ps.setString(1, organization.getName());
                ps.setString(2, organization.getEmail());
                ps.setString(3, organization.getPhone());
                ps.setString(4, organization.getAddress());
                ps.setString(5, organization.getStatus() != null
                        ? organization.getStatus().name() : OrganizationStatus.ACTIVE.name());
                ps.setTimestamp(6, Timestamp.valueOf(now));
                ps.setTimestamp(7, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                organization.setId(keyHolder.getKey().longValue());
            }
            replaceOwnerLink(organization.getId(), organization.getOwnerId());
            organization.setCreatedAt(now);
            organization.setUpdatedAt(now);
            return organization;
        } else {
            String sql = "UPDATE organizations SET organization_name = ?, email = ?, phone = ?, "
                    + "address = ?, status = ?, updated_at = ? WHERE organization_id = ?";
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql);
                ps.setString(1, organization.getName());
                ps.setString(2, organization.getEmail());
                ps.setString(3, organization.getPhone());
                ps.setString(4, organization.getAddress());
                ps.setString(5, organization.getStatus().name());
                ps.setTimestamp(6, Timestamp.valueOf(now));
                ps.setLong(7, organization.getId());
                return ps;
            });
            replaceOwnerLink(organization.getId(), organization.getOwnerId());
            organization.setUpdatedAt(now);
            return organization;
        }
    }

    @Override
    public boolean deleteById(Long id) {
        int rows = jdbcTemplate.update("DELETE FROM organizations WHERE organization_id = ?", id);
        return rows > 0;
    }

    @Override
    public List<Organization> findByOwnerId(Long ownerId) {
        String sql = SELECT_ORGANIZATIONS
                + " WHERE owner_link.business_owner_id = ? ORDER BY o.organization_id";
        return jdbcTemplate.query(sql, rowMapper, ownerId);
    }

    @Override
    public List<Organization> findByOwnerIds(List<Long> ownerIds) {
        if (ownerIds.isEmpty()) {
            return List.of();
        }
        String placeholders = String.join(",", java.util.Collections.nCopies(ownerIds.size(), "?"));
        String sql = SELECT_ORGANIZATIONS
                + " WHERE owner_link.business_owner_id IN (" + placeholders
                + ") ORDER BY owner_link.business_owner_id, o.organization_id";
        return jdbcTemplate.query(sql, rowMapper, ownerIds.toArray());
    }

    @Override
    public long countByOwnerId(Long ownerId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM organization_business_owners WHERE business_owner_id = ?",
                Long.class, ownerId);
        return count != null ? count : 0L;
    }

    @Override
    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations", Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public long countWithFilters(OrganizationStatus status, Long ownerId, String search) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM organizations o "
                + "LEFT JOIN organization_business_owners owner_link "
                + "ON owner_link.organization_id = o.organization_id");
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (status != null) {
            conditions.add("status = ?");
            params.add(status.name());
        }
        if (ownerId != null) {
            conditions.add("owner_link.business_owner_id = ?");
            params.add(ownerId);
        }
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            conditions.add("(LOWER(o.organization_name) LIKE ? OR LOWER(o.email) LIKE ? OR o.phone LIKE ?)");
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }

        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count : 0L;
    }

    @Override
    public List<Organization> findAll(int offset, int limit, OrganizationStatus status, Long ownerId, String search) {
        StringBuilder sql = new StringBuilder(SELECT_ORGANIZATIONS);
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (status != null) {
            conditions.add("status = ?");
            params.add(status.name());
        }
        if (ownerId != null) {
            conditions.add("owner_link.business_owner_id = ?");
            params.add(ownerId);
        }
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            conditions.add("(LOWER(o.organization_name) LIKE ? OR LOWER(o.email) LIKE ? OR o.phone LIKE ?)");
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }

        sql.append(" ORDER BY o.organization_id LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);

        return jdbcTemplate.query(sql.toString(), rowMapper, params.toArray());
    }

    @Override
    @Transactional
    public boolean updateOwner(Long organizationId, Long ownerId) {
        if (!existsById(organizationId)) {
            return false;
        }
        replaceOwnerLink(organizationId, ownerId);
        return true;
    }

    private void replaceOwnerLink(Long organizationId, Long ownerId) {
        jdbcTemplate.update(
                "DELETE FROM organization_business_owners WHERE organization_id = ?", organizationId);
        if (ownerId != null) {
            jdbcTemplate.update(
                    "INSERT INTO organization_business_owners (organization_id, business_owner_id) VALUES (?, ?)",
                    organizationId, ownerId);
        }
    }
}
