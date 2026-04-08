# Car Rental System - Kubernetes Deployment Guide

## 📋 Prerequisites

1. **Kubernetes Cluster**
   - Minikube, Docker Desktop Kubernetes, or Cloud Provider (GKE, EKS, AKS)
   - kubectl CLI installed and configured

2. **Docker Images**
   - Build and tag Docker images for all 4 services
   - Push to container registry (or use local images with Minikube)

3. **Nginx Ingress Controller** (optional but recommended)
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
   ```

---

## 🏗️ Architecture on Kubernetes

```
┌─────────────────────────────────────────────────────┐
│              Nginx Ingress Controller               │
│         api.car-rental.local (or your domain)       │
└────────────────────┬────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┬────────────────┐
     │               │               │                │
┌────▼────┐  ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼────────┐
│ Damage  │  │   Rental    │  │  Payment  │  │  Statistics   │
│ Service │  │  Service    │  │  Service  │  │   Service     │
│ :8080   │  │   :8081     │  │   :8082   │  │    :8083      │
│(3 pods) │  │  (3 pods)   │  │ (3 pods)  │  │   (2 pods)    │
└────┬────┘  └──────┬──────┘  └─────┬─────┘  └──────┬────────┘
     │              │               │                │
     └──────────────┴───────────────┴────────────────┘
                     │
          ┌──────────▼──────────┐
          │   RabbitMQ (1 pod)  │
          │   Redis (1 pod)     │
          └──────────┬──────────┘
                     │
     ┌───────────────┼───────────────┬────────────────┐
     │               │               │                │
