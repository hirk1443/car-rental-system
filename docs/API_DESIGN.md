# API Design - Car Rental System

## API Gateway

Base URL: `http://api.car-rental.com/v1`

---

## 1. Damage & Penalty Service APIs

### Base Path: `/damage-penalty`

#### 1.1 Create Damage Report
```http
POST /damage-reports
Content-Type: application/json

{
  "vehicle_id": "uuid",
  "rental_id": "uuid",
  "customer_id": "uuid",
  "damage_type": "SCRATCH",
  "severity": "MINOR",
  "description": "Scratch on front bumper",
  "location_on_vehicle": "FRONT_BUMPER",
  "image_urls": ["url1", "url2"],
  "reported_by": "STAFF"
}

Response 201:
{
  "damage_id": "uuid",
  "status": "REPORTED",
  "created_at": "timestamp"
}
```

#### 1.2 Get Damage Reports
```http
GET /damage-reports?vehicle_id={id}&rental_id={id}&status={status}

Response 200:
{
  "damages": [
    {
      "damage_id": "uuid",
      "vehicle_id": "uuid",
      "rental_id": "uuid",
      "damage_type": "SCRATCH",
      "severity": "MINOR",
      "description": "...",
      "repair_cost": 1500000,
      "status": "REPORTED",
      "reported_date": "timestamp"
    }
  ],
  "total": 10,
  "page": 1,
  "per_page": 20
}
```

#### 1.3 Update Damage Status
```http
PATCH /damage-reports/{damage_id}
Content-Type: application/json

{
  "status": "REPAIRED",
  "repair_cost": 1500000
}

Response 200:
{
  "damage_id": "uuid",
  "status": "REPAIRED",
  "updated_at": "timestamp"
}
```

#### 1.4 Create Penalty
```http
POST /penalties
Content-Type: application/json

{
  "damage_id": "uuid",
  "rental_id": "uuid",
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "penalty_type": "DAMAGE",
  "description": "Repair cost for scratch",
  "penalty_amount": 1500000,
  "due_date": "2024-12-31"
}

Response 201:
{
  "penalty_id": "uuid",
  "penalty_amount": 1500000,
  "payment_status": "UNPAID",
  "created_at": "timestamp"
}
```

#### 1.5 Get Penalties
```http
GET /penalties?customer_id={id}&rental_id={id}&payment_status={status}

Response 200:
{
  "penalties": [
    {
      "penalty_id": "uuid",
      "penalty_type": "DAMAGE",
      "penalty_amount": 1500000,
      "payment_status": "UNPAID",
      "due_date": "2024-12-31"
    }
  ]
}
```

#### 1.6 Pay Penalty
```http
POST /penalties/{penalty_id}/pay
Content-Type: application/json

{
  "amount": 1500000,
  "payment_method": "CREDIT_CARD",
  "transaction_id": "txn_123"
}

Response 200:
{
  "penalty_id": "uuid",
  "payment_status": "PAID",
  "paid_amount": 1500000,
  "payment_date": "timestamp"
}
```

#### 1.7 Get Penalty Rules
```http
GET /penalty-rules

Response 200:
{
  "rules": [
    {
      "rule_id": "uuid",
      "penalty_type": "LATE_RETURN",
      "calculation_method": "DAILY_RATE",
      "percentage": 50,
      "is_active": true
    }
  ]
}
```

---

## 2. Rental Service APIs

### Base Path: `/rentals`

#### 2.1 Create Booking (Online)
```http
POST /bookings
Content-Type: application/json

{
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "start_date": "2024-12-01T10:00:00Z",
  "end_date": "2024-12-05T10:00:00Z",
  "pickup_location": "Hanoi Office",
  "return_location": "Hanoi Office"
}

Response 201:
{
  "rental_id": "uuid",
  "rental_status": "PENDING",
  "daily_rate": 800000,
  "total_days": 4,
  "subtotal": 3200000,
  "deposit_amount": 3000000,
  "total_amount": 6200000
}
```

#### 2.2 Confirm Booking (After deposit paid)
```http
POST /rentals/{rental_id}/confirm
Content-Type: application/json

{
  "payment_id": "uuid"
}

Response 200:
{
  "rental_id": "uuid",
  "rental_status": "CONFIRMED",
  "vehicle_status": "RESERVED"
}
```

