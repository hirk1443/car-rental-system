# Damage & Penalty Management Service

## ✅ Code Java đã có

Service này đã được implement đầy đủ với Java Spring Boot:

### 📁 Cấu trúc đã tạo:

```
damage-penalty-service/
├── pom.xml                                    ✅ Maven dependencies
├── src/
│   ├── main/
│   │   ├── java/com/carrental/damagepenalty/
│   │   │   ├── DamagePenaltyServiceApplication.java  ✅ Main application
│   │   │   ├── model/
│   │   │   │   ├── DamageReport.java          ✅ Entity với auto-calculate
│   │   │   │   ├── DamageType.java            ✅ Enum
│   │   │   │   ├── DamageSeverity.java        ✅ Enum
│   │   │   │   ├── DamageStatus.java          ✅ Enum
│   │   │   │   ├── Penalty.java               ✅ Entity
│   │   │   │   ├── PenaltyType.java           ✅ Enum
│   │   │   │   └── PaymentStatus.java         ✅ Enum
│   │   │   ├── repository/
│   │   │   │   ├── DamageRepository.java      ✅ Spring Data JPA
│   │   │   │   └── PenaltyRepository.java     ✅ Spring Data JPA
│   │   │   ├── service/
│   │   │   │   ├── DamageService.java         ✅ Business logic
│   │   │   │   └── PenaltyService.java        ✅ Business logic
│   │   │   ├── controller/
│   │   │   │   ├── DamageController.java      ✅ REST API
│   │   │   │   └── PenaltyController.java     ✅ REST API
│   │   │   ├── dto/
│   │   │   │   ├── DamageReportDTO.java       ✅ Data Transfer Object
│   │   │   │   ├── PenaltyDTO.java            ✅ DTO
│   │   │   │   └── PenaltyPaymentDTO.java     ✅ DTO
│   │   │   ├── event/
│   │   │   │   ├── DamageEventPublisher.java  ✅ RabbitMQ events
│   │   │   │   └── PenaltyEventPublisher.java ✅ RabbitMQ events
│   │   │   ├── exception/
│   │   │   │   ├── DamageNotFoundException.java    ✅
│   │   │   │   └── PenaltyNotFoundException.java   ✅
│   │   │   └── config/
│   │   │       └── RabbitMQConfig.java        ✅ RabbitMQ setup
│   │   └── resources/
│   │       └── application.yml                ✅ Configuration
│   └── test/                                  (Cần tạo thêm tests)
```

## 🚀 Chạy Service

### 1. Cài đặt Dependencies
```bash
cd C:\Coding_Stuff\car-rental-system\services\damage-penalty-service
mvn clean install
```

### 2. Setup Database
```sql
CREATE DATABASE damage_penalty_db;
```

### 3. Start Infrastructure (MySQL, RabbitMQ)
```bash
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=mysql -p 3306:3306 mysql:8.4
docker exec -it mysql mysql -uroot -pmysql -e "CREATE DATABASE IF NOT EXISTS damage_penalty_db;"
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine
```

### 4. Run Service
```bash
mvn spring-boot:run
```

Service sẽ chạy ở: http://localhost:8080

## 📡 API Endpoints

### Create Damage Report
```bash
POST http://localhost:8080/api/damage-reports
Content-Type: application/json

{
  "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
  "rentalId": "660e8400-e29b-41d4-a716-446655440001",
  "customerId": "770e8400-e29b-41d4-a716-446655440002",
  "damageType": "SCRATCH",
  "severity": "MINOR",
  "description": "Scratch on front bumper",
  "locationOnVehicle": "FRONT_BUMPER",
  "reportedBy": "STAFF"
}
```

### Get All Damages
```bash
GET http://localhost:8080/api/damage-reports?page=0&size=20
```

### Create Penalty
```bash
POST http://localhost:8080/api/penalties
Content-Type: application/json

{
  "rentalId": "660e8400-e29b-41d4-a716-446655440001",
  "customerId": "770e8400-e29b-41d4-a716-446655440002",
  "vehicleId": "550e8400-e29b-41d4-a716-446655440000",
  "penaltyType": "LATE_RETURN",
  "description": "3 days late",
  "penaltyAmount": 2400000
}
```

### Pay Penalty
```bash
POST http://localhost:8080/api/penalties/{penaltyId}/pay
Content-Type: application/json

{
  "amount": 2400000,
  "paymentMethod": "CREDIT_CARD",
  "transactionId": "txn_123"
}
```

## ✨ Features Đã Implement

✅ **Auto-calculate repair cost** - Tính tự động dựa trên damage type × severity  
✅ **Auto-create penalty** - Tự động tạo phạt cho MODERATE/MAJOR damages  
✅ **Spring Data JPA** - Repository pattern với pagination  
✅ **Transaction management** - @Transactional cho data consistency  
✅ **Event publishing** - RabbitMQ events cho các services khác  
✅ **Validation** - Jakarta Validation với @Valid  
✅ **Exception handling** - Custom exceptions  
✅ **Logging** - SLF4J với Lombok @Slf4j  

## 📋 Next: Tạo các services còn lại

Tương tự, bạn cần tạo:
- rental-service (với State Pattern)
- payment-service
- statistics-service

Xem documentation trong `docs/` để biết chi tiết implementation.
