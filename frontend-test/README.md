# 🎨 Frontend Testing Apps - Car Rental System

Frontend đơn giản để test các microservices trong hệ thống Car Rental Management.

## 📁 Cấu trúc

```
frontend-test/
├── rental-app/         🚗 Quản lý thuê xe (Port 8081)
├── damage-app/         ⚠️ Báo hư hại & phạt (Port 8080)
├── payment-app/        💳 Quản lý thanh toán (Port 8082)
└── statistics-app/     📊 Thống kê doanh thu (Port 8083)
```

## 🚀 Cách sử dụng

### 1️⃣ Đảm bảo services đang chạy

**Option A: Chạy từng service trực tiếp (Development)**
```bash
# Terminal 1 - Rental Service
cd services/rental-service
mvn spring-boot:run

# Terminal 2 - Damage/Penalty Service
cd services/damage-penalty-service
mvn spring-boot:run

# Terminal 3 - Payment Service
cd services/payment-service
mvn spring-boot:run

# Terminal 4 - Statistics Service
cd services/statistics-service
mvn spring-boot:run
```

**Option B: Chạy trên Kubernetes (Production-like)**
```bash
# Port-forward từ Kubernetes
kubectl port-forward -n car-rental svc/rental-service 8081:80
kubectl port-forward -n car-rental svc/damage-penalty-service 8080:80
kubectl port-forward -n car-rental svc/payment-service 8082:80
kubectl port-forward -n car-rental svc/statistics-service 8083:80
```

### 2️⃣ Mở Frontend Apps

Chỉ cần mở file HTML trong trình duyệt:

```bash
# Rental App
start frontend-test/rental-app/index.html

# Damage App
start frontend-test/damage-app/index.html

# Payment App
start frontend-test/payment-app/index.html

# Statistics App
start frontend-test/statistics-app/index.html
```

Hoặc kéo thả file vào Chrome/Edge/Firefox.

---

## 📝 Hướng dẫn Test Workflow

### 🎯 Test Flow: Thuê xe → Hư hại → Thanh toán → Thống kê

#### **Bước 1: Tạo đơn thuê (Rental App)**
1. Mở **Rental App**
2. Tab "➕ Tạo đơn thuê"
3. Điền thông tin:
   - Customer ID: `CUST-001`
   - Vehicle ID: `VEH-001`
   - Ngày bắt đầu/kết thúc
   - Số tiền: `500000` VND
4. Nhấn **"Tạo đơn thuê"**
5. **Copy Rental ID** (ví dụ: `RNT-XXX`)

#### **Bước 2: Xác nhận và lấy xe (Rental App)**
1. Tab "⚙️ Thao tác"
2. Nhập **Rental ID** vừa tạo
3. Nhấn **"✅ Xác nhận"** → Status: CONFIRMED
4. Nhấn **"🚗 Lấy xe"** → Status: ACTIVE

#### **Bước 3: Trả xe và kiểm tra (Rental App)**
1. Nhấn **"🔙 Trả xe"** → Status: RETURNED
2. Cuộn xuống "Kiểm tra sau khi trả xe"
3. Nhập **Rental ID**
4. ✅ Tick "**Có hư hại**"
5. Ghi chú: `Trầy xước ở cửa trước`
6. Nhấn **"Hoàn tất kiểm tra"**

#### **Bước 4: Báo cáo hư hại (Damage App)**
1. Mở **Damage App**
2. Tab "➕ Báo hư hại"
3. Điền:
   - Rental ID: (từ bước 1)
   - Vehicle ID: `VEH-001`
   - Loại: `SCRATCH - Trầy xước`
   - Mức độ: `MODERATE - Vừa`
   - Mô tả: `Trầy xước 20cm ở cửa trước`
   - Chi phí ước tính: `1000000` VND
4. Nhấn **"Tạo báo cáo"**
5. **Copy Damage Report ID** (UUID)

#### **Bước 5: Duyệt hư hại & tính phạt (Damage App)**
1. Tab "💰 Tính phạt"
2. Nhập **Damage Report ID** (UUID từ bước 4)
3. Chọn status: `APPROVED - Duyệt & tính phạt`
4. Chi phí thực tế: `1200000` VND
5. Nhấn **"Cập nhật & Tính phạt"**

> 🔔 **Hệ thống sẽ:**
> - Gửi event qua RabbitMQ
> - Penalty Service tạo penalty record
> - Cập nhật penalty vào Rental
> - Tạo payment record cho penalty

#### **Bước 6: Tạo thanh toán tiền thuê (Payment App)**
1. Mở **Payment App**
2. Tab "➕ Tạo thanh toán"
3. Điền:
   - Rental ID: (từ bước 1)
   - Customer ID: `CUST-001`
   - Loại: `RENTAL - Tiền thuê`
   - Số tiền: `500000` VND
   - Phương thức: `CREDIT_CARD`
4. Nhấn **"Tạo thanh toán"**
5. **Copy Payment ID**

#### **Bước 7: Xử lý thanh toán (Payment App)**
1. Tab "⚙️ Xử lý"
2. Nhập **Payment ID** (từ bước 6)
3. Transaction ID: `TXN-12345`
4. Nhấn **"Xử lý thanh toán"**

> ✅ Status → COMPLETED

