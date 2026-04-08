# Car Rental Management System - Hệ thống quản lý cửa hàng cho thuê xe ô tô

## Tổng quan (Overview)

Hệ thống quản lý cửa hàng cho thuê xe ô tô được thiết kế theo **kiến trúc vi dịch vụ (microservices)** với khả năng mở rộng cao, triển khai trên **Kubernetes**, sử dụng **Java Spring Boot**.

### ✨ Tính năng chính

- 🚗 Quản lý khách hàng, xe, đối tác
- 📋 Đặt xe online và tại chỗ
- 🔄 Quy trình thuê xe với **State Pattern** (Pending → Confirmed → In Progress → Inspection → Completed)
- 💰 Xử lý thanh toán và hoàn tiền
- 🔧 Quản lý lỗi hỏng và tính phạt tự động
- 📊 Thống kê doanh thu theo tháng/quý/năm
- 🔔 Event-driven architecture với RabbitMQ
- 📈 Real-time monitoring và analytics

## Kiến trúc hệ thống (System Architecture)

### Các Module chính (Main Modules)

#### 1. **Damage & Penalty Management Service** (Port 8080)
Quản lý lỗi hỏng phạt
- ✅ Quản lý báo cáo hư hỏng xe
- ✅ Tính toán chi phí sửa chữa tự động
- ✅ Quản lý và xử lý thanh toán phạt
- ✅ Theo dõi lịch sử hư hỏng

#### 2. **Rental Service** (Port 8081)
Nhận trả xe với State Pattern
- ✅ Quản lý quy trình thuê xe (Booking → Pickup → Return → Inspection)
- ✅ **State Pattern** cho Rental và Vehicle
- ✅ Kiểm tra xe khi trả
- ✅ Tính phí trễ hạn tự động

#### 3. **Payment Service** (Port 8082)
Xử lý thanh toán
- ✅ Thanh toán deposit, rental fee, penalty
- ✅ Tích hợp payment gateway
- ✅ Xử lý hoàn tiền
- ✅ Tạo hóa đơn

#### 4. **Statistics Service** (Port 8083)
Thống kê doanh thu
- ✅ Thống kê theo tháng/quý/năm
- ✅ Top khách hàng theo doanh thu
- ✅ Doanh thu theo dòng xe
- ✅ Doanh thu đối tác
- ✅ Dashboard tổng quan

### Các Module hỗ trợ (Supporting Modules)

5. **Customer Service** (Port 8084) - Quản lý khách hàng
6. **Vehicle Service** (Port 8085) - Quản lý xe
7. **Partner Service** (Port 8086) - Quản lý đối tác  
8. **API Gateway** - Routing, Authentication, Rate Limiting

## Cấu trúc thư mục (Project Structure)

```
car-rental-system/
├── services/
│   ├── customer-service/          # Quản lý khách hàng
│   ├── vehicle-service/           # Quản lý xe
│   ├── partner-service/           # Quản lý đối tác
│   ├── damage-penalty-service/    # Quản lý lỗi hỏng phạt
│   ├── rental-service/            # Quản lý thuê xe
│   ├── payment-service/           # Xử lý thanh toán
│   ├── statistics-service/        # Thống kê doanh thu
│   └── api-gateway/               # API Gateway
├── infrastructure/
│   ├── k8s/                       # Kubernetes manifests
│   └── docker/                    # Docker configurations
├── shared/
│   ├── models/                    # Shared data models
│   └── utils/                     # Shared utilities
└── docs/                          # Documentation
```

## Công nghệ sử dụng (Technology Stack)

### Backend
- **Language**: Java 17+
- **Framework**: Spring Boot 3.x
- **ORM**: Spring Data JPA + Hibernate
- **Build Tool**: Maven

### Infrastructure
- **Container Orchestration**: Kubernetes (K8s)
- **Containerization**: Docker
- **API Gateway**: Spring Cloud Gateway
- **Message Queue**: RabbitMQ
- **Database**: PostgreSQL 15 (per service)
- **Cache**: Redis 7

### Monitoring & DevOps
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger
- **CI/CD**: Jenkins / GitHub Actions

## 🚀 Quick Start

### Yêu cầu (Prerequisites)
- **JDK 17+**
- **Maven 3.8+**
- **Docker Desktop**
- **PostgreSQL 15**
- **RabbitMQ 3.x**
- **Redis 7.x**
- **kubectl CLI** (cho Kubernetes deployment)

### Chạy trên Local (Development)

```bash
# 1. Clone project
cd C:\Coding_Stuff\car-rental-system

# 2. Start infrastructure với Docker Compose
docker-compose up -d

# 3. Build và chạy từng service
cd services/damage-penalty-service
mvn clean install
mvn spring-boot:run

# Trong các terminal khác, chạy các services còn lại:
cd services/rental-service
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081

cd services/payment-service
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8082

cd services/statistics-service
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8083
```

### Triển khai với Docker Compose

```bash
# Build Docker images cho tất cả services
./build-all.sh

# Start toàn bộ hệ thống
docker-compose -f docker-compose-full.yml up -d

# Check logs
docker-compose logs -f
```

### Triển khai lên Kubernetes

```bash
# 1. Deploy infrastructure
kubectl apply -f infrastructure/k8s/

# 2. Deploy services
kubectl apply -f services/damage-penalty-service/k8s/
kubectl apply -f services/rental-service/k8s/
kubectl apply -f services/payment-service/k8s/
kubectl apply -f services/statistics-service/k8s/

# 3. Kiểm tra trạng thái
kubectl get pods -n car-rental
kubectl get services -n car-rental

# 4. Truy cập services
kubectl port-forward service/damage-penalty-service 8080:80 -n car-rental
```

