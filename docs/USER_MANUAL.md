# Hướng dẫn Sử dụng Hệ thống - Car Rental System

## 📋 Mục lục

1. [Tổng quan Hệ thống](#tổng-quan-hệ-thống)
2. [Các Module Chính](#các-module-chính)
3. [Quy trình Nghiệp vụ](#quy-trình-nghiệp-vụ)
4. [API Endpoints](#api-endpoints)
5. [Cấu hình và Cài đặt](#cấu-hình-và-cài-đặt)
6. [Troubleshooting](#troubleshooting)

---

## Tổng quan Hệ thống

Hệ thống quản lý cửa hàng cho thuê xe được xây dựng với kiến trúc microservices, bao gồm 3 module chính:

### 1. Module Quản lý Lỗi Hỏng Phạt
**Service**: `damage-penalty-service` (Port 8080)

Quản lý toàn bộ quy trình liên quan đến hư hỏng xe và các khoản phạt:
- Ghi nhận hư hỏng khi kiểm tra xe
- Tính toán chi phí sửa chữa tự động
- Tạo phạt tự động dựa trên mức độ hư hỏng
- Xử lý thanh toán phạt
- Theo dõi lịch sử

### 2. Module Nhận Trả Xe
**Services**: `rental-service` (Port 8081) + `payment-service` (Port 8082)

Quản lý toàn bộ vòng đời của một lượt thuê xe:
- Đặt xe online hoặc tại chỗ
- Xác nhận booking (sau khi đặt cọc)
- Nhận xe (pickup)
- Trả xe (return)
- Kiểm tra xe
- Hoàn tất và thanh lý hợp đồng

**Sử dụng State Pattern** để quản lý trạng thái:
- Trạng thái Rental: PENDING → CONFIRMED → IN_PROGRESS → INSPECTION → COMPLETED
- Trạng thái Vehicle: AVAILABLE → RESERVED → IN_USE → INSPECTION → AVAILABLE

### 3. Module Thống Kê Doanh Thu
**Service**: `statistics-service` (Port 8083)

Cung cấp báo cáo và phân tích doanh thu:
- Thống kê theo tháng/quý/năm
- Top khách hàng theo doanh thu
- Doanh thu theo dòng xe
- Doanh thu theo đối tác
- Dashboard tổng quan

---

## Các Module Chính

### 🔧 Damage & Penalty Management

#### Tạo Báo cáo Hư hỏng

```bash
POST /api/damage-reports
Content-Type: application/json

{
  "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
  "rentalId": "660e8400-e29b-41d4-a716-446655440001",
  "customerId": "770e8400-e29b-41d4-a716-446655440002",
  "damageType": "SCRATCH",
  "severity": "MINOR",
  "description": "Scratch on front bumper, 5cm long",
  "locationOnVehicle": "FRONT_BUMPER",
  "reportedBy": "STAFF"
}
```

**Damage Types:**
- `SCRATCH` - Trầy xước
- `DENT` - Móp méo
- `BROKEN_PART` - Bộ phận hỏng
- `INTERIOR_DAMAGE` - Hư hỏng nội thất
- `MECHANICAL` - Hỏng cơ khí

**Severity Levels:**
- `MINOR` - Nhẹ (multiplier: 1.0x)
- `MODERATE` - Trung bình (multiplier: 2.0x)
- `MAJOR` - Nghiêm trọng (multiplier: 4.0x)
- `TOTAL_LOSS` - Toàn bộ (multiplier: 10.0x)

**Chi phí sửa chữa được tính tự động:**
```
Repair Cost = Base Cost × Severity Multiplier

Base Costs:
- SCRATCH: 500,000 VND
- DENT: 1,000,000 VND
- BROKEN_PART: 2,000,000 VND
- INTERIOR_DAMAGE: 1,500,000 VND
- MECHANICAL: 3,000,000 VND

Ví dụ: DENT + MODERATE = 1,000,000 × 2.0 = 2,000,000 VND
```

#### Tạo Phạt

```bash
POST /api/penalties
Content-Type: application/json

{
  "rentalId": "660e8400-e29b-41d4-a716-446655440001",
  "customerId": "770e8400-e29b-41d4-a716-446655440002",
  "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
  "penaltyType": "LATE_RETURN",
  "description": "3 days late return",
  "penaltyAmount": 2400000,
  "dueDate": "2024-12-31"
}
```

**Penalty Types:**
- `DAMAGE` - Phạt hư hỏng
- `LATE_RETURN` - Phạt trả xe trễ
- `TRAFFIC_VIOLATION` - Vi phạm giao thông
- `CLEANING` - Phí vệ sinh
- `FUEL` - Phí nhiên liệu
- `OTHER` - Khác

#### Thanh toán Phạt

```bash
POST /api/penalties/{penaltyId}/pay
Content-Type: application/json

{
  "amount": 2400000,
  "paymentMethod": "CREDIT_CARD",
  "transactionId": "txn_123456789"
}
```

---

### 🚗 Rental Management

#### Quy trình Thuê xe Đầy đủ

**Bước 1: Tạo Booking (Online hoặc Walk-in)**

```bash
POST /api/rentals/bookings
Content-Type: application/json

{
  "customerId": "770e8400-e29b-41d4-a716-446655440002",
  "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
  "startDate": "2024-12-01T10:00:00Z",
  "endDate": "2024-12-05T10:00:00Z",
  "pickupLocation": "Hanoi Office - 123 Nguyen Trai",
  "returnLocation": "Hanoi Office - 123 Nguyen Trai"
}

Response:
{
  "rentalId": "...",
  "rentalStatus": "PENDING",
  "dailyRate": 800000,
  "totalDays": 4,
  "subtotal": 3200000,
  "taxAmount": 320000,
  "depositAmount": 3000000,
  "totalAmount": 6520000
}
```

**Bước 2: Thanh toán Deposit**

```bash
POST /api/payments
Content-Type: application/json

{
  "rentalId": "...",
  "customerId": "...",
  "paymentType": "DEPOSIT",
  "amount": 3000000,
  "paymentMethod": "CREDIT_CARD"
}

Response:
{
  "paymentId": "...",
  "paymentStatus": "PENDING",
  "paymentUrl": "https://gateway.com/pay/xxx"
}
```

**Bước 3: Xác nhận Booking (sau khi deposit thành công)**

```bash
POST /api/rentals/{rentalId}/confirm
Content-Type: application/json

{
  "paymentId": "..."
}

Response:
{
  "rentalId": "...",
  "rentalStatus": "CONFIRMED",
  "vehicleStatus": "RESERVED"
}
```

**Bước 4: Nhận xe (Pickup)**

```bash
POST /api/rentals/{rentalId}/pickup
Content-Type: application/json

{
  "startMileage": 15000,
  "fuelLevel": "FULL",
  "pickupPhotos": ["url1", "url2", "url3"],
  "staffId": "staff-001"
}

Response:
{
  "rentalId": "...",
  "rentalStatus": "IN_PROGRESS",
  "vehicleStatus": "IN_USE",
  "pickupTime": "2024-12-01T10:30:00Z"
}
```

**Bước 5: Trả xe (Return)**

```bash
POST /api/rentals/{rentalId}/return
Content-Type: application/json

{
  "endMileage": 15450,
  "fuelLevel": "FULL",
  "returnPhotos": ["url1", "url2", "url3"],
  "staffId": "staff-001"
}

Response:
{
  "rentalId": "...",
  "rentalStatus": "INSPECTION",
  "vehicleStatus": "INSPECTION",
  "returnTime": "2024-12-05T15:30:00Z",
  "mileageDriven": 450
}
```

**Bước 6: Kiểm tra và Hoàn tất**

**Trường hợp 1: Không có hư hỏng**
```bash
POST /api/rentals/{rentalId}/inspection
Content-Type: application/json

{
  "hasDamage": false,
  "inspectionNotes": "Vehicle in good condition",
  "inspectorId": "staff-002"
}

Response:
{
  "rentalId": "...",
  "rentalStatus": "COMPLETED",
  "vehicleStatus": "AVAILABLE",
  "finalAmount": 3520000,
  "refundAmount": 3000000
}
```

**Trường hợp 2: Có hư hỏng**
```bash
POST /api/rentals/{rentalId}/inspection
Content-Type: application/json

{
  "hasDamage": true,
  "damages": [
    {
      "damageType": "SCRATCH",
      "severity": "MINOR",
      "description": "Scratch on door",
      "location": "DOOR_LEFT"
    }
  ],
  "inspectionNotes": "Found scratch on left door",
  "inspectorId": "staff-002"
}

Response:
{
  "rentalId": "...",
  "rentalStatus": "PENALTY_DUE",
  "vehicleStatus": "DAMAGED",
  "damageReports": [...],
  "penalties": [
    {
      "penaltyId": "...",
      "penaltyAmount": 500000,
      "description": "Repair cost for SCRATCH"
    }
  ]
}
```

---

### 📊 Statistics & Reporting

#### Thống kê Doanh thu theo Tháng

```bash
GET /api/statistics/revenue?periodType=MONTH&periodValue=2024-01

Response:
{
  "periodType": "MONTH",
  "periodValue": "2024-01",
  "totalRevenue": 150000000,
  "rentalRevenue": 130000000,
  "penaltyRevenue": 20000000,
  "totalRentals": 150,
  "totalCustomers": 120,
  "averageRentalValue": 1000000
}
```

#### Thống kê theo Quý

```bash
GET /api/statistics/revenue?periodType=QUARTER&periodValue=2024-Q1

Response:
{
  "periodType": "QUARTER",
  "periodValue": "2024-Q1",
  "totalRevenue": 450000000,
  "rentalRevenue": 390000000,
  "penaltyRevenue": 60000000,
  "totalRentals": 450,
  "totalCustomers": 350
}
```

#### Thống kê theo Năm

```bash
GET /api/statistics/revenue?periodType=YEAR&periodValue=2024

Response:
{
  "periodType": "YEAR",
  "periodValue": "2024",
  "totalRevenue": 1800000000,
  "rentalRevenue": 1560000000,
  "penaltyRevenue": 240000000,
  "totalRentals": 1800,
  "totalCustomers": 1200
}
```

#### So sánh Doanh thu

```bash
GET /api/statistics/revenue/compare?startPeriod=2024-01&endPeriod=2024-06&periodType=MONTH

Response:
{
  "periods": [
    {"period": "2024-01", "revenue": 150000000, "rentals": 150},
    {"period": "2024-02", "revenue": 160000000, "rentals": 160},
    {"period": "2024-03", "revenue": 155000000, "rentals": 155},
    {"period": "2024-04", "revenue": 170000000, "rentals": 170},
    {"period": "2024-05", "revenue": 165000000, "rentals": 165},
    {"period": "2024-06", "revenue": 180000000, "rentals": 180}
  ],
  "averageGrowthRate": 3.7
}
```

#### Top Khách hàng theo Doanh thu

```bash
GET /api/statistics/revenue/customers?periodType=YEAR&periodValue=2024&limit=10

Response:
{
  "customers": [
    {
      "customerId": "...",
      "customerName": "Nguyen Van A",
      "totalRevenue": 25000000,
      "totalRentals": 15,
      "averagePerRental": 1666666
    },
    {
      "customerId": "...",
      "customerName": "Tran Thi B",
      "totalRevenue": 22000000,
      "totalRentals": 12,
      "averagePerRental": 1833333
    }
  ]
}
```

#### Doanh thu theo Dòng xe

```bash
GET /api/statistics/revenue/vehicle-categories?periodType=YEAR&periodValue=2024

Response:
{
  "categories": [
    {
      "categoryName": "SUV",
      "totalRevenue": 450000000,
      "totalRentals": 350,
      "revenuePercentage": 35.5
    },
    {
      "categoryName": "Sedan",
      "totalRevenue": 380000000,
      "totalRentals": 520,
      "revenuePercentage": 30.0
    }
  ]
}
```

---

## Cấu hình và Cài đặt

### Cấu hình Environment Variables

Mỗi service cần các biến môi trường sau:

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=damage_penalty_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Redis (cho Statistics Service)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (cho Authentication)
JWT_SECRET=your-secret-key
```

### Cài đặt Database

```sql
-- Tạo databases cho các services
CREATE DATABASE damage_penalty_db;
CREATE DATABASE rental_db;
CREATE DATABASE payment_db;
CREATE DATABASE statistics_db;
CREATE DATABASE customer_db;
CREATE DATABASE vehicle_db;
CREATE DATABASE partner_db;
```

---

## Troubleshooting

### Lỗi thường gặp

**1. Cannot create rental - Vehicle not available**
```
Nguyên nhân: Vehicle đang ở trạng thái RESERVED hoặc IN_USE
Giải pháp: Kiểm tra vehicle status, đảm bảo xe ở trạng thái AVAILABLE
```

**2. Invalid state transition**
```
Nguyên nhân: Cố gắng chuyển trạng thái không hợp lệ
Ví dụ: Từ PENDING → IN_PROGRESS (phải qua CONFIRMED trước)
Giải pháp: Follow đúng quy trình state transitions
```

**3. Payment not completed**
```
Nguyên nhân: Payment gateway chưa xác nhận thanh toán
Giải pháp: Kiểm tra payment status, đợi callback từ gateway
```

**4. Statistics not updating**
```
Nguyên nhân: Event listener không nhận được events
Giải pháp: Kiểm tra RabbitMQ connection, queue bindings
```

### Debug Commands

```bash
# Check service logs
docker-compose logs -f damage-penalty-service

# Check RabbitMQ queues
curl http://localhost:15672/api/queues

# Check Redis cache
redis-cli
> KEYS revenue:*
> GET revenue:MONTH:2024-01

# Check database
psql -h localhost -U postgres -d damage_penalty_db
SELECT * FROM damage_reports WHERE rental_id = '...';
```

---

## Liên hệ Support

Để được hỗ trợ chi tiết hơn, vui lòng xem:
- [ARCHITECTURE.md](ARCHITECTURE.md) - Kiến trúc hệ thống
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Hướng dẫn phát triển
- [API_DESIGN.md](API_DESIGN.md) - Tài liệu API đầy đủ
