@echo off
REM Deployment script for Car Rental System on Kubernetes (Windows)
REM Usage: deploy.bat [development|production]

setlocal

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

echo ======================================
echo Car Rental System - K8s Deployment
echo Environment: %ENVIRONMENT%
echo ======================================

REM Check if kubectl is available
kubectl version --client >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ kubectl is not installed. Please install kubectl first.
    exit /b 1
)

REM Check if cluster is accessible
kubectl cluster-info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig.
    exit /b 1
)

echo ✅ kubectl is configured and cluster is accessible
echo.

REM Step 1: Create namespace
echo 📦 Step 1: Creating namespace...
kubectl apply -f namespace.yaml
echo ✅ Namespace created
echo.

REM Step 2: Apply ConfigMap and Secrets
echo ⚙️  Step 2: Applying ConfigMap and Secrets...
kubectl apply -f config\configmap.yaml
kubectl apply -f config\secrets.yaml
echo ✅ ConfigMap and Secrets applied
echo.

REM Step 3: Deploy Infrastructure
echo 🏗️  Step 3: Deploying Infrastructure (PostgreSQL, RabbitMQ, Redis)...
kubectl apply -f infrastructure\postgresql.yaml
kubectl apply -f infrastructure\rabbitmq.yaml
kubectl apply -f infrastructure\redis.yaml
echo ✅ Infrastructure deployed
echo.

REM Wait for infrastructure to be ready
echo ⏳ Waiting for infrastructure to be ready...
echo    This may take 2-3 minutes...

kubectl wait --for=condition=ready pod -l app=postgres-damage-penalty -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres-rental -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres-payment -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres-statistics -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n car-rental --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n car-rental --timeout=300s

echo ✅ Infrastructure is ready
echo.

REM Step 4: Deploy Microservices
echo 🚀 Step 4: Deploying Microservices...
kubectl apply -f services\damage-penalty-service.yaml
kubectl apply -f services\rental-service.yaml
kubectl apply -f services\payment-service.yaml
kubectl apply -f services\statistics-service.yaml
echo ✅ Microservices deployed
echo.

REM Step 5: Deploy Ingress (if not in development)
if /I "%ENVIRONMENT%" NEQ "development" (
    echo 🌐 Step 5: Deploying Ingress...
    kubectl apply -f infrastructure\ingress.yaml
    echo ✅ Ingress deployed
) else (
    echo ⏭️  Step 5: Skipping Ingress deployment (development mode)
)
echo.

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
echo    This may take 2-3 minutes...

kubectl wait --for=condition=available deployment/damage-penalty-service -n car-rental --timeout=300s
kubectl wait --for=condition=available deployment/rental-service -n car-rental --timeout=300s
kubectl wait --for=condition=available deployment/payment-service -n car-rental --timeout=300s
kubectl wait --for=condition=available deployment/statistics-service -n car-rental --timeout=300s

echo ✅ Services are ready
echo.

REM Display deployment status
echo ======================================
echo 📊 Deployment Status
echo ======================================
echo.

echo Pods:
kubectl get pods -n car-rental
echo.

echo Services:
kubectl get services -n car-rental
echo.

if /I "%ENVIRONMENT%" NEQ "development" (
    echo Ingress:
    kubectl get ingress -n car-rental
    echo.
)

echo ======================================
echo ✅ Deployment Complete!
echo ======================================
echo.

if /I "%ENVIRONMENT%"=="development" (
    echo 📝 To access services locally, use port-forward:
    echo.
    echo   kubectl port-forward -n car-rental svc/damage-penalty-service 8080:80
    echo   kubectl port-forward -n car-rental svc/rental-service 8081:80
    echo   kubectl port-forward -n car-rental svc/payment-service 8082:80
    echo   kubectl port-forward -n car-rental svc/statistics-service 8083:80
    echo   kubectl port-forward -n car-rental svc/rabbitmq-service 15672:15672
    echo.
) else (
    echo 📝 Add the following to C:\Windows\System32\drivers\etc\hosts:
    echo.
    echo   ^<INGRESS_IP^>  api.car-rental.local
    echo   ^<INGRESS_IP^>  rabbitmq.car-rental.local
    echo.
    echo Then access:
    echo   http://api.car-rental.local/api/rentals/rentals
    echo   http://rabbitmq.car-rental.local (guest/guest)
    echo.
)

echo ======================================

endlocal
