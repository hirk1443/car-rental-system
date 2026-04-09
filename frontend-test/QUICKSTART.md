# 🚀 QUICK START - Frontend Testing Apps

## Cách nhanh nhất để test!

### 📦 Nếu services đang chạy trên Kubernetes:

```bash
# Bước 1: Setup port-forward
cd frontend-test
setup-k8s-portforward.bat

# Bước 2: Mở tất cả apps
open-all-apps.bat
```

Xong! Giờ bạn có 4 tabs trong browser để test.

---

### 💻 Nếu chạy services trực tiếp (Development):

```bash
# Terminal 1
cd services/rental-service
mvn spring-boot:run

# Terminal 2
cd services/damage-penalty-service
mvn spring-boot:run

# Terminal 3
cd services/payment-service
mvn spring-boot:run

# Terminal 4
cd services/statistics-service
mvn spring-boot:run

# Terminal 5
cd frontend-test
open-all-apps.bat
```

---

## 🎯 Test Flow đơn giản:

1. **Rental App** → Tạo đơn thuê → Copy Rental ID
2. **Rental App** → Xác nhận → Lấy xe → Trả xe → Kiểm tra (tick "có hư hại")
3. **Damage App** → Báo hư hại → Copy Damage ID
4. **Damage App** → Duyệt (APPROVED) → Tính phạt tự động
5. **Payment App** → Tạo thanh toán → Xử lý
6. **Rental App** → Hoàn tất đơn
7. **Statistics App** → Làm mới → Xem báo cáo

---

## ✅ Checklist

- [ ] Services đang chạy (check localhost:8080-8083)
- [ ] PostgreSQL, RabbitMQ, Redis hoạt động
- [ ] Port-forward đã setup (nếu dùng K8s)
- [ ] Đã mở các frontend apps

---

Xem chi tiết trong `README.md` 📖
