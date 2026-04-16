-- MySQL 8+ bootstrap schema for car-rental-system microservices
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS damage_penalty_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS rental_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS payment_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS statistics_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- -----------------------------
-- damage-penalty service schema
-- -----------------------------
USE damage_penalty_db;

CREATE TABLE IF NOT EXISTS damage_reports (
  damage_id BINARY(16) NOT NULL,
  vehicle_id BINARY(16) NOT NULL,
  rental_id BINARY(16) NOT NULL,
  customer_id BINARY(16) NOT NULL,
  damage_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT NULL,
  description TEXT NOT NULL,
  location_on_vehicle VARCHAR(100) DEFAULT NULL,
  repair_cost DECIMAL(10,2) DEFAULT NULL,
  reported_date DATETIME(6) DEFAULT NULL,
  reported_by VARCHAR(50) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'REPORTED',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (damage_id),
  KEY idx_damage_vehicle (vehicle_id),
  KEY idx_damage_rental (rental_id),
  KEY idx_damage_customer (customer_id),
  KEY idx_damage_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS damage_images (
  damage_id BINARY(16) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  PRIMARY KEY (damage_id, image_url),
  CONSTRAINT fk_damage_images_report
    FOREIGN KEY (damage_id) REFERENCES damage_reports (damage_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS penalties (
  penalty_id BINARY(16) NOT NULL,
  damage_id BINARY(16) DEFAULT NULL,
  rental_id BINARY(16) NOT NULL,
  customer_id BINARY(16) NOT NULL,
  vehicle_id BINARY(16) NOT NULL,
  penalty_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  penalty_amount DECIMAL(10,2) NOT NULL,
  penalty_date DATE NOT NULL,
  due_date DATE DEFAULT NULL,
  payment_status VARCHAR(20) DEFAULT 'UNPAID',
  paid_amount DECIMAL(10,2) DEFAULT 0.00,
  payment_date DATE DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (penalty_id),
  KEY idx_penalty_customer (customer_id),
  KEY idx_penalty_rental (rental_id),
  KEY idx_penalty_status (payment_status),
  KEY idx_penalty_damage (damage_id),
  CONSTRAINT fk_penalties_damage_report
    FOREIGN KEY (damage_id) REFERENCES damage_reports (damage_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- rental service DB
-- -----------------
USE rental_db;

CREATE TABLE IF NOT EXISTS rentals (
  rental_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  vehicle_id VARCHAR(36) NOT NULL,
  partner_id VARCHAR(36) DEFAULT NULL,
  start_date DATETIME(6) NOT NULL,
  end_date DATETIME(6) NOT NULL,
  actual_return_date DATETIME(6) DEFAULT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  return_location VARCHAR(255) NOT NULL,
  daily_rate DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) DEFAULT NULL,
  deposit_amount DECIMAL(15,2) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  inspection_notes TEXT DEFAULT NULL,
  has_damage BOOLEAN NOT NULL DEFAULT FALSE,
  damage_report_id VARCHAR(36) DEFAULT NULL,
  penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (rental_id),
  KEY idx_rental_customer (customer_id),
  KEY idx_rental_vehicle (vehicle_id),
  KEY idx_rental_status (status),
  KEY idx_rental_start_date (start_date),
  KEY idx_rental_customer_status (customer_id, status),
  KEY idx_rental_vehicle_status (vehicle_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rental_state_history (
  history_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  from_status VARCHAR(20) DEFAULT NULL,
  to_status VARCHAR(20) NOT NULL,
  changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  notes TEXT DEFAULT NULL,
  PRIMARY KEY (history_id),
  KEY idx_rental_history_rental (rental_id),
  KEY idx_rental_history_changed_at (changed_at),
  KEY idx_rental_history_rental_changed (rental_id, changed_at),
  CONSTRAINT fk_rental_history_rental
    FOREIGN KEY (rental_id) REFERENCES rentals (rental_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------
-- payment service DB
-- ------------------
USE payment_db;

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  issue_date DATETIME(6) NOT NULL,
  due_date DATETIME(6) DEFAULT NULL,
  rental_fee DECIMAL(15,2) DEFAULT NULL,
  deposit_amount DECIMAL(15,2) DEFAULT NULL,
  penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at DATETIME(6) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (invoice_id),
  UNIQUE KEY uq_invoices_invoice_number (invoice_number),
  UNIQUE KEY uq_invoices_rental_id (rental_id),
  KEY idx_invoices_customer (customer_id),
  KEY idx_invoices_is_paid (is_paid),
  KEY idx_invoices_customer_is_paid (customer_id, is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  payment_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) DEFAULT NULL,
  customer_id VARCHAR(36) NOT NULL,
  invoice_id VARCHAR(36) DEFAULT NULL,
  payment_type VARCHAR(30) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  transaction_reference VARCHAR(255) DEFAULT NULL,
  payment_date DATETIME(6) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (payment_id),
  KEY idx_payments_customer (customer_id),
  KEY idx_payments_rental (rental_id),
  KEY idx_payments_status (status),
  KEY idx_payments_type (payment_type),
  KEY idx_payments_payment_date (payment_date),
  KEY idx_payments_customer_status (customer_id, status),
  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices (invoice_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------
-- statistics service DB
-- ---------------------
USE statistics_db;

CREATE TABLE IF NOT EXISTS rental_transactions (
  transaction_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  vehicle_id VARCHAR(36) DEFAULT NULL,
  payment_id VARCHAR(36) DEFAULT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_date DATETIME(6) NOT NULL,
  notes TEXT DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (transaction_id),
  KEY idx_transactions_rental (rental_id),
  KEY idx_transactions_customer (customer_id),
  KEY idx_transactions_transaction_date (transaction_date),
  KEY idx_transactions_type_date (transaction_type, transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revenue_statistics (
  stat_id VARCHAR(36) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  `year` INT NOT NULL,
  `period` INT NOT NULL,
  period_start DATETIME(6) NOT NULL,
  period_end DATETIME(6) NOT NULL,
  total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  rental_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  deposit_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  penalty_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_rentals INT NOT NULL DEFAULT 0,
  completed_rentals INT NOT NULL DEFAULT 0,
  cancelled_rentals INT NOT NULL DEFAULT 0,
  total_penalties INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (stat_id),
  UNIQUE KEY uq_revenue_statistics_period (period_type, `year`, `period`),
  KEY idx_revenue_statistics_period_type_year (period_type, `year`),
  KEY idx_revenue_statistics_period_range (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