#### 2.3 Pickup Vehicle (Walk-in or Scheduled)
```http
POST /rentals/{rental_id}/pickup
Content-Type: application/json

{
  "start_mileage": 15000,
  "fuel_level": "FULL",
  "pickup_photos": ["url1", "url2"],
  "staff_id": "uuid"
}

Response 200:
{
  "rental_id": "uuid",
  "rental_status": "IN_PROGRESS",
  "vehicle_status": "IN_USE",
  "pickup_time": "timestamp"
}
```

#### 2.4 Return Vehicle
```http
POST /rentals/{rental_id}/return
Content-Type: application/json

{
  "end_mileage": 15450,
  "fuel_level": "FULL",
  "return_photos": ["url1", "url2"],
  "staff_id": "uuid"
}

Response 200:
{
  "rental_id": "uuid",
  "rental_status": "INSPECTION",
  "vehicle_status": "INSPECTION",
  "return_time": "timestamp",
  "mileage_driven": 450
}
```

#### 2.5 Complete Inspection
```http
POST /rentals/{rental_id}/inspection
Content-Type: application/json

{
  "has_damage": false,
  "inspection_notes": "Vehicle in good condition",
  "inspector_id": "uuid"
}

Response 200:
{
  "rental_id": "uuid",
  "rental_status": "COMPLETED",
  "vehicle_status": "AVAILABLE",
  "final_amount": 3200000,
  "refund_amount": 3000000
}
```

#### 2.6 Get Rental Details
```http
GET /rentals/{rental_id}

Response 200:
{
  "rental_id": "uuid",
  "customer": {...},
  "vehicle": {...},
  "rental_status": "IN_PROGRESS",
  "start_date": "timestamp",
  "expected_end_date": "timestamp",
  "daily_rate": 800000,
  "total_amount": 3200000,
  "state_history": [...]
}
```

#### 2.7 List Rentals
```http
GET /rentals?customer_id={id}&status={status}&start_date={date}&end_date={date}

Response 200:
{
  "rentals": [...],
  "total": 50,
  "page": 1,
  "per_page": 20
}
```

#### 2.8 Cancel Rental
```http
POST /rentals/{rental_id}/cancel
Content-Type: application/json

{
  "reason": "Customer request",
  "cancellation_fee": 200000
}

Response 200:
{
  "rental_id": "uuid",
  "rental_status": "CANCELLED",
  "refund_amount": 2800000
}
```

---

## 3. Payment Service APIs

### Base Path: `/payments`

#### 3.1 Create Payment
```http
POST /payments
Content-Type: application/json

{
  "rental_id": "uuid",
  "customer_id": "uuid",
  "payment_type": "DEPOSIT",
  "amount": 3000000,
  "payment_method": "CREDIT_CARD"
}

Response 201:
{
  "payment_id": "uuid",
  "payment_status": "PENDING",
  "payment_url": "https://gateway.com/pay/xxx",
  "created_at": "timestamp"
}
```

#### 3.2 Process Payment
```http
POST /payments/{payment_id}/process
Content-Type: application/json

{
  "transaction_id": "txn_123",
  "gateway_response": {...}
}

Response 200:
{
  "payment_id": "uuid",
  "payment_status": "COMPLETED",
  "transaction_id": "txn_123",
  "payment_date": "timestamp"
}
```

#### 3.3 Create Refund
```http
POST /payments/{payment_id}/refund
Content-Type: application/json

{
  "amount": 3000000,
  "reason": "Rental completed without issues"
}

Response 201:
{
  "refund_id": "uuid",
  "original_payment_id": "uuid",
  "refund_amount": 3000000,
  "refund_status": "PENDING"
}
```

#### 3.4 Get Payment History
```http
GET /payments?rental_id={id}&customer_id={id}&payment_type={type}

Response 200:
{
  "payments": [
    {
      "payment_id": "uuid",
      "payment_type": "DEPOSIT",
      "amount": 3000000,
      "payment_status": "COMPLETED",
      "payment_date": "timestamp"
    }
  ]
}
```

