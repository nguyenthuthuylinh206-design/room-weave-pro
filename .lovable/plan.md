

## Logic tính phí quá thời gian đặt phòng — Phân tích chi tiết

### Tổng quan kiến trúc

Logic tính phí nằm chủ yếu trong 3 file:
- `src/lib/bookingCalculations.ts` — Core calculation functions
- `src/hooks/useBookingActions.ts` — Single checkout flow
- `src/hooks/useGroupCheckoutCalculations.ts` — Group checkout flow

---

### 1. THEO NGÀY (Daily) — Phụ thu check-out trễ

**Hàm**: `calculateLateCheckoutCharge()`

Logic dựa trên **giờ thực tế checkout** so với giờ tiêu chuẩn (mặc định 12:00):

```text
Giờ checkout     │ Phụ thu (% giá phòng/đêm)
─────────────────┼──────────────────────────
≤ 12:00          │ 0% (đúng giờ)
12:01 - 15:00    │ 30%
15:01 - 18:00    │ 50%
Sau 18:00        │ 100% (= 1 đêm)
```

**Trường hợp quá hạn ngày** (overdue — checkout sau ngày dự kiến):
- `ExtendBookingDialog` phát hiện overdue bằng `differenceInCalendarDays(today, checkOutDate)`
- Cho phép lễ tân "Checkout ngay" → hệ thống gia hạn ảo `check_out_date` đến hôm nay
- Sau đó tính lại cost breakdown bình thường (bao gồm late charge nếu quá 12h)
- Chi phí thêm = `additionalNights × roomPrice` (tính từ ngày checkout cũ → ngày mới)

**Nhận xét**: Logic **KHÔNG tự động tính thêm đêm** cho ngày quá hạn. Nó phụ thuộc vào việc lễ tân gia hạn `check_out_date` trước. Nếu không gia hạn mà checkout thẳng, chỉ tính late surcharge trong ngày (tối đa 100% = 1 đêm), **bỏ qua các đêm quá hạn trước đó**.

---

### 2. THEO GIỜ (Hourly) — Phí vượt giờ

**Hàm**: `calculateHourlyOvertimeCharge()`

```text
Phí = ceil(overtimeMinutes / 60) × hourlyRate
```

- So sánh `actualCheckoutTime` vs `scheduledEndTime` (stored as `hourly_end_time`)
- Làm tròn **lên** số giờ vượt (30 phút → 1 giờ)
- Phí vượt giờ được coi như `totalSurcharges` trong `calculateBookingCost`
- **Không áp dụng** early/late surcharge kiểu daily

**Nhận xét**: Logic chính xác. Không có lỗ hổng.

---

### 3. THEO THÁNG (Monthly) — Không tính phụ thu thời gian

```text
case 'monthly':
  // No time-based surcharges for monthly bookings
  months = booking.booking_months || 1
  break
```

- Hoàn toàn **không tính phụ thu** check-in sớm, check-out trễ, hay overtime
- `totalSurcharges = 0` luôn
- Chỉ tính: `monthlyRate × months - monthlyDiscount`

**Nhận xét**: Đây là **thiếu sót tiềm năng**. Nếu khách thuê tháng ở quá ngày hết hợp đồng (ví dụ thuê 1 tháng nhưng ở thêm 5 ngày), hệ thống **không có cơ chế tính phí** cho những ngày dư. Lễ tân phải xử lý thủ công (gia hạn thêm tháng hoặc tạo booking daily mới).

---

### 4. Luồng checkout tổng hợp

```text
useBookingActions.handleCheckout()
├── Xác định bookingType
├── switch(bookingType)
│   ├── hourly → calculateHourlyOvertimeCharge()
│   ├── monthly → no surcharge
│   └── daily → calculateLateCheckoutCharge()
├── calculateServiceChargesFromConsumables()
├── get_booking_chargeable_total (minibar)
├── calculateBookingCost() → costBreakdown
└── perform_checkout RPC (atomic update)
    └── surchargeToStore = hourly ? overtimeCharge : lateCheckoutCharge
```

---

### Tổng kết: Không có bug code, nhưng có gap nghiệp vụ

| Loại | Tính phí quá giờ | Tính phí quá ngày | Trạng thái |
|------|-------------------|---------------------|------------|
| Daily | ✅ Late surcharge 30-100% | ⚠️ Phụ thuộc gia hạn thủ công | Hoạt động đúng |
| Hourly | ✅ Overtime = ceil(phút/60) × rate | N/A | Hoạt động đúng |
| Monthly | ❌ Không có cơ chế | ❌ Không có cơ chế | Gap nghiệp vụ |

**Không cần fix code nào** — logic hiện tại hoạt động đúng theo thiết kế. Gap duy nhất là monthly không có penalty quá hạn, nhưng đây có thể là by design (thuê tháng thường xử lý bằng hợp đồng/thương lượng).

