@echo off
REM Cleanup script for Car Rental System on Kubernetes (Windows)

echo ======================================
echo Car Rental System - K8s Cleanup
echo ======================================
echo.
echo ⚠️  WARNING: This will delete all resources in the car-rental namespace!
echo.

set /p confirm="Are you sure you want to continue? (yes/no): "

if /I "%confirm%" NEQ "yes" (
    echo ❌ Cleanup cancelled
    exit /b 0
)

echo.
echo 🗑️  Deleting microservices...
kubectl delete -f services\ --ignore-not-found=true

echo 🗑️  Deleting infrastructure...
kubectl delete -f infrastructure\ --ignore-not-found=true

echo 🗑️  Deleting config...
kubectl delete -f config\ --ignore-not-found=true

echo 🗑️  Deleting namespace...
kubectl delete -f namespace.yaml --ignore-not-found=true

echo.
echo ======================================
echo ✅ Cleanup Complete!
echo ======================================
