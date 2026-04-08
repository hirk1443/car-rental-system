# Kiến trúc Hệ thống - Car Rental Management System

## Tổng quan Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                             │
│                   (Web App, Mobile App, Admin Dashboard)                     │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INGRESS CONTROLLER                                  │
│                        (nginx-ingress / Traefik)                             │
│                     SSL Termination, Load Balancing                          │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                        │
│                      (Spring Cloud Gateway)                                  │
│           Authentication, Rate Limiting, Routing, Circuit Breaker            │
└───┬───────┬───────┬───────┬───────┬───────┬───────┬───────────────────────┘
    │       │       │       │       │       │       │
    ↓       ↓       ↓       ↓       ↓       ↓       ↓
┌────────┐┌───────┐┌───────┐┌──────┐┌──────┐┌──────┐┌────────────────┐
│Customer││Vehicle││Partner││Damage││Rental││Paymen││Statistics      │
│Service ││Service││Service││Penalt││Servic││t     ││Service         │
│        ││       ││       ││y     ││e     ││Servic││                │
│Port:   ││Port:  ││Port:  ││Servic││Port: ││e     ││Port: 8083      │
│8084    ││8085   ││8086   ││e     ││8081  ││Port: ││                │
│        ││       ││       ││Port: ││      ││8082  ││                │
│        ││       ││       ││8080  ││      ││      ││                │
└───┬────┘└───┬───┘└───┬───┘└───┬──┘└───┬──┘└───┬──┘└────┬───────────┘
    │         │         │         │       │       │        │
    │         │         │         │       │       │        │
    ↓         ↓         ↓         ↓       ↓       ↓        ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MESSAGE QUEUE (RabbitMQ)                                │
│                                                                               │
│  Events: rental.created, rental.completed, payment.completed,                │
│          damage.reported, penalty.created, penalty.paid                      │
└─────────────────────────────────────────────────────────────────────────────┘
    ↑         ↑         ↑         ↑       ↑       ↑        ↑
    │         │         │         │       │       │        │
    ↓         ↓         ↓         ↓       ↓       ↓        ↓
┌──────────┐┌────────┐┌─────────┐┌──────┐┌──────┐┌──────┐┌───────────┐
│customer_ ││vehicle_││partner_ ││damage││rental││paymen││statistics_│
│db        ││db      ││db       ││penalt││_db   ││t_db  ││db         │
│          ││        ││         ││y_db  ││      ││      ││           │
│PostgreSQL││PostgreS││PostgreSQ││PostgreSQL    ││PostgreSQL         │
│          ││QL      ││L        ││      ││      ││      ││           │
└──────────┘└────────┘└─────────┘└──────┘└──────┘└──────┘└───────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           REDIS CACHE CLUSTER                                │
│                     (Cache statistics, session data)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING & LOGGING                                 │
│                                                                               │
│   Prometheus → Grafana          ELK Stack          Jaeger (Tracing)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Chi tiết các Module chính

### 1. Damage & Penalty Management Service (Port 8080)

**Chức năng chính:**
- Quản lý báo cáo lỗi hỏng xe
- Tính toán chi phí sửa chữa tự động
- Quản lý các khoản phạt
- Xử lý thanh toán phạt
- Theo dõi lịch sử hư hỏng

**Database Tables:**
- `damage_reports`: Lưu thông tin hư hỏng
- `penalties`: Lưu thông tin phạt
- `penalty_rules`: Quy tắc tính phạt

**State Flow:**
```
Damage Report: REPORTED → UNDER_REVIEW → REPAIRED → CLOSED
Penalty: UNPAID → PARTIALLY_PAID → PAID / WAIVED
```

**APIs chính:**
- `POST /api/damage-reports` - Tạo báo cáo hư hỏng
- `GET /api/damage-reports` - Lấy danh sách hư hỏng
- `PATCH /api/damage-reports/{id}` - Cập nhật trạng thái
- `POST /api/penalties` - Tạo phạt
- `POST /api/penalties/{id}/pay` - Thanh toán phạt

**Events Published:**
- `damage.reported` - Khi tạo báo cáo hư hỏng
- `damage.updated` - Khi cập nhật trạng thái
- `penalty.created` - Khi tạo phạt
- `penalty.paid` - Khi thanh toán phạt

---

### 2. Rental & Payment Service (Port 8081, 8082)

**Chức năng chính:**
- Quản lý quy trình thuê xe (booking → pickup → return → inspection)
- **State Pattern** cho trạng thái rental và vehicle
- Xử lý thanh toán (deposit, rental fee, refund)
- Tích hợp payment gateway
- Tính toán chi phí tự động

