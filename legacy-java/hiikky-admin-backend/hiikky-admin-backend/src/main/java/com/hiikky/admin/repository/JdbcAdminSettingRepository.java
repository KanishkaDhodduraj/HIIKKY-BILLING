package com.hiikky.admin.repository;

import com.hiikky.admin.model.PublicRegistrationRateLimitSetting;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class JdbcAdminSettingRepository implements AdminSettingRepository {

    private static final String PUBLIC_REGISTRATION_LIMIT_KEY = "public_registration_max_submissions";

    private final JdbcTemplate jdbcTemplate;

    public JdbcAdminSettingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<PublicRegistrationRateLimitSetting> findPublicRegistrationRateLimit() {
        List<PublicRegistrationRateLimitSetting> settings = jdbcTemplate.query("""
                        SELECT setting_value, updated_at, updated_by_admin_id
                        FROM admin_settings
                        WHERE setting_key = ?
                        """,
                (rs, rowNum) -> {
                    int maxSubmissions;
                    try {
                        maxSubmissions = Integer.parseInt(rs.getString("setting_value"));
                    } catch (NumberFormatException exception) {
                        throw new IllegalStateException(
                                "Stored public registration rate limit setting is not an integer", exception);
                    }
                    long updaterId = rs.getLong("updated_by_admin_id");
                    Long updatedByAdminId = rs.wasNull() ? null : updaterId;
                    return new PublicRegistrationRateLimitSetting(
                            maxSubmissions,
                            rs.getTimestamp("updated_at").toLocalDateTime(),
                            updatedByAdminId);
                },
                PUBLIC_REGISTRATION_LIMIT_KEY);
        return settings.stream().findFirst();
    }

    @Override
    public void updatePublicRegistrationMaxSubmissions(int maxSubmissions, Long updatedByAdminId) {
        int updated = jdbcTemplate.update("""
                        UPDATE admin_settings
                        SET setting_value = ?, updated_by_admin_id = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE setting_key = ?
                        """,
                String.valueOf(maxSubmissions), updatedByAdminId, PUBLIC_REGISTRATION_LIMIT_KEY);
        if (updated != 1) {
            throw new IllegalStateException("Public registration rate limit setting was not updated");
        }
    }
}
