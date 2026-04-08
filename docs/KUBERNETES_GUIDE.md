# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster (minikube, Docker Desktop, or cloud provider)
- kubectl CLI installed
- Docker images built and pushed to registry

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Ingress Controller                    │
│                 (nginx-ingress/traefik)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│                  (Kong/Custom Gateway)                   │
└───┬──────┬──────┬──────┬──────┬──────┬─────────┬───────┘
    │      │      │      │      │      │         │
    ↓      ↓      ↓      ↓      ↓      ↓         ↓
┌────────┐┌─────┐┌─────┐┌──────┐┌─────┐┌────────┐┌──────┐
│Customer││Vehic││Partn││Damage││Renta││Payment ││Stats │
│Service ││le   ││er   ││Penalt││l    ││Service ││Servic││
│        ││Servi││Servi││y     ││Servi││        ││e     │
│        ││ce   ││ce   ││Servic││ce   ││        ││      │
└───┬────┘└──┬──┘└──┬──┘└───┬──┘└──┬──┘└────┬───┘└───┬──┘
    │         │       │       │      │        │        │
    ↓         ↓       ↓       ↓      ↓        ↓        ↓
┌────────────────────────────────────────────────────────┐
│              PostgreSQL Instances                      │
│  (One per service - Database per Service pattern)     │
└────────────────────────────────────────────────────────┘
                     ↑
                     │
┌────────────────────┴────────────────────────────────────┐
│           Message Queue (RabbitMQ/Kafka)                │
│              Redis Cache / ConfigMap                    │
└─────────────────────────────────────────────────────────┘
```

## Namespace Setup

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: car-rental
  labels:
    name: car-rental
```

Apply:
```bash
kubectl apply -f namespace.yaml
```

## ConfigMap for Common Configurations

```yaml
# config/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: car-rental
data:
  LOG_LEVEL: "info"
  TIME_ZONE: "Asia/Ho_Chi_Minh"
  CURRENCY: "VND"
  RABBITMQ_HOST: "rabbitmq-service"
  RABBITMQ_PORT: "5672"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

## Secrets Management

```yaml
# config/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: car-rental
type: Opaque
stringData:
  DATABASE_PASSWORD: "your-secure-password"
  JWT_SECRET: "your-jwt-secret-key"
  RABBITMQ_PASSWORD: "rabbitmq-password"
  REDIS_PASSWORD: "redis-password"
  PAYMENT_GATEWAY_API_KEY: "payment-api-key"
```

Apply:
```bash
kubectl apply -f config/configmap.yaml
kubectl apply -f config/secrets.yaml
```

## Database Deployments

### PostgreSQL StatefulSet Template

```yaml
# database/postgresql-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-{service-name}
  namespace: car-rental
spec:
  ports:
  - port: 5432
    name: postgres
  clusterIP: None
  selector:
    app: postgres-{service-name}
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-{service-name}
  namespace: car-rental
spec:
  serviceName: postgres-{service-name}
  replicas: 1
  selector:
    matchLabels:
      app: postgres-{service-name}
  template:
    metadata:
      labels:
        app: postgres-{service-name}
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: "{service_name}_db"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

Create databases for each service:
```bash
# Customer Service DB
# Vehicle Service DB
# Partner Service DB
# Damage-Penalty Service DB
# Rental Service DB
# Payment Service DB
# Statistics Service DB
```

## Microservice Deployment Template

```yaml
# services/damage-penalty-service/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: damage-penalty-service
  namespace: car-rental
  labels:
    app: damage-penalty-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: damage-penalty-service
  template:
    metadata:
      labels:
        app: damage-penalty-service
    spec:
      containers:
      - name: damage-penalty-service
        image: car-rental/damage-penalty-service:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: DATABASE_HOST
          value: "postgres-damage-penalty"
        - name: DATABASE_PORT
          value: "5432"
        - name: DATABASE_NAME
          value: "damage_penalty_db"
        - name: DATABASE_USER
          value: "postgres"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        - name: RABBITMQ_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: RABBITMQ_HOST
        - name: RABBITMQ_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: RABBITMQ_PORT
        - name: RABBITMQ_USER
          value: "guest"
        - name: RABBITMQ_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: RABBITMQ_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: damage-penalty-service
  namespace: car-rental
spec:
  selector:
    app: damage-penalty-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: damage-penalty-service-hpa
  namespace: car-rental
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: damage-penalty-service
  minReplicas: 3
  maxReplicas: 10
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

## Rental Service Deployment (with State Pattern)

```yaml
# services/rental-service/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rental-service
  namespace: car-rental
  labels:
    app: rental-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rental-service
  template:
    metadata:
      labels:
        app: rental-service
    spec:
      containers:
      - name: rental-service
        image: car-rental/rental-service:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: DATABASE_HOST
          value: "postgres-rental"
        - name: DATABASE_PORT
          value: "5432"
        - name: DATABASE_NAME
          value: "rental_db"
        - name: DATABASE_USER
          value: "postgres"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        - name: VEHICLE_SERVICE_URL
          value: "http://vehicle-service"
        - name: PAYMENT_SERVICE_URL
          value: "http://payment-service"
        - name: DAMAGE_PENALTY_SERVICE_URL
          value: "http://damage-penalty-service"
        - name: RABBITMQ_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: RABBITMQ_HOST
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rental-service
  namespace: car-rental
