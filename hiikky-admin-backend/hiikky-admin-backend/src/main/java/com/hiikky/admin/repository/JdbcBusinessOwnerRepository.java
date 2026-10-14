package com.hiikky.admin.repository;

import com.hiikky.admin.model.BusinessOwner;
import com.hiikky.admin.model.OwnerStatus;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcBusinessOwnerRepository implements BusinessOwnerRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<BusinessOwner> rowMapper = (rs, rowNum) -> {
        BusinessOwner owner = new BusinessOwner();
        owner.setId(rs.getLong("id"));
        owner.setFirstName(rs.getString("first_name"));
        owner.setLastName(rs.getString("last_name"));
        owner.setEmail(rs.getString("email"));
        owner.setPhone(rs.getString("phone"));
        owner.setStatus(OwnerStatus.valueOf(rs.getString("status")));
        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) {
            owner.setCreatedAt(createdAt.toLocalDateTime());
        }
        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) {
            owner.setUpdatedAt(updatedAt.toLocalDateTime());
        }
        return owner;
    };

    public JdbcBusinessOwnerRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<BusinessOwner> findById(Long id) {
        String sql = "SELECT id, first_name, last_name, email, phone, status, created_at, updated_at FROM business_owners WHERE id = ?";
        try {
            BusinessOwner owner = jdbcTemplate.queryForObject(sql, rowMapper, id);
            return Optional.ofNullable(owner);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<BusinessOwner> findByEmail(String email) {
        String sql = "SELECT id, first_name, last_name, email, phone, status, created_at, updated_at FROM business_owners WHERE LOWER(email) = LOWER(?)";
        try {
            BusinessOwner owner = jdbcTemplate.queryForObject(sql, rowMapper, email);
            return Optional.ofNullable(owner);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public boolean existsById(Long id) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM business_owners WHERE id = ?", Long.class, id);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmail(String email) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM business_owners WHERE LOWER(email) = LOWER(?)", Long.class, email);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmailAndIdNot(String email, Long id) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM business_owners WHERE LOWER(email) = LOWER(?) AND id <> ?", Long.class, email, id);
        return count != null && count > 0;
    }

    @Override
    public BusinessOwner save(BusinessOwner businessOwner) {
        LocalDateTime now = LocalDateTime.now();
        if (businessOwner.getId() == null) {
            String sql = "INSERT INTO business_owners (first_name, last_name, email, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
                ps.setString(1, businessOwner.getFirstName());
                ps.setString(2, businessOwner.getLastName());
                ps.setString(3, businessOwner.getEmail());
                ps.setString(4, businessOwner.getPhone());
                ps.setString(5, businessOwner.getStatus() != null ? businessOwner.getStatus().name() : OwnerStatus.ACTIVE.name());
                ps.setTimestamp(6, Timestamp.valueOf(now));
                ps.setTimestamp(7, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                businessOwner.setId(keyHolder.getKey().longValue());
            }
            businessOwner.setCreatedAt(now);
            businessOwner.setUpdatedAt(now);
            return businessOwner;
        } else {
            String sql = "UPDATE business_owners SET first_name = ?, last_name = ?, email = ?, phone = ?, status = ?, updated_at = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    businessOwner.getFirstName(),
                    businessOwner.getLastName(),
                    businessOwner.getEmail(),
                    businessOwner.getPhone(),
                    businessOwner.getStatus().name(),
                    Timestamp.valueOf(now),
                    businessOwner.getId());
            businessOwner.setUpdatedAt(now);
            return businessOwner;
        }
    }

    @Override
    public boolean deleteById(Long id) {
        int rows = jdbcTemplate.update("DELETE FROM business_owners WHERE id = ?", id);
        return rows > 0;
    }

    @Override
    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM business_owners", Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public long countWithFilters(OwnerStatus status, String search) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM business_owners");
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (status != null) {
            conditions.add("status = ?");
            params.add(status.name());
        }
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            conditions.add("(LOWER(email) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR phone LIKE ?)");
            params.add(pattern);
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
    public List<BusinessOwner> findAll(int offset, int limit, OwnerStatus status, String search) {
        StringBuilder sql = new StringBuilder("SELECT id, first_name, last_name, email, phone, status, created_at, updated_at FROM business_owners");
        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        if (status != null) {
            conditions.add("status = ?");
            params.add(status.name());
        }
        if (search != null && !search.trim().isEmpty()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            conditions.add("(LOWER(email) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR phone LIKE ?)");
            params.add(pattern);
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
}