### Kiểm tra Hệ thống

```bash
# Health checks
curl http://localhost:8080/actuator/health  # Damage-Penalty Service
curl http://localhost:8081/actuator/health  # Rental Service
curl http://localhost:8082/actuator/health  # Payment Service
curl http://localhost:8083/actuator/health  # Statistics Service

# RabbitMQ Management UI
# http://localhost:15672 (guest/guest)

# Test API
curl -X POST http://localhost:8080/api/damage-reports \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 📚 Tài liệu chi tiết (Detailed Documentation)

### Thiết kế Hệ thống
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Kiến trúc tổng quan, sơ đồ hệ thống, event flow
- **[DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)** - Thiết kế database cho từng service
- **[API_DESIGN.md](docs/API_DESIGN.md)** - Thiết kế RESTful APIs đầy đủ
- **[STATE_PATTERN.md](docs/STATE_PATTERN.md)** - State Pattern cho Rental và Vehicle

### Implementation
- **[JAVA_SERVICE_IMPLEMENTATION.md](docs/JAVA_SERVICE_IMPLEMENTATION.md)** - Java code cho các services chính (Part 1)
- **[JAVA_SERVICE_IMPLEMENTATION_PART2.md](docs/JAVA_SERVICE_IMPLEMENTATION_PART2.md)** - Java code (Part 2)

### Deployment & Development
- **[DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)** - Hướng dẫn phát triển chi tiết
- **[KUBERNETES_GUIDE.md](docs/KUBERNETES_GUIDE.md)** - Hướng dẫn deploy lên Kubernetes

## 📊 Database Schema Highlights

### Damage & Penalty Service
- `damage_reports` - Báo cáo hư hỏng (severity: MINOR, MODERATE, MAJOR, TOTAL_LOSS)
- `penalties` - Quản lý phạt (type: DAMAGE, LATE_RETURN, TRAFFIC_VIOLATION, etc.)
- `penalty_rules` - Quy tắc tính phạt

### Rental Service
- `rentals` - Thông tin thuê xe với state management
- `rental_state_history` - Lịch sử chuyển trạng thái (audit trail)

### Statistics Service
- `revenue_statistics` - Thống kê tổng quan (MONTH/QUARTER/YEAR)
- `customer_revenue_stats` - Top customers by revenue
- `vehicle_category_revenue_stats` - Revenue by vehicle type
- `partner_revenue_stats` - Partner performance

## 🔄 State Pattern Highlights

### Rental States
```
PENDING → CONFIRMED → IN_PROGRESS → INSPECTION → COMPLETED
                                               ↓
                                         PENALTY_DUE → COMPLETED
```

### Vehicle States  
```
AVAILABLE → RESERVED → IN_USE → INSPECTION → AVAILABLE
                                           ↓
                                       DAMAGED → MAINTENANCE → AVAILABLE
```

## 📈 Key Features

✅ **Automatic Cost Calculation** - Tính chi phí sửa chữa và phạt tự động  
✅ **State Management** - Quản lý trạng thái nghiêm ngặt với State Pattern  
✅ **Event-Driven** - Loose coupling giữa services qua RabbitMQ  
✅ **Real-time Statistics** - Cập nhật statistics tự động khi có sự kiện  
✅ **Caching** - Redis cache cho performance optimization  
✅ **Scalable** - Mỗi service scale độc lập trên Kubernetes  
✅ **Monitoring** - Full observability với Prometheus/Grafana/ELK  

## 🛠️ Development Commands

```bash
# Build service
mvn clean install

# Run tests
mvn test

# Run service
mvn spring-boot:run

# Build Docker image
docker build -t car-rental/damage-penalty-service:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f damage-penalty-service

# Deploy to K8s
kubectl apply -f services/damage-penalty-service/k8s/
```

## 📞 API Examples

```bash
# Create damage report
curl -X POST http://localhost:8080/api/damage-reports \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "uuid",
    "rentalId": "uuid",
    "damageType": "SCRATCH",
    "severity": "MINOR",
    "description": "Scratch on front bumper"
  }'

# Get revenue statistics
curl "http://localhost:8083/api/statistics/revenue?periodType=MONTH&periodValue=2024-01"

# Create rental booking
curl -X POST http://localhost:8081/api/rentals/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid",
    "vehicleId": "uuid",
    "startDate": "2024-12-01T10:00:00Z",
    "endDate": "2024-12-05T10:00:00Z"
  }'
```

## 🎯 Next Steps

Để bắt đầu phát triển:

1. Đọc [ARCHITECTURE.md](docs/ARCHITECTURE.md) để hiểu tổng quan hệ thống
2. Đọc [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) để setup môi trường
3. Xem [JAVA_SERVICE_IMPLEMENTATION.md](docs/JAVA_SERVICE_IMPLEMENTATION.md) để xem code mẫu
4. Follow [KUBERNETES_GUIDE.md](docs/KUBERNETES_GUIDE.md) để deploy

## 📝 Notes

- Tất cả services sử dụng **Database per Service pattern**
- Event-driven communication qua **RabbitMQ**
- **State Pattern** đảm bảo business logic chính xác
- **Redis caching** cho statistics performance
- **Scheduled jobs** cập nhật statistics daily
- **JWT authentication** cho security
- **Comprehensive monitoring** với Prometheus/Grafana

---

**Made with ❤️ using Java Spring Boot + Kubernetes**