spec:
  selector:
    app: rental-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

## Statistics Service Deployment

```yaml
# services/statistics-service/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: statistics-service
  namespace: car-rental
spec:
  replicas: 2
  selector:
    matchLabels:
      app: statistics-service
  template:
    metadata:
      labels:
        app: statistics-service
    spec:
      containers:
      - name: statistics-service
        image: car-rental/statistics-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_HOST
          value: "postgres-statistics"
        - name: DATABASE_PORT
          value: "5432"
        - name: DATABASE_NAME
          value: "statistics_db"
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_HOST
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: REDIS_PORT
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: statistics-service
  namespace: car-rental
spec:
  selector:
    app: statistics-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

## Message Queue (RabbitMQ)

```yaml
# infrastructure/rabbitmq.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: car-rental
spec:
  serviceName: rabbitmq
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management-alpine
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        env:
        - name: RABBITMQ_DEFAULT_USER
          value: "guest"
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: RABBITMQ_PASSWORD
        volumeMounts:
        - name: rabbitmq-storage
          mountPath: /var/lib/rabbitmq
  volumeClaimTemplates:
  - metadata:
      name: rabbitmq-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-service
  namespace: car-rental
spec:
  selector:
    app: rabbitmq
  ports:
  - name: amqp
    protocol: TCP
    port: 5672
    targetPort: 5672
  - name: management
    protocol: TCP
    port: 15672
    targetPort: 15672
  type: ClusterIP
```

## Redis Cache

```yaml
# infrastructure/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: car-rental
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command: ["redis-server"]
        args: ["--requirepass", "$(REDIS_PASSWORD)"]
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: REDIS_PASSWORD
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: car-rental
spec:
  selector:
    app: redis
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379
  type: ClusterIP
```

## API Gateway / Ingress

```yaml
# infrastructure/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: car-rental-ingress
  namespace: car-rental
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: api.car-rental.local
    http:
      paths:
      - path: /damage-penalty
        pathType: Prefix
        backend:
          service:
            name: damage-penalty-service
            port:
              number: 80
      - path: /rentals
        pathType: Prefix
        backend:
          service:
            name: rental-service
            port:
              number: 80
      - path: /payments
        pathType: Prefix
        backend:
          service:
            name: payment-service
            port:
              number: 80
      - path: /statistics
        pathType: Prefix
        backend:
          service:
            name: statistics-service
            port:
              number: 80
      - path: /customers
        pathType: Prefix
        backend:
          service:
            name: customer-service
            port:
              number: 80
      - path: /vehicles
        pathType: Prefix
        backend:
          service:
            name: vehicle-service
            port:
              number: 80
      - path: /partners
        pathType: Prefix
        backend:
          service:
            name: partner-service
            port:
              number: 80
```

## Deployment Commands

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Apply ConfigMap and Secrets
kubectl apply -f config/

# 3. Deploy infrastructure (DB, RabbitMQ, Redis)
kubectl apply -f infrastructure/

# 4. Deploy all microservices
kubectl apply -f services/customer-service/k8s/
kubectl apply -f services/vehicle-service/k8s/
kubectl apply -f services/partner-service/k8s/
kubectl apply -f services/damage-penalty-service/k8s/
kubectl apply -f services/rental-service/k8s/
kubectl apply -f services/payment-service/k8s/
kubectl apply -f services/statistics-service/k8s/

# 5. Deploy Ingress
kubectl apply -f infrastructure/ingress.yaml

# 6. Check deployments
kubectl get pods -n car-rental
kubectl get services -n car-rental
kubectl get ingress -n car-rental
```

## Monitoring & Observability

```bash
# Install Prometheus & Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

## Scaling

```bash
# Manual scaling
kubectl scale deployment damage-penalty-service --replicas=5 -n car-rental

# Auto-scaling already configured via HPA
kubectl get hpa -n car-rental
```

## Troubleshooting

```bash
# Check pod logs
kubectl logs -f <pod-name> -n car-rental

# Describe pod
kubectl describe pod <pod-name> -n car-rental

# Execute into container
kubectl exec -it <pod-name> -n car-rental -- /bin/sh

# Check events
kubectl get events -n car-rental --sort-by='.lastTimestamp'
```
