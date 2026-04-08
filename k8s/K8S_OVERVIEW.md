# Kubernetes Configuration - Car Rental System

Đây là các file Kubernetes manifest để deploy hệ thống Car Rental Management lên Kubernetes cluster.

## 📁 Cấu trúc File

```
k8s/
├── README.md                               # Hướng dẫn deploy chi tiết
├── DOCKER_BUILD_GUIDE.md                   # Hướng dẫn build Docker images
├── namespace.yaml                          # Namespace definition
│
├── config/
│   ├── configmap.yaml                     # Application configuration
│   └── secrets.yaml                       # Passwords và secrets
│
├── infrastructure/
│   ├── postgresql.yaml                    # 4 PostgreSQL StatefulSets
│   ├── rabbitmq.yaml                      # RabbitMQ StatefulSet
│   ├── redis.yaml                         # Redis Deployment
│   └── ingress.yaml                       # Ingress Controller config
│
├── services/
│   ├── damage-penalty-service.yaml        # Deployment + Service + HPA
│   ├── rental-service.yaml                # Deployment + Service + HPA
│   ├── payment-service.yaml               # Deployment + Service + HPA
│   └── statistics-service.yaml            # Deployment + Service + HPA
│
├── deploy.sh / deploy.bat                 # Deployment script
└── cleanup.sh / cleanup.bat               # Cleanup script
```

## 🚀 Quick Start

### 1. Build Docker Images

Đầu tiên, tạo Dockerfile cho mỗi service (xem DOCKER_BUILD_GUIDE.md):

```bash
# Tạo Dockerfile trong mỗi service directory
# Ví dụ: services/damage-penalty-service/Dockerfile

# Build tất cả
cd ..
bash k8s/build-all.sh    # Linux/Mac
# hoặc
k8s\build-all.bat        # Windows
```

### 2. Deploy lên Kubernetes

```bash
cd k8s

# Linux/Mac
chmod +x deploy.sh
./deploy.sh development

# Windows
deploy.bat development

# Hoặc production
./deploy.sh production    # Linux/Mac
deploy.bat production     # Windows
```

### 3. Verify Deployment

```bash
# Xem tất cả pods
kubectl get pods -n car-rental

# Xem services
kubectl get services -n car-rental

# Xem logs
kubectl logs -f deployment/damage-penalty-service -n car-rental
```

### 4. Access Services

#### Development (với port-forward):

```bash
kubectl port-forward -n car-rental svc/damage-penalty-service 8080:80
kubectl port-forward -n car-rental svc/rental-service 8081:80
kubectl port-forward -n car-rental svc/payment-service 8082:80
kubectl port-forward -n car-rental svc/statistics-service 8083:80
kubectl port-forward -n car-rental svc/rabbitmq-service 15672:15672
```

#### Production (với Ingress):

Thêm vào hosts file:
```
<INGRESS_IP>  api.car-rental.local
<INGRESS_IP>  rabbitmq.car-rental.local
```

Truy cập:
- APIs: http://api.car-rental.local/api/rentals/rentals
- RabbitMQ: http://rabbitmq.car-rental.local

## 📊 Resources Overview

### Deployments

| Service | Replicas | CPU Request | Memory Request | CPU Limit | Memory Limit |
|---------|----------|-------------|----------------|-----------|--------------|
| Damage-Penalty | 3-10 (HPA) | 250m | 256Mi | 500m | 512Mi |
| Rental | 3-10 (HPA) | 250m | 256Mi | 500m | 512Mi |
| Payment | 3-10 (HPA) | 250m | 256Mi | 500m | 512Mi |
| Statistics | 2-6 (HPA) | 500m | 512Mi | 1000m | 1Gi |

### StatefulSets

| Component | Replicas | Storage |
|-----------|----------|---------|
| PostgreSQL (damage_penalty) | 1 | 5Gi |
| PostgreSQL (rental) | 1 | 5Gi |
| PostgreSQL (payment) | 1 | 5Gi |
| PostgreSQL (statistics) | 1 | 5Gi |
| RabbitMQ | 1 | 3Gi |

### Services

| Service | Type | Port | Target Port |
|---------|------|------|-------------|
| damage-penalty-service | ClusterIP | 80 | 8080 |
| rental-service | ClusterIP | 80 | 8081 |
| payment-service | ClusterIP | 80 | 8082 |
| statistics-service | ClusterIP | 80 | 8083 |
| postgres-* | ClusterIP (Headless) | 5432 | 5432 |
| rabbitmq-service | ClusterIP | 5672, 15672 | 5672, 15672 |
| redis-service | ClusterIP | 6379 | 6379 |

## 🔧 Configuration

### Environment Variables

Được định nghĩa trong `config/configmap.yaml`:
- `TIME_ZONE`: Asia/Ho_Chi_Minh
- `CURRENCY`: VND
- `RABBITMQ_HOST`: rabbitmq-service
- `REDIS_HOST`: redis-service
- `SPRING_PROFILES_ACTIVE`: prod

### Secrets

