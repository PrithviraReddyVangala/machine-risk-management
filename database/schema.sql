CREATE DATABASE IF NOT EXISTS machine_risk;
USE machine_risk;

CREATE TABLE IF NOT EXISTS machine_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_name VARCHAR(100) NOT NULL UNIQUE,
    field_type ENUM('text', 'number', 'dropdown') NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    options_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machine_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT NOT NULL,
    field_id INT NOT NULL,
    field_value TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_machine_field (machine_id, field_id),
    CONSTRAINT fk_machine_values_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    CONSTRAINT fk_machine_values_field
        FOREIGN KEY (field_id) REFERENCES machine_fields(id) ON DELETE CASCADE
);

INSERT IGNORE INTO machine_fields (field_name, field_type, is_required, options_json)
VALUES
('Machine Name', 'text', TRUE, NULL),
('Temperature', 'number', TRUE, NULL),
('Pressure', 'number', TRUE, NULL),
('Vibration', 'dropdown', TRUE, JSON_ARRAY('Low', 'Medium', 'High'));
