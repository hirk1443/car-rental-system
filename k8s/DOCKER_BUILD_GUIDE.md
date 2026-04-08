# Dockerfiles for Car Rental Services

Since the services are Spring Boot applications, you need to create a Dockerfile for each service.

## Create Dockerfile for each service

### 1. Damage-Penalty Service

Create `services/damage-penalty-service/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the JAR file
COPY target/damage-penalty-service-*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 2. Rental Service

Create `services/rental-service/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the JAR file
COPY target/rental-service-*.jar app.jar

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 3. Payment Service

Create `services/payment-service/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the JAR file
COPY target/payment-service-*.jar app.jar

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8082/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 4. Statistics Service

Create `services/statistics-service/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the JAR file
COPY target/statistics-service-*.jar app.jar

# Expose port
EXPOSE 8083

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8083/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

---

## Build and Push Images

### Option 1: Build and Use Locally (Minikube)

```bash
# If using Minikube, point to Minikube's Docker daemon
eval $(minikube docker-env)

# Build each service
cd services/damage-penalty-service
mvn clean package -DskipTests
docker build -t car-rental/damage-penalty-service:latest .

cd ../rental-service
mvn clean package -DskipTests
docker build -t car-rental/rental-service:latest .

cd ../payment-service
mvn clean package -DskipTests
docker build -t car-rental/payment-service:latest .

cd ../statistics-service
mvn clean package -DskipTests
docker build -t car-rental/statistics-service:latest .
```

### Option 2: Push to Docker Hub

```bash
# Tag with your Docker Hub username
docker tag car-rental/damage-penalty-service:latest YOUR_USERNAME/damage-penalty-service:latest
docker tag car-rental/rental-service:latest YOUR_USERNAME/rental-service:latest
docker tag car-rental/payment-service:latest YOUR_USERNAME/payment-service:latest
docker tag car-rental/statistics-service:latest YOUR_USERNAME/statistics-service:latest

# Push to Docker Hub
docker push YOUR_USERNAME/damage-penalty-service:latest
docker push YOUR_USERNAME/rental-service:latest
docker push YOUR_USERNAME/payment-service:latest
docker push YOUR_USERNAME/statistics-service:latest

# Update image names in k8s YAML files
# Change "car-rental/" to "YOUR_USERNAME/" in all service YAML files
```

### Option 3: Use Private Registry

```bash
# Tag with your registry
docker tag car-rental/damage-penalty-service:latest registry.example.com/damage-penalty-service:latest
docker tag car-rental/rental-service:latest registry.example.com/rental-service:latest
docker tag car-rental/payment-service:latest registry.example.com/payment-service:latest
docker tag car-rental/statistics-service:latest registry.example.com/statistics-service:latest

# Push to registry
docker push registry.example.com/damage-penalty-service:latest
docker push registry.example.com/rental-service:latest
docker push registry.example.com/payment-service:latest
docker push registry.example.com/statistics-service:latest

# Create image pull secret in Kubernetes
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  --docker-email=YOUR_EMAIL \
  -n car-rental

# Add imagePullSecrets to your Deployment specs
```

---

## Build Script (All Services)

Create `build-all.sh` (Linux/Mac) or `build-all.bat` (Windows):

### build-all.sh

```bash
#!/bin/bash

echo "Building all Car Rental services..."

# Array of services
services=("damage-penalty-service" "rental-service" "payment-service" "statistics-service")

# Build each service
for service in "${services[@]}"
do
    echo "====================================="
    echo "Building $service..."
    echo "====================================="
    
    cd services/$service
    
    # Maven build
    mvn clean package -DskipTests
    
    if [ $? -eq 0 ]; then
        # Docker build
        docker build -t car-rental/$service:latest .
        echo "✅ $service built successfully"
    else
        echo "❌ Failed to build $service"
        exit 1
    fi
    
    cd ../..
done

echo ""
echo "====================================="
echo "✅ All services built successfully!"
echo "====================================="
echo ""
echo "Docker images:"
docker images | grep car-rental
```

### build-all.bat (Windows)

```batch
@echo off
echo Building all Car Rental services...

set services=damage-penalty-service rental-service payment-service statistics-service

for %%s in (%services%) do (
    echo =====================================
    echo Building %%s...
    echo =====================================
    
    cd services\%%s
    
    call mvn clean package -DskipTests
    
    if %ERRORLEVEL% EQU 0 (
        docker build -t car-rental/%%s:latest .
        echo ✅ %%s built successfully
    ) else (
        echo ❌ Failed to build %%s
        exit /b 1
    )
    
    cd ..\..
)

echo.
echo =====================================
echo ✅ All services built successfully!
echo =====================================
echo.
echo Docker images:
docker images | findstr car-rental
```

Make executable (Linux/Mac):
```bash
chmod +x build-all.sh
./build-all.sh
```

---

## Next Steps

After creating Dockerfiles and building images:

1. Follow the deployment guide in `k8s/README.md`
2. Deploy to Kubernetes
3. Verify all pods are running
4. Test the APIs

---

## Troubleshooting

### JAR file not found
- Make sure to run `mvn clean package` before building Docker image
- Check that the JAR file exists in `target/` directory
- Verify the JAR filename matches the pattern in Dockerfile

### Image pull errors in Kubernetes
- If using local images with Minikube, make sure to build in Minikube's Docker daemon
- If using registry, verify imagePullSecrets is configured
- Check image name and tag are correct

### Health check fails
- Ensure Spring Boot Actuator is included in dependencies
- Verify the health endpoint is accessible
- Check application port matches the exposed port
