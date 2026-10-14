package com.hiikky.admin.repository;

import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OrganizationStatus;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcOrganizationRepository implements OrganizationRepository {

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
        String sql = "SELECT id, name, owner_id, email, phone, address, status, created_at, updated_at FROM organizations WHERE id = ?";
        try {
            Organization org = jdbcTemplate.queryForObject(sql, rowMapper, id);
            return Optional.ofNullable(org);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Organization> findByName(String name) {
        String sql = "SELECT id, name, owner_id, email, phone, address, status, created_at, updated_at FROM organizations WHERE LOWER(name) = LOWER(?)";
        try {
            Organization org = jdbcTemplate.queryForObject(sql, rowMapper, name);
            return Optional.ofNullable(org);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Organization> findByEmail(String email) {
        String sql = "SELECT id, name, owner_id, email, phone, address, status, created_at, updated_at FROM organizations WHERE LOWER(email) = LOWER(?)";
        try {
            Organization org = jdbcTemplate.queryForObject(sql, rowMapper, email);
            return Optional.ofNullable(org);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public boolean existsById(Long id) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations WHERE id = ?", Long.class, id);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByName(String name) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations WHERE LOWER(name) = LOWER(?)", Long.class, name);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByNameAndIdNot(String name, Long id) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations WHERE LOWER(name) = LOWER(?) AND id <> ?", Long.class, name, id);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmail(String email) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations WHERE LOWER(email) = LOWER(?)", Long.class, email);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmailAndIdNot(String email, Long id) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations WHERE LOWER(email) = LOWER(?) AND id <> ?", Long.class, email, id);
        return count != null && count > 0;
    }

    @Override
    public Organization save(Organization organization) {
        LocalDateTime now = LocalDateTime.now();
        if (organization.getId() == null) {
            String sql = "INSERT INTO organizations (name, owner_id, email, phone, address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
                ps.setString(1, organization.getName());
                if (organization.getOwnerId() != null) {
                    ps.setLong(2, organization.getOwnerId());
                } else {
                    ps.setNull(2, Types.BIGINT);
                }
                ps.setString(3, organization.getEmail());
                ps.setString(4, organization.getPhone());
                ps.setString(5, organization.getAddress());
                ps.setString(6, organization.getStatus() != null ? organization.getStatus().name() : OrganizationStatus.ACTIVE.name());
                ps.setTimestamp(7, Timestamp.valueOf(now));
                ps.setTimestamp(8, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                organization.setId(keyHolder.getKey().longValue());
            }
            organization.setCreatedAt(now);
            organization.setUpdatedAt(now);
            return organization;
        } else {
            String sql = "UPDATE organizations SET name = ?, owner_id = ?, email = ?, phone = ?, address = ?, status = ?, updated_at = ? WHERE id = ?";
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql);
                ps.setString(1, organization.getName());
                if (organization.getOwnerId() != null) {
                    ps.setLong(2, organization.getOwnerId());
                } else {
                    ps.setNull(2, Types.BIGINT);
                }
                ps.setString(3, organization.getEmail());
                ps.setString(4, organization.getPhone());
                ps.setString(5, organization.getAddress());
                ps.setString(6, organization.getStatus().name());
                ps.setTimestamp(7, Timestamp.valueOf(now));
                ps.setLong(8, organization.getId());
                return ps;
            });
            organization.setUpdatedAt(now);
            return organization;
        }
    }

    @Override
    public boolean deleteById(Long id) {
        int rows = jdbcTemplate.update("DELETE FROM organizations WHERE id = ?", id);
        return rows > 0;
    }

    @Override
    public List<Organization> findByOwnerId(Long ownerId) {
        String sql = "SELECT id, name, owner_id, email, phone, address, status, created_at, updated_at FROM organizations WHERE owner_id = ? ORDER BY id";
        return jdbcTemplate.query(sql, rowMapper, ownerId);
    }

    @Override
    public long countByOwnerId(Long ownerId) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations WHERE owner_id = ?", Long.class, ownerId);
        return count != null ? count : 0L;
    }

    @Override
    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM organizations", Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public long countWithFilters(OrganizationStatus status, Long ownerId, String search) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM organizations");
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (status != null) {
            conditions.add("status = ?");
            params.add(status.name());
        }
        if (ownerId != null) {
            conditions.add("owner_id = ?");
            params.add(ownerId);
        }
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            conditions.add("(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)");
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
        StringBuilder sql = new StringBuilder("SELECT id, name, owner_id, email, phone, address, status, created_at, updated_at FROM organizations");
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (status != null) {
            conditions.add("status = ?");
            params.add(status.name());
        }
        if (ownerId != null) {
            conditions.add("owner_id = ?");
            params.add(ownerId);
        }
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            conditions.add("(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)");
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }

        sql.append(" ORDER BY id LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);

        return jdbcTemplate.query(sql.toString(), rowMapper, params.toArray());
    }

    @Override
    public boolean updateOwner(Long organizationId, Long ownerId) {
        String sql = "UPDATE organizations SET owner_id = ?, updated_at = ? WHERE id = ?";
        int rows = jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql);
            if (ownerId != null) {
                ps.setLong(1, ownerId);
            } else {
                ps.setNull(1, Types.BIGINT);
            }
            ps.setTimestamp(2, Timestamp.valueOf(LocalDateTime.now()));
            ps.setLong(3, organizationId);
            return ps;
        });
        return rows > 0;
    }
}