**Database Tables:**
- `rentals`: Thông tin thuê xe
- `rental_state_history`: Lịch sử chuyển trạng thái
- `payments`: Thông tin thanh toán
- `invoices`: Hóa đơn

**Rental State Pattern:**
```
PENDING → CONFIRMED → IN_PROGRESS → INSPECTION → COMPLETED
                                               ↓
                                         PENALTY_DUE → COMPLETED
Cancel flow: PENDING/CONFIRMED → CANCELLED
```

**Vehicle State Pattern:**
```
AVAILABLE → RESERVED → IN_USE → INSPECTION → AVAILABLE
                                           ↓
                                       DAMAGED → MAINTENANCE → AVAILABLE
```

**APIs chính:**
- `POST /api/rentals/bookings` - Đặt xe online
- `POST /api/rentals/{id}/confirm` - Xác nhận booking
- `POST /api/rentals/{id}/pickup` - Nhận xe
- `POST /api/rentals/{id}/return` - Trả xe
- `POST /api/rentals/{id}/inspection` - Hoàn tất kiểm tra
- `POST /api/payments` - Tạo thanh toán
- `POST /api/payments/{id}/process` - Xử lý thanh toán

**Events Published:**
- `rental.created` - Khi tạo booking
- `rental.confirmed` - Khi xác nhận
- `rental.in_progress` - Khi nhận xe
- `rental.returned` - Khi trả xe
- `rental.completed` - Khi hoàn tất
- `payment.completed` - Khi thanh toán thành công

**Events Consumed:**
- `payment.completed` - Để cập nhật trạng thái rental
- `penalty.created` - Để chuyển trạng thái PENALTY_DUE

---

### 3. Statistics Service (Port 8083)

**Chức năng chính:**
- Thống kê doanh thu theo tháng/quý/năm
- Thống kê khách hàng theo doanh thu
- Thống kê dòng xe theo doanh thu
- Thống kê đối tác theo doanh thu
- Dashboard tổng quan
- Báo cáo so sánh

**Database Tables:**
- `revenue_statistics`: Thống kê tổng quan
- `customer_revenue_stats`: Thống kê theo khách hàng
- `vehicle_category_revenue_stats`: Thống kê theo dòng xe
- `partner_revenue_stats`: Thống kê theo đối tác

**Caching Strategy:**
- Redis cache cho statistics queries (TTL: 1 hour)
- Cache invalidation khi có event mới
- Scheduled job cập nhật daily vào 1 AM

**APIs chính:**
- `GET /api/statistics/revenue?period_type=MONTH&period_value=2024-01`
- `GET /api/statistics/revenue/compare?start=2024-01&end=2024-06`
- `GET /api/statistics/revenue/customers?period_type=YEAR&period_value=2024&limit=10`
- `GET /api/statistics/revenue/vehicle-categories?period_type=QUARTER&period_value=2024-Q1`
- `GET /api/statistics/revenue/partners?period_type=MONTH&period_value=2024-01`
- `GET /api/statistics/dashboard?period_type=MONTH&period_value=2024-01`

**Events Consumed:**
- `rental.completed` - Để cập nhật statistics
- `payment.completed` - Để cập nhật revenue
- `penalty.paid` - Để cập nhật penalty revenue

**Scheduled Jobs:**
- Cron: `0 0 1 * * *` (Daily 1 AM) - Cập nhật statistics
- Background calculation cho periods cũ

---

## Các Module Hỗ trợ

### 4. Customer Service (Port 8084)
- CRUD khách hàng
- Quản lý tài sản đảm bảo
- Lịch sử thuê xe
- Blacklist management

### 5. Vehicle Service (Port 8085)
- CRUD xe
- Quản lý danh mục xe
- State management (với State Pattern)
- Lịch sử bảo trì

### 6. Partner Service (Port 8086)
- CRUD đối tác
- Quản lý hợp đồng
- Thanh toán cho đối tác (monthly/quarterly)
- Thanh lý hợp đồng

### 7. API Gateway
- Authentication & Authorization (JWT)
- Rate limiting
- Request routing
- Circuit breaker
- API composition

---

## Event-Driven Architecture

### Message Queue (RabbitMQ) Configuration

```java
// Exchange
car-rental-exchange (topic)

// Queues and Bindings
damage.reported.queue      → routing key: damage.reported
damage.updated.queue       → routing key: damage.updated
penalty.created.queue      → routing key: penalty.created
penalty.paid.queue         → routing key: penalty.paid
rental.created.queue       → routing key: rental.created
rental.confirmed.queue     → routing key: rental.confirmed
rental.completed.queue     → routing key: rental.completed
payment.completed.queue    → routing key: payment.completed
```

