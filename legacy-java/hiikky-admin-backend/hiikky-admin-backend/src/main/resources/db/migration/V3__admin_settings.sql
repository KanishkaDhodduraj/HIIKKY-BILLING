CREATE TABLE admin_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_by_admin_id BIGINT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_settings_updated_by
        FOREIGN KEY (updated_by_admin_id) REFERENCES admin_accounts(id) ON DELETE SET NULL
);

INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('public_registration_max_submissions', '10');
