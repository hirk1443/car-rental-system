# Thiết kế Cơ sở dữ liệu (Database Design)

## Kiến trúc Database per Service

Mỗi microservice có database riêng theo nguyên tắc Database per Service Pattern.

---

## 1. Customer Service Database

### Table: customers
```sql
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    identity_card VARCHAR(50) UNIQUE NOT NULL,
    driver_license VARCHAR(50) NOT NULL,
    address TEXT,
    date_of_birth DATE,
    customer_type VARCHAR(20) DEFAULT 'INDIVIDUAL', -- INDIVIDUAL, CORPORATE
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, BLACKLISTED
    total_rentals INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_phone ON customers(phone);
CREATE INDEX idx_customer_status ON customers(status);
```

### Table: collateral_assets (Tài sản đảm bảo)
```sql
CREATE TABLE collateral_assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    asset_type VARCHAR(50) NOT NULL, -- ID_CARD, PASSPORT, PROPERTY_DEED, VEHICLE_REGISTRATION
    asset_description TEXT,
    asset_value DECIMAL(15,2),
    image_urls TEXT[], -- Array of image URLs
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, RETURNED, LOST
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP
);

CREATE INDEX idx_collateral_customer ON collateral_assets(customer_id);
```

---

## 2. Vehicle Service Database

### Table: vehicles
```sql
CREATE TABLE vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(50),
    seat_capacity INT NOT NULL,
    transmission VARCHAR(20), -- MANUAL, AUTOMATIC
    fuel_type VARCHAR(20), -- GASOLINE, DIESEL, ELECTRIC, HYBRID
    owner_type VARCHAR(20) NOT NULL, -- OWNED, PARTNER
    partner_id UUID, -- NULL if OWNED
    daily_rate DECIMAL(10,2) NOT NULL,
    current_mileage INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, RENTED, MAINTENANCE, DAMAGED
    state VARCHAR(30) DEFAULT 'AVAILABLE_STATE', -- For State Pattern
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicle_status ON vehicles(status);
CREATE INDEX idx_vehicle_owner_type ON vehicles(owner_type);
CREATE INDEX idx_vehicle_partner ON vehicles(partner_id);
```

### Table: vehicle_categories
```sql
CREATE TABLE vehicle_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_daily_rate DECIMAL(10,2),
    total_revenue DECIMAL(15,2) DEFAULT 0
);
```

