# 🚀 QUICK START GUIDE - Car Rental Microservices

## 📋 Yêu cầu hệ thống

### Phần mềm cần cài đặt:
1. **Java 17+** - [Download](https://adoptium.net/)
2. **Maven 3.8+** - [Download](https://maven.apache.org/download.cgi)
3. **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
4. **RabbitMQ** - [Download](https://www.rabbitmq.com/download.html)
5. **Redis** (cho Statistics Service) - [Download](https://redis.io/download)

---

## 🗄️ **BƯỚC 1: Setup Databases**

### Tạo databases trong PostgreSQL:

```sql
-- Kết nối vào PostgreSQL
psql -U postgres

-- Tạo 4 databases
CREATE DATABASE damage_penalty_db;
CREATE DATABASE rental_db;
CREATE DATABASE payment_db;
CREATE DATABASE statistics_db;

-- Kiểm tra
\l

-- Thoát
\q
```

### Hoặc dùng pgAdmin:
1. Mở pgAdmin
2. Right-click "Databases" → Create → Database
3. Tạo 4 databases như trên

---

## 🐰 **BƯỚC 2: Start RabbitMQ**

### Windows:
```cmd
# Mở RabbitMQ Management Plugin (một lần duy nhất)
rabbitmq-plugins enable rabbitmq_management

# Start RabbitMQ service
# Vào Services → tìm "RabbitMQ" → Start

# Hoặc dùng command
net start RabbitMQ
```

### Linux/Mac:
```bash
# Start RabbitMQ
rabbitmq-server

# Hoặc chạy background
rabbitmq-server -detached
```

### Kiểm tra:
- RabbitMQ Management UI: http://localhost:15672
- Username: `guest`
- Password: `guest`

---

## 🔴 **BƯỚC 3: Start Redis** (cho Statistics Service)

### Windows:
```cmd
# Nếu cài qua MSI, chạy:
redis-server

# Hoặc
redis-server.exe
```

### Linux/Mac:
```bash
redis-server
```

### Kiểm tra:
```bash
redis-cli ping
# Phải trả về: PONG
```

---

## 🏗️ **BƯỚC 4: Build All Services**

Mở terminal/cmd tại thư mục dự án:

```bash
cd C:\Coding_Stuff\car-rental-system\services

# Build từng service
cd damage-penalty-service
mvn clean install
cd ..

cd rental-service
mvn clean install
cd ..

cd payment-service
mvn clean install
cd ..

cd statistics-service
mvn clean install
cd ..
```

**Lưu ý:** Lần build đầu tiên sẽ lâu vì Maven phải download dependencies (~5-10 phút).

---

## ▶️ **BƯỚC 5: Run Services**

Mở **4 terminals riêng biệt** và chạy:

### Terminal 1 - Damage-Penalty Service
```bash
cd C:\Coding_Stuff\car-rental-system\services\damage-penalty-service
mvn spring-boot:run
```
Đợi đến khi thấy: `Started DamagePenaltyServiceApplication in X seconds`

### Terminal 2 - Rental Service
```bash
cd C:\Coding_Stuff\car-rental-system\services\rental-service
mvn spring-boot:run
```
Đợi: `Started RentalServiceApplication in X seconds`

### Terminal 3 - Payment Service
```bash
cd C:\Coding_Stuff\car-rental-system\services\payment-service
mvn spring-boot:run
```
Đợi: `Started PaymentServiceApplication in X seconds`

### Terminal 4 - Statistics Service
```bash
cd C:\Coding_Stuff\car-rental-system\services\statistics-service
mvn spring-boot:run
```
Đợi: `Started StatisticsServiceApplication in X seconds`

---

## ✅ **BƯỚC 6: Kiểm tra Services đang chạy**

### Kiểm tra ports:
```bash
# Windows
netstat -ano | findstr "8080 8081 8082 8083"

# Linux/Mac
lsof -i :8080
lsof -i :8081
lsof -i :8082
lsof -i :8083
```

### Health check qua browser hoặc curl:

```bash
# Damage-Penalty Service
curl http://localhost:8080/api/damage-reports

# Rental Service
curl http://localhost:8081/api/rentals

# Payment Service
curl http://localhost:8082/api/payments

# Statistics Service
curl http://localhost:8083/api/statistics/revenue/yearly/2024
```

Nếu trả về `[]` (mảng rỗng) hoặc JSON data → **SUCCESS!** ✅

---

## 🧪 **BƯỚC 7: Test API với Postman hoặc cURL**

### 1. Tạo một Rental (Đơn thuê xe)

```bash
curl -X POST http://localhost:8081/api/rentals \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST001",
    "vehicleId": "VEH001",
    "startDate": "2024-04-15T09:00:00",
    "endDate": "2024-04-20T18:00:00",
    "pickupLocation": "Ha Noi Office",
    "returnLocation": "Ha Noi Office",
    "dailyRate": 1500000,
    "depositAmount": 3000000
  }'
```

**Response:** Rental object với `rentalId`, status = `PENDING`

### 2. Xác nhận Rental

```bash
# Thay {rentalId} bằng ID từ bước 1
curl -X PATCH http://localhost:8081/api/rentals/{rentalId}/confirm
```

**Response:** Status thay đổi thành `CONFIRMED`

### 3. Giao xe (Pickup)

```bash
curl -X PATCH http://localhost:8081/api/rentals/{rentalId}/pickup
```

**Response:** Status → `IN_PROGRESS`

### 4. Trả xe (Return)

```bash
curl -X PATCH http://localhost:8081/api/rentals/{rentalId}/return
```

**Response:** Status → `INSPECTION`

### 5. Báo cáo hư hỏng (nếu có)

```bash
curl -X POST http://localhost:8080/api/damage-reports \
  -H "Content-Type: application/json" \
  -d '{
    "rentalId": "{rentalId}",
    "vehicleId": "VEH001",
    "damageType": "DENT",
    "severity": "MODERATE",
    "description": "Bị móp cửa xe bên phải",
    "location": "Cửa trước bên phải"
  }'
```

**Response:** Damage report được tạo + Penalty tự động tạo

### 6. Hoàn thành kiểm tra

```bash
curl -X PATCH http://localhost:8081/api/rentals/{rentalId}/inspection \
  -H "Content-Type: application/json" \
  -d '{
    "hasDamage": true,
    "inspectionNotes": "Found dent on right door",
    "damageReportId": "{damageReportId}"
  }'
```

**Response:** Status → `PENALTY_DUE`

### 7. Tạo Payment

```bash
curl -X POST http://localhost:8082/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "rentalId": "{rentalId}",
    "customerId": "CUST001",
    "paymentType": "PENALTY",
    "amount": 2000000,
    "paymentMethod": "BANK_TRANSFER",
    "description": "Payment for damage penalty"
  }'
```

### 8. Process Payment

```bash
curl -X PATCH http://localhost:8082/api/payments/{paymentId}/process \
  -H "Content-Type: application/json" \
  -d '{
    "transactionReference": "TXN123456"
  }'
```

### 9. Hoàn thành Rental

```bash
curl -X PATCH http://localhost:8081/api/rentals/{rentalId}/complete
```

**Response:** Status → `COMPLETED`

### 10. Xem thống kê doanh thu

```bash
# Doanh thu tháng 4/2024
curl http://localhost:8083/api/statistics/revenue/monthly/2024/4

# Doanh thu quý 2/2024
curl http://localhost:8083/api/statistics/revenue/quarterly/2024/2

# Doanh thu năm 2024
curl http://localhost:8083/api/statistics/revenue/yearly/2024
```

---

## 📊 **BƯỚC 8: Kiểm tra RabbitMQ Events**

1. Mở RabbitMQ Management: http://localhost:15672
2. Login: `guest` / `guest`
3. Vào tab **Queues**
4. Bạn sẽ thấy các queues:
   - `damage.reported.queue`
   - `penalty.created.queue`
   - `rental.created.queue`
   - `rental.completed.queue`
   - `payment.completed.queue`
   - etc.

5. Click vào mỗi queue để xem messages

---

## 🔍 **Troubleshooting**

### Lỗi: "Port already in use"
```bash
# Kiểm tra port đang được dùng
# Windows
netstat -ano | findstr "8080"
# Kill process
taskkill /PID [PID_NUMBER] /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### Lỗi: "Could not connect to database"
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra username/password trong `application.yml`
- Kiểm tra database đã được tạo chưa

### Lỗi: "RabbitMQ connection refused"
- Kiểm tra RabbitMQ service đang chạy
- Kiểm tra port 5672 (AMQP) và 15672 (Management UI)

### Lỗi: "Redis connection refused"
- Kiểm tra Redis server đang chạy
- Chạy: `redis-cli ping` (phải trả về PONG)

### Lỗi build Maven
```bash
# Xóa cache và build lại
mvn clean
rm -rf ~/.m2/repository  # Linux/Mac
# hoặc xóa thủ công C:\Users\[username]\.m2\repository trên Windows
mvn clean install -U
```

---

## 📁 **Cấu trúc Project**

```
C:\Coding_Stuff\car-rental-system\
├── services/
│   ├── damage-penalty-service/    (Port 8080)
│   ├── rental-service/            (Port 8081)
│   ├── payment-service/           (Port 8082)
│   └── statistics-service/        (Port 8083)
├── docs/                          (11 documentation files)
├── README.md
├── PROJECT_SUMMARY.md
├── CODE_SUMMARY.md
├── SERVICES_IMPLEMENTATION_COMPLETE.md
└── QUICK_START_GUIDE.md          (This file)
```

---

## 🎯 **Next Steps**

Sau khi chạy thành công 4 services, bạn có thể:

1. **Test full workflow** theo hướng dẫn ở Bước 7
2. **Xem logs** để hiểu event flow
3. **Check RabbitMQ** để thấy messages được publish
4. **View Redis cache** cho statistics
5. **Explore APIs** với Postman collection
6. **Read documentation** trong thư mục `docs/`

---

## 📞 **Ports Summary**

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| Damage-Penalty | 8080 | damage_penalty_db | Quản lý hư hỏng & phạt |
| Rental | 8081 | rental_db | Quản lý đơn thuê (State Pattern) |
| Payment | 8082 | payment_db | Thanh toán & hóa đơn |
| Statistics | 8083 | statistics_db | Thống kê doanh thu |
| PostgreSQL | 5432 | - | Database |
| RabbitMQ | 5672 | - | Message broker |
| RabbitMQ UI | 15672 | - | Management console |
| Redis | 6379 | - | Cache |

---

## ✅ **Checklist**

- [ ] Java 17+ installed
- [ ] Maven installed
- [ ] PostgreSQL installed & running
- [ ] 4 databases created
- [ ] RabbitMQ installed & running
- [ ] Redis installed & running
- [ ] All services built successfully
- [ ] All services running on correct ports
- [ ] Test API calls working
- [ ] RabbitMQ queues visible
- [ ] Statistics cache working

**Nếu tất cả checklist đều ✅ → BẠN ĐÃ SETUP THÀNH CÔNG!** 🎉

---

## 📚 **Documentation**

Đọc thêm chi tiết:
- `SERVICES_IMPLEMENTATION_COMPLETE.md` - Tổng quan implementation
- `docs/ARCHITECTURE.md` - Kiến trúc hệ thống
- `docs/API_DESIGN.md` - Chi tiết APIs
- `docs/STATE_PATTERN.md` - State Pattern implementation
- `docs/DATABASE_DESIGN.md` - Database schemas
- `docs/USER_MANUAL.md` - Hướng dẫn sử dụng

---

**CHÚC BẠN SUCCESS!** 🚀