Được định nghĩa trong `config/secrets.yaml`:
- `DATABASE_PASSWORD`: Mật khẩu PostgreSQL
- `RABBITMQ_PASSWORD`: Mật khẩu RabbitMQ
- `JWT_SECRET`: Secret key cho JWT
- `PAYMENT_GATEWAY_API_KEY`: API key cho payment gateway

**⚠️ QUAN TRỌNG:** Đổi tất cả passwords trong `secrets.yaml` trước khi deploy production!

## 📈 Auto-Scaling

Horizontal Pod Autoscaler (HPA) được cấu hình cho tất cả services:

- **CPU threshold**: 70%
- **Memory threshold**: 80%
- **Min replicas**: 2-3
- **Max replicas**: 6-10

## 🗄️ Database Management

### Truy cập database:

```bash
# Damage-Penalty DB
kubectl exec -it postgres-damage-penalty-0 -n car-rental -- psql -U postgres -d damage_penalty_db

# Rental DB
kubectl exec -it postgres-rental-0 -n car-rental -- psql -U postgres -d rental_db

# Payment DB
kubectl exec -it postgres-payment-0 -n car-rental -- psql -U postgres -d payment_db

# Statistics DB
kubectl exec -it postgres-statistics-0 -n car-rental -- psql -U postgres -d statistics_db
```

### Backup:

```bash
kubectl exec postgres-damage-penalty-0 -n car-rental -- pg_dump -U postgres damage_penalty_db > backup.sql
```

## 🐰 RabbitMQ Management

### Truy cập RabbitMQ UI:

```bash
# Port-forward
kubectl port-forward -n car-rental svc/rabbitmq-service 15672:15672

# Mở browser: http://localhost:15672
# Login: guest / guest
```

### Quản lý queues:

```bash
# List queues
kubectl exec rabbitmq-0 -n car-rental -- rabbitmqctl list_queues

# List exchanges
kubectl exec rabbitmq-0 -n car-rental -- rabbitmqctl list_exchanges
```

## 🔍 Monitoring & Logging

### View logs:

```bash
# Logs của một service
kubectl logs -f deployment/damage-penalty-service -n car-rental

# Logs của tất cả pods của service
kubectl logs -f -l app=rental-service -n car-rental

# Logs của pod cụ thể
kubectl logs -f <pod-name> -n car-rental

# Logs trước đó (nếu pod restart)
kubectl logs --previous <pod-name> -n car-rental
```

### Events:

```bash
# Xem events
kubectl get events -n car-rental --sort-by='.lastTimestamp'
```

### Resource usage:

```bash
# CPU & Memory usage
kubectl top pods -n car-rental
kubectl top nodes
```

## 🧹 Cleanup

### Xóa tất cả resources:

```bash
# Linux/Mac
./cleanup.sh

# Windows
cleanup.bat

# Hoặc manual
kubectl delete namespace car-rental
```

## 🔒 Security Recommendations

1. **Secrets Management**
   - Sử dụng external secret manager (Vault, AWS Secrets Manager)
   - Không commit secrets vào Git
   - Rotate secrets định kỳ

2. **Network Policies**
   - Tạo NetworkPolicy để hạn chế traffic giữa pods
   - Chỉ cho phép traffic cần thiết

3. **RBAC**
   - Tạo ServiceAccount cho mỗi service
   - Giới hạn permissions

4. **Image Security**
   - Scan images với Trivy/Clair
   - Sử dụng non-root user
   - Keep images updated

5. **TLS/SSL**
   - Enable TLS cho Ingress
   - Sử dụng cert-manager cho auto SSL certificates

## 📞 Troubleshooting

### Pod không start:

```bash
kubectl describe pod <pod-name> -n car-rental
kubectl logs <pod-name> -n car-rental
```

### Service connection issues:

```bash
# Test connectivity
kubectl exec -it <pod-name> -n car-rental -- curl http://damage-penalty-service

# Check DNS
kubectl exec -it <pod-name> -n car-rental -- nslookup damage-penalty-service
```

### Database connection issues:

```bash
# Test PostgreSQL connection
kubectl exec -it <app-pod> -n car-rental -- nc -zv postgres-damage-penalty 5432
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Spring Boot on Kubernetes](https://spring.io/guides/gs/spring-boot-kubernetes/)
- [RabbitMQ on Kubernetes](https://www.rabbitmq.com/kubernetes/operator/operator-overview.html)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/current/high-availability.html)

## ✅ Checklist

Trước khi deploy:

- [ ] Docker images đã được build
- [ ] Kubernetes cluster đang chạy
- [ ] kubectl đã được cấu hình
- [ ] Đã đổi passwords trong secrets.yaml
- [ ] Storage class available (cho PersistentVolumes)
- [ ] Ingress controller đã install (nếu dùng Ingress)

Sau khi deploy:

- [ ] Tất cả pods đang RUNNING
- [ ] Health checks passing
- [ ] Databases được tạo và kết nối OK
- [ ] RabbitMQ queues được tạo
- [ ] Services có thể giao tiếp với nhau
- [ ] APIs accessible qua Ingress/port-forward

---

**Chúc bạn deploy thành công! 🚀**

Nếu gặp vấn đề, xem phần Troubleshooting hoặc check logs với kubectl logs.
