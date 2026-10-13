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
    public Optional<AdminAccount> findByEmail(String email) {
        String sql = "SELECT id, email, password_hash, role, enabled, created_at, updated_at FROM admin_accounts WHERE email = ?";
        try {
            AdminAccount account = jdbcTemplate.queryForObject(sql, rowMapper, email);
            return Optional.ofNullable(account);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
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
    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM admin_accounts", Long.class);
        return count != null ? count : 0L;
    }
}
