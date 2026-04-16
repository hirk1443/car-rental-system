# Frontend Test Apps - 2 Module Flow

Frontend-test được thiết kế lại theo 2 module nghiệp vụ:

1. **Module Quản lý hư hỏng & phạt** (`damage-app`)
2. **Module Nhận/trả xe & thanh toán** (`rental-app` + `payment-app`)

## Chạy backend

```bash
cd services/rental-service && mvn spring-boot:run
cd services/damage-penalty-service && mvn spring-boot:run
cd services/payment-service && mvn spring-boot:run
```

## Mở frontend

```bash
start frontend-test/rental-app/index.html
start frontend-test/damage-app/index.html
start frontend-test/payment-app/index.html
```

## Module 1 - Quản lý hư hỏng & phạt

### Damage report lifecycle
- Tạo damage report với dữ liệu:
  - rentalId / vehicleId / customerId (chọn từ Rental context)
  - damageType / severity / description
  - locationOnVehicle / reportedBy / imageUrls
- Trạng thái hậu kiểm:
  - `REPORTED -> UNDER_REVIEW -> REPAIRED -> CLOSED`
- Mỗi lần cập nhật hậu kiểm sẽ gọi damage update API.

### Penalty lifecycle
- Tab **Penalty** hiển thị danh sách penalty theo `rentalId`/`paymentStatus`.
- Thanh toán penalty qua form `pay penalty`:
  - amount, paymentMethod, transactionId
- Theo dõi trạng thái:
  - `UNPAID -> PARTIALLY_PAID -> PAID` (hoặc `WAIVED` theo nghiệp vụ backend).

## Module 2 - Nhận/trả xe & thanh toán

### Rental lifecycle
- Tạo rental: `PENDING`
- Action:
  - `confirm` -> `CONFIRMED`
  - `pickup` -> `IN_PROGRESS`
  - `return` -> `INSPECTION`
  - inspection:
    - không hư hại -> `COMPLETED`
    - có hư hại -> `PENALTY_DUE`
  - hoàn tất khi xử lý xong nghĩa vụ phạt -> `COMPLETED`
- Có hỗ trợ:
  - `cancel` (nhánh đầu vòng đời)
  - xem `history` trạng thái.

### Payment lifecycle
- Tạo payment với loại:
  - `DEPOSIT`, `RENTAL_FEE`, `PENALTY`
- Xử lý payment:
  - `PENDING -> PROCESSING -> COMPLETED/FAILED`
- Refund:
  - tạo bản ghi refund từ payment đã có.

### Invoice lifecycle
- Tạo invoice theo rental/customer.
- Thao tác invoice:
  - cập nhật penalty amount
  - mark paid
  - add refund
- Theo dõi invoice list: total/paid/refund/isPaid.

## Context binding giữa module

- Damage app và Payment app đều lấy rental từ dropdown (đọc từ Rental service), hạn chế nhập tay sai.
- Damage app tự điền vehicleId/customerId từ rental đã chọn.
- Payment app tự điền customerId và đồng bộ selection sang form invoice.
- Khi cập nhật repairCost ở Damage hậu kiểm, app gọi:
  - `PATCH /api/rentals/{rentalId}/penalty?amount=...`
  để Rental app hiển thị penaltyAmount mới.