#### **Bước 8: Hoàn tất đơn thuê (Rental App)**
1. Quay lại **Rental App**
2. Tab "⚙️ Thao tác"
3. Nhập **Rental ID**
4. Nhấn **"✔️ Hoàn tất"** → Status: COMPLETED

#### **Bước 9: Xem thống kê (Statistics App)**
1. Mở **Statistics App**
2. Nhấn **"🔄 Làm mới thống kê"** (để cập nhật từ Payment Service)
3. Tab "📅 Năm": Xem tổng doanh thu năm 2024
4. Tab "📋 Tháng": Chọn tháng hiện tại
5. Xem chi tiết:
   - Tổng doanh thu
   - Tiền thuê
   - Tiền phạt
   - Số đơn
   - Giá trị trung bình

---

## 🔍 Kiểm tra tương tác giữa services

### 1. Rental ↔ Damage
- Khi kiểm tra "có hư hại" trong Rental → Tạo damage report
- Xem lịch sử rental để thấy penalty amount

### 2. Damage ↔ Penalty ↔ Rental
- Approve damage → Event qua RabbitMQ
- Penalty Service tạo penalty
- Rental được cập nhật penalty amount

### 3. Rental ↔ Payment
- Tạo payment cho rental
- Payment completed → Event qua RabbitMQ
- Statistics nhận event

### 4. Payment ↔ Statistics
- Mỗi payment completed → cập nhật statistics
- Statistics Service lưu vào Redis cache
- Aggregate theo tháng/quý/năm

---

## 🛠️ Troubleshooting

### ❌ CORS Error
Nếu gặp lỗi CORS, thêm vào `application.properties` của mỗi service:

```properties
# Enable CORS for frontend
spring.web.cors.allowed-origins=*
spring.web.cors.allowed-methods=GET,POST,PUT,PATCH,DELETE
spring.web.cors.allowed-headers=*
```

Hoặc dùng Chrome extension: "Allow CORS"

### ❌ Không kết nối được API

**Kiểm tra services:**
```bash
curl http://localhost:8080/api/damage-reports
curl http://localhost:8081/api/rentals
curl http://localhost:8082/api/payments
curl http://localhost:8083/api/statistics/revenue/yearly/2024
```

**Kiểm tra port-forward (nếu dùng K8s):**
```bash
kubectl get pods -n car-rental
kubectl get svc -n car-rental
```

### ❌ Không thấy dữ liệu trong Statistics

1. Đảm bảo đã có payment COMPLETED
2. Nhấn **"🔄 Làm mới thống kê"** trong Statistics App
3. Kiểm tra Redis:
```bash
kubectl exec -it redis-xxx -n car-rental -- redis-cli
> KEYS *revenue*
```

---

## 📊 API Endpoints được sử dụng

### Rental Service (8081)
- `POST /api/rentals` - Tạo đơn thuê
- `GET /api/rentals` - Danh sách
- `PATCH /api/rentals/{id}/confirm` - Xác nhận
- `PATCH /api/rentals/{id}/pickup` - Lấy xe
- `PATCH /api/rentals/{id}/return` - Trả xe
- `PATCH /api/rentals/{id}/inspection` - Kiểm tra
- `PATCH /api/rentals/{id}/complete` - Hoàn tất
- `GET /api/rentals/{id}/history` - Lịch sử

### Damage-Penalty Service (8080)
- `POST /api/damage-reports` - Tạo báo cáo
- `GET /api/damage-reports` - Danh sách
- `PATCH /api/damage-reports/{id}?status=...&repairCost=...` - Cập nhật

### Payment Service (8082)
- `POST /api/payments` - Tạo thanh toán
- `GET /api/payments` - Danh sách
- `PATCH /api/payments/{id}/process` - Xử lý
- `POST /api/payments/{id}/refund` - Hoàn tiền

### Statistics Service (8083)
- `GET /api/statistics/revenue/yearly/{year}` - Năm
- `GET /api/statistics/revenue/quarterly/{year}/{quarter}` - Quý
- `GET /api/statistics/revenue/monthly/{year}/{month}` - Tháng
- `POST /api/statistics/refresh` - Làm mới

---

## 🎨 Tính năng Frontend

✅ **Responsive** - Hoạt động tốt trên mobile/tablet
✅ **Real-time** - Tự động tải lại sau thao tác
✅ **Validation** - Kiểm tra dữ liệu trước khi gửi
✅ **Error Handling** - Hiển thị lỗi rõ ràng
✅ **JSON Preview** - Xem response đầy đủ
✅ **Auto-hide** - Thông báo tự động ẩn sau 10s
✅ **Color-coded** - Status có màu sắc phân biệt

---

## 📝 Notes

- Frontend này chỉ để **testing/development**
- Không có authentication/authorization
- Dùng vanilla JavaScript (không cần framework)
- Không cần build/compile
- Có thể customize màu sắc và style trong `<style>` tag

---

## 🚀 Next Steps

1. **Add Authentication**: JWT token trong header
2. **Add Validation**: Client-side validation mạnh hơn
3. **Add Charts**: Dùng Chart.js cho statistics
4. **Add WebSocket**: Real-time notifications
5. **Add File Upload**: Upload ảnh hư hại

---

**Chúc bạn test vui vẻ! 🎉**