### Table: vehicle_maintenance_history
```sql
CREATE TABLE vehicle_maintenance_history (
    maintenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(vehicle_id),
    maintenance_type VARCHAR(50), -- ROUTINE, REPAIR, INSPECTION
    description TEXT,
    cost DECIMAL(10,2),
    maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Partner Service Database

### Table: partners
```sql
CREATE TABLE partners (
    partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    tax_code VARCHAR(50),
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    contract_status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, TERMINATED
    total_vehicles INT DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: partner_contracts
```sql
CREATE TABLE partner_contracts (
    contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(partner_id),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    revenue_share_percentage DECIMAL(5,2), -- Partner gets this % of rental revenue
    payment_cycle VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, QUARTERLY, BATCH
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, TERMINATED
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    terminated_at TIMESTAMP
);
```

### Table: partner_payments
```sql
CREATE TABLE partner_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(partner_id),
    contract_id UUID REFERENCES partner_contracts(contract_id),
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    total_revenue DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE,
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Damage & Penalty Service Database

### Table: damage_reports
```sql
CREATE TABLE damage_reports (
    damage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    rental_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    damage_type VARCHAR(50) NOT NULL, -- SCRATCH, DENT, BROKEN_PART, INTERIOR_DAMAGE, MECHANICAL
    severity VARCHAR(20) DEFAULT 'MINOR', -- MINOR, MODERATE, MAJOR, TOTAL_LOSS
    description TEXT NOT NULL,
    location_on_vehicle VARCHAR(100), -- FRONT_BUMPER, DOOR_LEFT, WINDSHIELD, etc.
    image_urls TEXT[], -- Array of damage photos
    repair_cost DECIMAL(10,2),
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reported_by VARCHAR(50), -- CUSTOMER, STAFF, INSPECTION
    status VARCHAR(20) DEFAULT 'REPORTED' -- REPORTED, UNDER_REVIEW, REPAIRED, CLOSED
);

CREATE INDEX idx_damage_vehicle ON damage_reports(vehicle_id);
CREATE INDEX idx_damage_rental ON damage_reports(rental_id);
CREATE INDEX idx_damage_customer ON damage_reports(customer_id);
CREATE INDEX idx_damage_status ON damage_reports(status);
```

### Table: penalties
```sql
CREATE TABLE penalties (
    penalty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    damage_id UUID REFERENCES damage_reports(damage_id),
    rental_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    penalty_type VARCHAR(50) NOT NULL, -- DAMAGE, LATE_RETURN, TRAFFIC_VIOLATION, CLEANING, FUEL, OTHER
    description TEXT NOT NULL,
    penalty_amount DECIMAL(10,2) NOT NULL,
    penalty_date DATE NOT NULL,
    due_date DATE,
    payment_status VARCHAR(20) DEFAULT 'UNPAID', -- UNPAID, PARTIALLY_PAID, PAID, WAIVED
    paid_amount DECIMAL(10,2) DEFAULT 0,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_penalty_customer ON penalties(customer_id);
CREATE INDEX idx_penalty_rental ON penalties(rental_id);
CREATE INDEX idx_penalty_status ON penalties(payment_status);
```

### Table: penalty_rules
```sql
CREATE TABLE penalty_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    penalty_type VARCHAR(50) NOT NULL,
    description TEXT,
    calculation_method VARCHAR(20), -- FIXED, PERCENTAGE, DAILY_RATE
    base_amount DECIMAL(10,2),
    percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Rental Service Database

### Table: rentals
```sql
CREATE TABLE rentals (
    rental_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    booking_type VARCHAR(20) DEFAULT 'ONLINE', -- ONLINE, WALK_IN
    start_date TIMESTAMP NOT NULL,
    expected_end_date TIMESTAMP NOT NULL,
    actual_end_date TIMESTAMP,
    pickup_location VARCHAR(255),
    return_location VARCHAR(255),
    start_mileage INT,
    end_mileage INT,
    rental_status VARCHAR(30) DEFAULT 'PENDING', -- State Pattern states
    daily_rate DECIMAL(10,2) NOT NULL,
    total_days INT,
    subtotal DECIMAL(12,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2),
    deposit_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rental_customer ON rentals(customer_id);
CREATE INDEX idx_rental_vehicle ON rentals(vehicle_id);
CREATE INDEX idx_rental_status ON rentals(rental_status);
CREATE INDEX idx_rental_dates ON rentals(start_date, expected_end_date);
```

### Table: rental_state_history (State Pattern tracking)
```sql
CREATE TABLE rental_state_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(rental_id),
    from_state VARCHAR(30),
    to_state VARCHAR(30) NOT NULL,
    transition_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(50), -- USER_ID or SYSTEM
    notes TEXT
);

CREATE INDEX idx_state_history_rental ON rental_state_history(rental_id);
```

---

## 6. Payment Service Database

### Table: payments
```sql
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    payment_type VARCHAR(30) NOT NULL, -- DEPOSIT, RENTAL_FEE, PENALTY, REFUND
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30), -- CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, E_WALLET
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, REFUNDED
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP,
    payment_gateway VARCHAR(50),
    gateway_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_rental ON payments(rental_id);
CREATE INDEX idx_payment_customer ON payments(customer_id);
CREATE INDEX idx_payment_status ON payments(payment_status);
CREATE INDEX idx_payment_date ON payments(payment_date);
```

### Table: invoices
```sql
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'UNPAID', -- UNPAID, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Statistics Service Database

### Table: revenue_statistics
```sql
CREATE TABLE revenue_statistics (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(10) NOT NULL, -- MONTH, QUARTER, YEAR
    period_value VARCHAR(20) NOT NULL, -- 2024-01, 2024-Q1, 2024
    total_revenue DECIMAL(15,2) DEFAULT 0,
    rental_revenue DECIMAL(15,2) DEFAULT 0,
    penalty_revenue DECIMAL(15,2) DEFAULT 0,
    total_rentals INT DEFAULT 0,
    total_customers INT DEFAULT 0,
    total_vehicles_used INT DEFAULT 0,
    average_rental_value DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period_type, period_value)
);

CREATE INDEX idx_revenue_period ON revenue_statistics(period_type, period_value);
```

### Table: customer_revenue_stats
```sql
CREATE TABLE customer_revenue_stats (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    period_type VARCHAR(10) NOT NULL,
    period_value VARCHAR(20) NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_rentals INT DEFAULT 0,
    UNIQUE(customer_id, period_type, period_value)
);
```

### Table: vehicle_category_revenue_stats
```sql
CREATE TABLE vehicle_category_revenue_stats (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    period_type VARCHAR(10) NOT NULL,
    period_value VARCHAR(20) NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_rentals INT DEFAULT 0,
    UNIQUE(category_name, period_type, period_value)
);
```

### Table: partner_revenue_stats
```sql
CREATE TABLE partner_revenue_stats (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL,
    period_type VARCHAR(10) NOT NULL,
    period_value VARCHAR(20) NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    commission_paid DECIMAL(15,2) DEFAULT 0,
    net_revenue DECIMAL(15,2) DEFAULT 0,
    total_rentals INT DEFAULT 0,
    UNIQUE(partner_id, period_type, period_value)
);
```

---

## Quan hệ giữa các Services (Inter-Service Relationships)

Services giao tiếp với nhau thông qua:
1. **REST API calls** - cho synchronous communication
2. **Message Queue (RabbitMQ/Kafka)** - cho asynchronous events
3. **Shared data được đồng bộ qua events**

### Event-Driven Architecture

```
Rental Created → Update Vehicle Status (RENTED)
Rental Completed → Update Vehicle Status (AVAILABLE)
Rental Completed → Trigger Statistics Update
Payment Completed → Update Rental Status
Damage Reported → Create Penalty
Penalty Paid → Update Customer Statistics
```

## Indexes và Performance Optimization

- Tất cả foreign keys đều có indexes
- Composite indexes cho queries phổ biến
- Partitioning cho bảng lớn (theo time-based)
- Read replicas cho Statistics Service

## Backup và Recovery

- Daily automated backups
- Point-in-time recovery enabled
- Cross-region replication cho production