### Event Flow Examples

**Scenario 1: Hoàn tất thuê xe không hư hỏng**
```
1. Customer trả xe → Rental Service
2. Rental Service: return_vehicle() → State: INSPECTION
3. Staff kiểm tra → complete_inspection(has_damage=false)
4. Rental State: INSPECTION → COMPLETED
5. Publish event: rental.completed
6. Vehicle Service listens → Update vehicle state: INSPECTION → AVAILABLE
7. Payment Service listens → Process refund
8. Statistics Service listens → Update statistics
```

**Scenario 2: Hoàn tất thuê xe có hư hỏng**
```
1. Customer trả xe → Rental Service
2. Rental Service: return_vehicle() → State: INSPECTION
3. Staff kiểm tra → complete_inspection(has_damage=true, damages=[...])
4. Call Damage Service → Create damage reports
5. Damage Service → Auto create penalties (if severe)
6. Publish event: damage.reported, penalty.created
7. Rental State: INSPECTION → PENALTY_DUE
8. Customer pays penalty → Penalty Service
9. Publish event: penalty.paid
10. Rental Service listens → State: PENALTY_DUE → COMPLETED
11. Statistics Service listens → Update statistics
```

---

## Kubernetes Deployment Strategy

### Resource Allocation

**Production Recommended:**
```yaml
Damage-Penalty Service:
  replicas: 3
  resources:
    requests: { cpu: 250m, memory: 512Mi }
    limits: { cpu: 500m, memory: 1Gi }
  
Rental Service:
  replicas: 5 (high traffic)
  resources:
    requests: { cpu: 500m, memory: 512Mi }
    limits: { cpu: 1000m, memory: 1Gi }

Payment Service:
  replicas: 5 (critical)
  resources:
    requests: { cpu: 500m, memory: 512Mi }
    limits: { cpu: 1000m, memory: 1Gi }

Statistics Service:
  replicas: 2
  resources:
    requests: { cpu: 500m, memory: 1Gi }
    limits: { cpu: 1000m, memory: 2Gi }
```

### Horizontal Pod Autoscaling

```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Security

### Authentication & Authorization

- **JWT-based authentication**
- **Role-based access control (RBAC)**
  - ADMIN: Full access
  - STAFF: Operational access (rentals, inspections)
  - CUSTOMER: Own data only
  - PARTNER: Partner-specific data

### API Security

- HTTPS only (TLS 1.3)
- API rate limiting
- Request validation
- SQL injection prevention (Prepared Statements)
- XSS protection

---

## Monitoring & Observability

### Metrics (Prometheus + Grafana)
- Request rate, latency, error rate
- JVM metrics (heap, GC)
- Database connection pool
- Message queue metrics

### Logging (ELK Stack)
- Centralized logging
- Structured JSON logs
- Log correlation with trace IDs

### Tracing (Jaeger)
- Distributed tracing across services
- Performance bottleneck identification

---

## Performance Optimization

### Caching Strategy
- Redis cache for statistics (1-hour TTL)
- Redis cache for vehicle availability
- Database query result caching

### Database Optimization
- Proper indexing on foreign keys and query columns
- Connection pooling (HikariCP)
- Read replicas for statistics queries
- Partitioning for large tables

### API Optimization
- Pagination for list endpoints
- Field filtering (sparse fieldsets)
- Async processing for heavy operations
- Circuit breakers for external calls

---

## Disaster Recovery

### Backup Strategy
- Daily automated database backups
- Retention: 30 days
- Cross-region replication

### High Availability
- Multi-replica deployments
- Load balancing
- Health checks and auto-restart
- Graceful shutdown

---

## Development Workflow

```
Developer → Git Push → CI Pipeline → Build & Test → Docker Build → 
  → Push to Registry → Deploy to Dev → Integration Tests → 
  → Manual Approval → Deploy to Staging → E2E Tests → 
  → Manual Approval → Deploy to Production → Smoke Tests
```

---

## Kết luận

Hệ thống được thiết kế theo kiến trúc microservices hiện đại với:

✅ **Scalability**: Mỗi service có thể scale độc lập  
✅ **Resilience**: Circuit breakers, retry mechanisms  
✅ **Maintainability**: Clear separation of concerns  
✅ **Observability**: Comprehensive monitoring  
✅ **State Management**: State Pattern cho business logic rõ ràng  
✅ **Event-Driven**: Loose coupling giữa các services  
✅ **Cloud-Native**: Ready for Kubernetes deployment  

Hệ thống có thể xử lý hàng nghìn requests/giây và dễ dàng mở rộng theo nhu cầu.
