CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    max_users INT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS subscribers (
    subscriber_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    subscription_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT fk_test_subscriber_org FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id),
    CONSTRAINT fk_test_subscriber_subscription FOREIGN KEY (subscription_id)
        REFERENCES subscriptions(subscription_id)
);

CREATE TABLE IF NOT EXISTS billing (
    billing_id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    subscriber_id INT NOT NULL,
    subscription_id INT NOT NULL,
    payment_name VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_amount DECIMAL(12, 2),
    discount_id INT,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    CONSTRAINT fk_test_billing_org FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id),
    CONSTRAINT fk_test_billing_subscriber FOREIGN KEY (subscriber_id)
        REFERENCES subscribers(subscriber_id),
    CONSTRAINT fk_test_billing_subscription FOREIGN KEY (subscription_id)
        REFERENCES subscriptions(subscription_id)
);

CREATE TABLE IF NOT EXISTS courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(15) NOT NULL UNIQUE,
    course_name VARCHAR(50) NOT NULL,
    duration INT NOT NULL,
    duration_unit VARCHAR(20) NOT NULL DEFAULT 'MONTHS',
    course_fee DECIMAL(12, 2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description VARCHAR(300),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_installments (
    installment_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    installment_number INT NOT NULL,
    installment_name VARCHAR(150) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_days INT NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_installment_course FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
);
