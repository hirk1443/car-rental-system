# QUICKSTART - Two Modules E2E

## 1) Start services

```bash
cd services/rental-service && mvn spring-boot:run
cd services/damage-penalty-service && mvn spring-boot:run
cd services/payment-service && mvn spring-boot:run
```

## 2) Open apps

```bash
start frontend-test/rental-app/index.html
start frontend-test/damage-app/index.html
start frontend-test/payment-app/index.html
```

## 3) E2E flow

1. **Rental app**
   - Tạo rental
   - confirm -> pickup -> return -> inspection(hasDamage=true)
2. **Damage app**
   - Tạo damage report (chọn rental, auto-fill vehicle/customer)
   - Hậu kiểm: `REPORTED -> UNDER_REVIEW -> REPAIRED -> CLOSED`
3. **Damage app / Penalty tab**
   - Kiểm tra penalty auto-create
   - Pay penalty (có thể trả nhiều lần)
4. **Payment app**
   - Tạo payment (`DEPOSIT`/`RENTAL_FEE`/`PENALTY`)
   - Process payment
   - (Optional) refund payment
5. **Payment app / Invoice tab**
   - Tạo invoice
   - cập nhật penalty / mark paid / add refund
6. **Rental app**
   - Reload list để xem penaltyAmount
   - complete rental

## 4) Endpoints used

- Rental: `http://localhost:8081/api/rentals`
- Damage/Penalty: `http://localhost:8080/api/damage-reports`, `http://localhost:8080/api/penalties`
- Payment/Invoice: `http://localhost:8082/api/payments`, `http://localhost:8082/api/invoices`
