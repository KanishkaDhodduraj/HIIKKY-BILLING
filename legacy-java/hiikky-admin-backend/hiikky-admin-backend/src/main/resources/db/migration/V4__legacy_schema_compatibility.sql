ALTER TABLE organizations
    MODIFY COLUMN organization_name VARCHAR(255) NOT NULL,
    MODIFY COLUMN organization_owner VARCHAR(100) NULL,
    MODIFY COLUMN email VARCHAR(255) NOT NULL,
    MODIFY COLUMN phone VARCHAR(50) NULL,
    MODIFY COLUMN address VARCHAR(255) NULL;

CREATE INDEX idx_notification_created_at ON notification (created_at);
CREATE INDEX idx_organizations_created_at ON organizations (created_at);