#### 3.5 Generate Invoice
```http
POST /invoices
Content-Type: application/json

{
  "rental_id": "uuid",
  "customer_id": "uuid"
}

Response 201:
{
  "invoice_id": "uuid",
  "invoice_number": "INV-2024-001",
  "total_amount": 3200000,
  "invoice_url": "https://..."
}
```

---

## 4. Statistics Service APIs

### Base Path: `/statistics`

#### 4.1 Get Revenue Statistics by Period
```http
GET /revenue?period_type=MONTH&period_value=2024-01
GET /revenue?period_type=QUARTER&period_value=2024-Q1
GET /revenue?period_type=YEAR&period_value=2024

Response 200:
{
  "period_type": "MONTH",
  "period_value": "2024-01",
  "total_revenue": 150000000,
  "rental_revenue": 130000000,
  "penalty_revenue": 20000000,
  "total_rentals": 150,
  "total_customers": 120,
  "average_rental_value": 1000000
}
```

#### 4.2 Get Revenue Comparison
```http
GET /revenue/compare?start_period=2024-01&end_period=2024-06&period_type=MONTH

Response 200:
{
  "periods": [
    {
      "period": "2024-01",
      "revenue": 150000000,
      "rentals": 150
    },
    {
      "period": "2024-02",
      "revenue": 160000000,
      "rentals": 160
    }
  ],
  "growth_rate": 6.67
}
```

#### 4.3 Get Customer Revenue Statistics
```http
GET /revenue/customers?period_type=YEAR&period_value=2024&limit=10&sort=DESC

Response 200:
{
  "period_type": "YEAR",
  "period_value": "2024",
  "customers": [
    {
      "customer_id": "uuid",
      "customer_name": "Nguyen Van A",
      "total_revenue": 25000000,
      "total_rentals": 15,
      "average_per_rental": 1666666
    }
  ],
  "total": 10
}
```

#### 4.4 Get Vehicle Category Revenue Statistics
```http
GET /revenue/vehicle-categories?period_type=YEAR&period_value=2024

Response 200:
{
  "period_type": "YEAR",
  "period_value": "2024",
  "categories": [
    {
      "category_name": "SUV",
      "total_revenue": 450000000,
      "total_rentals": 350,
      "average_per_rental": 1285714,
      "revenue_percentage": 35.5
    },
    {
      "category_name": "Sedan",
      "total_revenue": 380000000,
      "total_rentals": 520,
      "revenue_percentage": 30.0
    }
  ]
}
```

#### 4.5 Get Partner Revenue Statistics
```http
GET /revenue/partners?period_type=QUARTER&period_value=2024-Q1

Response 200:
{
  "period_type": "QUARTER",
  "period_value": "2024-Q1",
  "partners": [
    {
      "partner_id": "uuid",
      "partner_name": "ABC Car Rental",
      "total_revenue": 85000000,
      "commission_paid": 42500000,
      "net_revenue": 42500000,
      "total_rentals": 85,
      "commission_rate": 50
    }
  ]
}
```

#### 4.6 Get Dashboard Summary
```http
GET /dashboard?period_type=MONTH&period_value=2024-01

Response 200:
{
  "overview": {
    "total_revenue": 150000000,
    "total_rentals": 150,
    "active_rentals": 25,
    "available_vehicles": 45
  },
  "revenue_breakdown": {
    "rental_revenue": 130000000,
    "penalty_revenue": 20000000
  },
  "top_customers": [...],
  "top_vehicle_categories": [...],
  "monthly_trend": [...]
}
```

---

## Supporting Service APIs

### 5. Customer Service - `/customers`
### 6. Vehicle Service - `/vehicles`
### 7. Partner Service - `/partners`

(Các API cơ bản: CRUD operations, search, filter)

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot pickup vehicle in current state",
    "details": {...}
  }
}
```

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

## Authentication & Authorization

All APIs require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

Role-based access control:
- `ADMIN`: Full access
- `STAFF`: Rental operations, inspection
- `CUSTOMER`: Own rentals only
- `PARTNER`: Own vehicles and contracts

## Rate Limiting

- 100 requests per minute per user
- 1000 requests per minute per IP

## Webhooks

Services can register webhooks for events:
- `rental.created`
- `rental.completed`
- `payment.completed`
- `damage.reported`
- `penalty.created`