┌────▼────────┐ ┌───▼────────┐ ┌────▼──────┐ ┌──────▼──────┐
│PostgreSQL   │ │PostgreSQL  │ │PostgreSQL │ │PostgreSQL   │
│damage_db    │ │rental_db   │ │payment_db │ │statistics_db│
│(StatefulSet)│ │(StatefulSet│ │(StatefulSe│ │(StatefulSet)│
└─────────────┘ └────────────┘ └───────────┘ └─────────────┘
```

---

## 🚀 Quick Start Deployment

### Step 1: Build Docker Images

```bash
cd C:\Coding_Stuff\car-rental-system\services

# Build Damage-Penalty Service
cd damage-penalty-service
docker build -t car-rental/damage-penalty-service:latest .
cd ..

# Build Rental Service
cd rental-service
docker build -t car-rental/rental-service:latest .
cd ..

# Build Payment Service
cd payment-service
docker build -t car-rental/payment-service:latest .
cd ..

# Build Statistics Service
cd statistics-service
docker build -t car-rental/statistics-service:latest .
cd ..
```

**Note:** You may need to create Dockerfile for each service first (see Dockerfiles section below).

---

### Step 2: Deploy to Kubernetes

```bash
cd C:\Coding_Stuff\car-rental-system\k8s

# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Apply ConfigMap and Secrets
kubectl apply -f config/

# 3. Deploy Infrastructure (PostgreSQL, RabbitMQ, Redis)
kubectl apply -f infrastructure/postgresql.yaml
kubectl apply -f infrastructure/rabbitmq.yaml
kubectl apply -f infrastructure/redis.yaml

# Wait for databases to be ready (takes 1-2 minutes)
kubectl wait --for=condition=ready pod -l app=postgres-damage-penalty -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres-rental -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres-payment -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres-statistics -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n car-rental --timeout=300s

# 4. Deploy Microservices
kubectl apply -f services/

# 5. Deploy Ingress (optional)
kubectl apply -f infrastructure/ingress.yaml
```

---

### Step 3: Verify Deployment

```bash
# Check all pods
kubectl get pods -n car-rental

# Expected output:
# NAME                                      READY   STATUS    RESTARTS   AGE
# damage-penalty-service-xxx                1/1     Running   0          2m
# damage-penalty-service-yyy                1/1     Running   0          2m
# damage-penalty-service-zzz                1/1     Running   0          2m
# rental-service-xxx                        1/1     Running   0          2m
# rental-service-yyy                        1/1     Running   0          2m
# rental-service-zzz                        1/1     Running   0          2m
# payment-service-xxx                       1/1     Running   0          2m
# payment-service-yyy                       1/1     Running   0          2m
# payment-service-zzz                       1/1     Running   0          2m
# statistics-service-xxx                    1/1     Running   0          2m
# statistics-service-yyy                    1/1     Running   0          2m
# postgres-damage-penalty-0                 1/1     Running   0          5m
# postgres-rental-0                         1/1     Running   0          5m
# postgres-payment-0                        1/1     Running   0          5m
# postgres-statistics-0                     1/1     Running   0          5m
# rabbitmq-0                                1/1     Running   0          5m
# redis-xxx                                 1/1     Running   0          5m

# Check services
kubectl get services -n car-rental

# Check ingress
kubectl get ingress -n car-rental
```

---

### Step 4: Access the Application

#### Using Port-Forward (Development)

```bash
# Damage-Penalty Service
kubectl port-forward -n car-rental svc/damage-penalty-service 8080:80

# Rental Service
kubectl port-forward -n car-rental svc/rental-service 8081:80

# Payment Service
kubectl port-forward -n car-rental svc/payment-service 8082:80

# Statistics Service
kubectl port-forward -n car-rental svc/statistics-service 8083:80

# RabbitMQ Management UI
kubectl port-forward -n car-rental svc/rabbitmq-service 15672:15672
```

Then access:
- Damage-Penalty: http://localhost:8080/api/damage-reports
- Rental: http://localhost:8081/api/rentals
- Payment: http://localhost:8082/api/payments
- Statistics: http://localhost:8083/api/statistics/revenue/yearly/2024
- RabbitMQ UI: http://localhost:15672 (guest/guest)

#### Using Ingress (Production-like)

1. Add to your hosts file:
   ```
   # Windows: C:\Windows\System32\drivers\etc\hosts
   # Linux/Mac: /etc/hosts
   
   127.0.0.1  api.car-rental.local
   127.0.0.1  rabbitmq.car-rental.local
   ```

2. Access via Ingress:
   - Damage-Penalty: http://api.car-rental.local/api/damage-penalty/damage-reports
   - Rental: http://api.car-rental.local/api/rentals/rentals
   - Payment: http://api.car-rental.local/api/payments/payments
   - Statistics: http://api.car-rental.local/api/statistics/revenue/yearly/2024
   - RabbitMQ UI: http://rabbitmq.car-rental.local

---

## 📊 Monitoring & Management

### View Logs

```bash
# View logs of specific service
kubectl logs -f deployment/damage-penalty-service -n car-rental

# View logs of all pods with label
kubectl logs -f -l app=rental-service -n car-rental

# View logs of specific pod
kubectl logs -f <pod-name> -n car-rental
```

### Scale Services

```bash
# Manual scaling
kubectl scale deployment damage-penalty-service --replicas=5 -n car-rental

# Check HPA (auto-scaling)
kubectl get hpa -n car-rental
```

### Restart Services

```bash
# Restart deployment (rolling restart)
kubectl rollout restart deployment/damage-penalty-service -n car-rental

# Check rollout status
kubectl rollout status deployment/damage-penalty-service -n car-rental
```

---

## 🗄️ Database Management

### Access PostgreSQL

```bash
# Access damage-penalty database
kubectl exec -it postgres-damage-penalty-0 -n car-rental -- psql -U postgres -d damage_penalty_db

# Access rental database
kubectl exec -it postgres-rental-0 -n car-rental -- psql -U postgres -d rental_db

# Access payment database
kubectl exec -it postgres-payment-0 -n car-rental -- psql -U postgres -d payment_db

# Access statistics database
kubectl exec -it postgres-statistics-0 -n car-rental -- psql -U postgres -d statistics_db
```

### Backup Database

```bash
# Backup damage_penalty_db
kubectl exec postgres-damage-penalty-0 -n car-rental -- pg_dump -U postgres damage_penalty_db > damage_backup.sql

# Restore
kubectl exec -i postgres-damage-penalty-0 -n car-rental -- psql -U postgres damage_penalty_db < damage_backup.sql
```

---

## 🔧 Troubleshooting

### Pod Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n car-rental

# Check logs
kubectl logs <pod-name> -n car-rental

# Get previous logs (if container restarted)
kubectl logs <pod-name> -n car-rental --previous
```

### Service Connection Issues

```bash
# Test connectivity from one pod to another
kubectl exec -it <pod-name> -n car-rental -- curl http://damage-penalty-service/api/damage-reports

# Check DNS resolution
kubectl exec -it <pod-name> -n car-rental -- nslookup damage-penalty-service
```

### Database Connection Issues

```bash
# Check if PostgreSQL pods are running
kubectl get pods -l app=postgres-damage-penalty -n car-rental

# Test database connection from app pod
kubectl exec -it <app-pod-name> -n car-rental -- nc -zv postgres-damage-penalty 5432
```

### RabbitMQ Issues

```bash
# Check RabbitMQ logs
kubectl logs rabbitmq-0 -n car-rental

# Access RabbitMQ shell
kubectl exec -it rabbitmq-0 -n car-rental -- rabbitmqctl status

# List queues
kubectl exec -it rabbitmq-0 -n car-rental -- rabbitmqctl list_queues
```

---

## 🧹 Cleanup

### Delete All Resources

```bash
# Delete all resources in namespace
kubectl delete namespace car-rental

# Or delete specific resources
kubectl delete -f services/
kubectl delete -f infrastructure/
kubectl delete -f config/
kubectl delete -f namespace.yaml
```

---

## 📋 Files Overview

```
k8s/
├── namespace.yaml                          # Namespace definition
├── config/
│   ├── configmap.yaml                     # Application configuration
│   └── secrets.yaml                       # Sensitive data (passwords, keys)
├── infrastructure/
│   ├── postgresql.yaml                    # 4 PostgreSQL StatefulSets
│   ├── rabbitmq.yaml                      # RabbitMQ StatefulSet
│   ├── redis.yaml                         # Redis Deployment
│   └── ingress.yaml                       # Ingress rules
└── services/
    ├── damage-penalty-service.yaml        # Damage-Penalty Deployment + Service + HPA
    ├── rental-service.yaml                # Rental Deployment + Service + HPA
    ├── payment-service.yaml               # Payment Deployment + Service + HPA
    └── statistics-service.yaml            # Statistics Deployment + Service + HPA
```

---

## 🎯 Production Considerations

### 1. Use Persistent Volumes
- Configure StorageClass for your cloud provider
- Set appropriate storage sizes based on data volume

### 2. Resource Limits
- Adjust CPU/Memory requests and limits based on load testing
- Monitor resource usage and adjust HPA settings

### 3. Secrets Management
- Use external secret managers (Vault, AWS Secrets Manager, etc.)
- Don't commit secrets to git

### 4. High Availability
- Run multiple replicas of databases (PostgreSQL with replication)
- Use managed database services in production
- Configure pod anti-affinity for better distribution

### 5. Monitoring
- Install Prometheus + Grafana for metrics
- Use ELK or Loki for centralized logging
- Set up alerts for critical issues

### 6. Security
- Enable TLS/SSL for ingress
- Use NetworkPolicies to restrict pod-to-pod communication
- Run security scans on container images
- Use non-root users in containers

---

## 📞 Support

For issues or questions:
- Check logs: `kubectl logs <pod-name> -n car-rental`
- Describe resources: `kubectl describe <resource-type> <name> -n car-rental`
- View events: `kubectl get events -n car-rental --sort-by='.lastTimestamp'`

---

**Happy Deploying! 🚀**
