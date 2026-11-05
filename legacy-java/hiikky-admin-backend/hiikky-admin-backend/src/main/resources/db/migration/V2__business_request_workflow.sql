CREATE TABLE business_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    owner_email VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(50),
    organization_name VARCHAR(255) NOT NULL,
    organization_email VARCHAR(255) NOT NULL,
    organization_phone VARCHAR(50),
    organization_address VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    pending_identity_hash CHAR(64) UNIQUE,
    decision_reason VARCHAR(1000),
    decided_by_admin_id BIGINT,
    decided_at TIMESTAMP NULL,
    created_owner_id BIGINT,
    created_organization_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_business_requests_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT fk_business_requests_decided_admin
        FOREIGN KEY (decided_by_admin_id) REFERENCES admin_accounts(id),
    CONSTRAINT fk_business_requests_created_owner
        FOREIGN KEY (created_owner_id) REFERENCES business_owners(id),
    CONSTRAINT fk_business_requests_created_organization
        FOREIGN KEY (created_organization_id) REFERENCES organizations(organization_id),
    INDEX idx_business_requests_status_created (status, created_at),
    INDEX idx_business_requests_created (created_at)
);

CREATE TABLE business_request_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_request_id BIGINT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    actor_admin_id BIGINT,
    reason VARCHAR(1000),
    created_owner_id BIGINT,
    created_organization_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_business_request_history_event
        CHECK (event_type IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    CONSTRAINT fk_business_request_history_request
        FOREIGN KEY (business_request_id) REFERENCES business_requests(id),
    CONSTRAINT fk_business_request_history_actor
        FOREIGN KEY (actor_admin_id) REFERENCES admin_accounts(id),
    CONSTRAINT fk_business_request_history_owner
        FOREIGN KEY (created_owner_id) REFERENCES business_owners(id),
    CONSTRAINT fk_business_request_history_organization
        FOREIGN KEY (created_organization_id) REFERENCES organizations(organization_id),
    INDEX idx_business_request_history_request (business_request_id, created_at, id)
);
