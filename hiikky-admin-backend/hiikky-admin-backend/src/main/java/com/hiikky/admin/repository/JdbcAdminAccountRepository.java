package com.hiikky.admin.repository;

import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcAdminAccountRepository implements AdminAccountRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<AdminAccount> rowMapper = (rs, rowNum) -> {
        AdminAccount account = new AdminAccount();
        account.setId(rs.getLong("id"));
        account.setEmail(rs.getString("email"));
        account.setPasswordHash(rs.getString("password_hash"));
        account.setRole(AdminRole.valueOf(rs.getString("role")));
        account.setEnabled(rs.getBoolean("enabled"));
        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) {
            account.setCreatedAt(createdAt.toLocalDateTime());
        }
        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) {
            account.setUpdatedAt(updatedAt.toLocalDateTime());
        }
        return account;
    };

    public JdbcAdminAccountRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<AdminAccount> findById(Long id) {
        String sql = "SELECT id, email, password_hash, role, enabled, created_at, updated_at FROM admin_accounts WHERE id = ?";
        try {
            AdminAccount account = jdbcTemplate.queryForObject(sql, rowMapper, id);
            return Optional.ofNullable(account);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<AdminAccount> findByEmail(String email) {
        String sql = "SELECT id, email, password_hash, role, enabled, created_at, updated_at FROM admin_accounts WHERE LOWER(email) = LOWER(?)";
        try {
            AdminAccount account = jdbcTemplate.queryForObject(sql, rowMapper, email);
            return Optional.ofNullable(account);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    public boolean existsByEmail(String email) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM admin_accounts WHERE LOWER(email) = LOWER(?)", Long.class, email);
        return count != null && count > 0;
    }

    @Override
    public boolean existsByEmailAndIdNot(String email, Long id) {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM admin_accounts WHERE LOWER(email) = LOWER(?) AND id <> ?", Long.class, email, id);
        return count != null && count > 0;
    }

    @Override
    public AdminAccount save(AdminAccount adminAccount) {
        LocalDateTime now = LocalDateTime.now();
        if (adminAccount.getId() == null) {
            String sql = "INSERT INTO admin_accounts (email, password_hash, role, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, new String[]{"id"});
                ps.setString(1, adminAccount.getEmail());
                ps.setString(2, adminAccount.getPasswordHash());
                ps.setString(3, adminAccount.getRole().name());
                ps.setBoolean(4, adminAccount.isEnabled());
                ps.setTimestamp(5, Timestamp.valueOf(now));
                ps.setTimestamp(6, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);

            if (keyHolder.getKey() != null) {
                adminAccount.setId(keyHolder.getKey().longValue());
            }
            adminAccount.setCreatedAt(now);
            adminAccount.setUpdatedAt(now);
            return adminAccount;
        } else {
            String sql = "UPDATE admin_accounts SET email = ?, password_hash = ?, role = ?, enabled = ?, updated_at = ? WHERE id = ?";
            jdbcTemplate.update(sql,
                    adminAccount.getEmail(),
                    adminAccount.getPasswordHash(),
                    adminAccount.getRole().name(),
                    adminAccount.isEnabled(),
                    Timestamp.valueOf(now),
                    adminAccount.getId());
            adminAccount.setUpdatedAt(now);
            return adminAccount;
        }
    }

    @Override
    public boolean deleteById(Long id) {
        int rows = jdbcTemplate.update("DELETE FROM admin_accounts WHERE id = ?", id);
        return rows > 0;
    }

    @Override
    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM admin_accounts", Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public long countActiveSuperAdmins() {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM admin_accounts WHERE role = ? AND enabled = TRUE",
                Long.class,
                AdminRole.SUPER_ADMIN.name()
        );
        return count != null ? count : 0L;
    }

    @Override
    public long countWithFilters(Boolean enabled, AdminRole role, String search) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM admin_accounts");
        java.util.List<Object> params = new java.util.ArrayList<>();
        java.util.List<String> conditions = new java.util.ArrayList<>();
        if (enabled != null) {
            conditions.add("enabled = ?");
            params.add(enabled);
        }
        if (role != null) {
            conditions.add("role = ?");
            params.add(role.name());
        }
        if (search != null && !search.trim().isEmpty()) {
            conditions.add("LOWER(email) LIKE ?");
            params.add("%" + search.trim().toLowerCase() + "%");
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        Long count = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count : 0L;
    }

    @Override
    public List<AdminAccount> findAll(int offset, int limit, Boolean enabled, AdminRole role) {
        return findAll(offset, limit, enabled, role, null);
    }

    @Override
    public List<AdminAccount> findAll(int offset, int limit, Boolean enabled, AdminRole role, String search) {
        StringBuilder sql = new StringBuilder("SELECT id, email, password_hash, role, enabled, created_at, updated_at FROM admin_accounts");
        java.util.List<Object> params = new java.util.ArrayList<>();
        java.util.List<String> conditions = new java.util.ArrayList<>();
        if (enabled != null) {
            conditions.add("enabled = ?");
            params.add(enabled);
        }
        if (role != null) {
            conditions.add("role = ?");
            params.add(role.name());
        }
        if (search != null && !search.trim().isEmpty()) {
            conditions.add("LOWER(email) LIKE ?");
            params.add("%" + search.trim().toLowerCase() + "%");
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
