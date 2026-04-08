#!/bin/bash

# Cleanup script for Car Rental System on Kubernetes

echo "======================================"
echo "Car Rental System - K8s Cleanup"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will delete all resources in the car-rental namespace!"
echo ""

read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo "🗑️  Deleting microservices..."
kubectl delete -f services/ --ignore-not-found=true

echo "🗑️  Deleting infrastructure..."
kubectl delete -f infrastructure/ --ignore-not-found=true

echo "🗑️  Deleting config..."
kubectl delete -f config/ --ignore-not-found=true

echo "🗑️  Deleting namespace..."
kubectl delete -f namespace.yaml --ignore-not-found=true

echo ""
echo "======================================"
echo "✅ Cleanup Complete!"
echo "======================================"
