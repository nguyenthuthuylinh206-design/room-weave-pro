
## Kế hoạch cập nhật quy trình thanh toán cho khách theo giờ và theo tháng

### Phân tích hiện trạng

Hiện tại, hệ thống đã hỗ trợ 3 loại hình booking:
- **Daily** (theo ngày): Tính theo đêm, có phụ thu check-in sớm/check-out trễ
- **Hourly** (theo giờ): Tính theo giờ sử dụng
- **Monthly** (theo tháng): Tính theo tháng, có chiết khấu theo thời hạn

**Vấn đề:** Quy trình check-in/check-out và thanh toán hiện tại đang xử lý giống nhau cho cả 3 loại, trong khi logic nghiệp vụ khác nhau:

| Thành phần | Daily (đúng) | Hourly (cần sửa) | Monthly (cần sửa) |
|------------|--------------|------------------|-------------------|
| Đơn vị tính | × đêm | × giờ | × tháng |
| Phụ thu check-in sớm | Áp dụng (5h-14h) | **Không áp dụng** | **Không áp dụng** |
| Phụ thu check-out trễ | Áp dụng (12h-18h+) | **Tính phụ trội giờ** | **Không áp dụng thời gian** |
| Gia hạn | Thêm đêm | Thêm giờ | Thêm tháng |
| Hiển thị duration | "X đêm" | "X giờ" | "X tháng" |

---

### Các thay đổi cần thực hiện

#### Giai đoạn 1: Cập nhật Logic Tính toán (bookingCalculations.ts)

**1.1. Thêm hàm tính phụ thu theo giờ:**
```typescript
// Tính phí vượt giờ cho booking hourly
export function calculateHourlyOvertime(
  hourlyEndTime: Date,      // Giờ kết thúc dự kiến
  actualCheckoutTime: Date, // Giờ checkout thực tế
  hourlyRate: number,       // Giá theo giờ
): number {
  const overtimeHours = differenceInMinutes(actualCheckoutTime, hourlyEndTime) / 60
  if (overtimeHours <= 0) return 0
  // Tính theo giờ tròn (làm tròn lên)
  return Math.ceil(overtimeHours) * hourlyRate
}
```

**1.2. Cập nhật interface BookingCostBreakdown:**
```typescript
export interface BookingCostBreakdown {
  // Existing fields...
  
  // NEW: Booking type specific
  bookingType: 'daily' | 'hourly' | 'monthly'
  
  // For hourly
  hours?: number
  hourlyRate?: number
  hourlyOvertimeCharge?: number
  
  // For monthly  
  months?: number
  monthlyRate?: number
}
```

**1.3. Cập nhật hàm calculateBookingCost:**
- Nhận thêm param `bookingType`
- Tính roomTotal theo logic từng loại:
  - Daily: `roomPrice × nights`
  - Hourly: `hourlyRate × hours`
  - Monthly: `monthlyRate × months × (1 - discount)`

---

#### Giai đoạn 2: Cập nhật useBookingActions.ts

**2.1. Cập nhật handleCheckIn:**
- Lấy thêm `booking_type` từ booking
- **Hourly/Monthly**: Bỏ qua tính `earlyCheckinCharge`, set = 0
- **Daily**: Giữ nguyên logic hiện tại

**2.2. Cập nhật handleCheckOut:**
- Lấy thêm `booking_type`, `hourly_rate`, `booking_hours`, `hourly_end_time` từ booking
- **Hourly**: 
  - Tính `hourlyOvertimeCharge` thay vì `lateCheckoutCharge`
  - Tính subtotal = hourly_rate × booking_hours + overtimeCharge
- **Monthly**:
  - Không tính phụ thu thời gian
  - Subtotal = monthly_rate × months
- **Daily**: Giữ nguyên logic hiện tại

---

#### Giai đoạn 3: Cập nhật UI Components

**3.1. CheckInConfirmDialog.tsx:**
- Thêm prop `bookingType`
- **Hourly/Monthly**: Ẩn bảng phụ thu check-in sớm, hiển thị thông tin xác nhận đơn giản
- **Daily**: Giữ nguyên UI hiện tại

**3.2. CheckoutSummaryDialog.tsx:**
- Thêm prop `bookingType`, `bookingHours`, `hourlyRate`, `monthlyRate`, `bookingMonths`
- Hiển thị chi tiết thanh toán theo loại:
  - **Daily**: "Tiền phòng (X đêm × giá)" + bảng phụ thu check-out trễ
  - **Hourly**: "Tiền phòng (X giờ × giá)" + phí vượt giờ (nếu có)
  - **Monthly**: "Tiền phòng (X tháng × giá)" + chiết khấu (nếu có)

**3.3. PaymentStep.tsx (Booking Wizard):**
- Hiển thị đúng đơn vị: "Giá phòng × X đêm/giờ/tháng"
- Đã hoạt động đúng, chỉ cần kiểm tra label hiển thị

**3.4. ReviewStep.tsx (Booking Wizard):**
- Hiển thị đúng thông tin theo booking_type
- Hourly: Hiển thị thời gian bắt đầu → kết thúc, số giờ
- Monthly: Hiển thị ngày bắt đầu → ngày kết thúc, số tháng

---

#### Giai đoạn 4: Cập nhật ExtendBookingDialog.tsx

- Lấy `booking_type` từ booking
- **Hourly**: 
  - UI thêm giờ thay vì thêm đêm
  - Validation: Không cho extend quá thời gian hoạt động (ví dụ: 22:00)
- **Monthly**:
  - UI thêm tháng
  - Tính chiết khấu tích lũy
- **Daily**: Giữ nguyên

---

### Chi tiết kỹ thuật

#### Files cần chỉnh sửa:

| File | Thay đổi |
|------|----------|
| `src/lib/bookingCalculations.ts` | Thêm `calculateHourlyOvertime`, cập nhật `calculateBookingCost` |
| `src/hooks/useBookingActions.ts` | Phân nhánh logic theo `booking_type` |
| `src/components/bookings/CheckInConfirmDialog.tsx` | Thêm prop `bookingType`, ẩn phụ thu với hourly/monthly |
| `src/components/bookings/CheckoutSummaryDialog.tsx` | Hiển thị chi tiết thanh toán theo loại |
| `src/components/bookings/ExtendBookingDialog.tsx` | Hỗ trợ gia hạn giờ/tháng |
| `src/components/bookings/booking-wizard/steps/PaymentStep.tsx` | Sửa label hiển thị |
| `src/components/bookings/booking-wizard/steps/ReviewStep.tsx` | Hiển thị đúng format cho từng loại |

#### Luồng dữ liệu cần đọc từ booking:

```sql
-- Các cột liên quan đến booking_type (đã có sẵn trong DB)
booking_type: 'daily' | 'hourly' | 'monthly'
hourly_rate: number
monthly_rate: number
booking_hours: number
booking_months: number
hourly_start_time: timestamp
hourly_end_time: timestamp
```

---

### Quy tắc nghiệp vụ chi tiết

#### Khách theo giờ (Hourly):
1. **Check-in**: Không phụ thu sớm/trễ - khách đến lúc nào bắt đầu tính từ lúc đó
2. **Check-out**: 
   - Đúng giờ hoặc sớm: Không phụ thu
   - Quá giờ: Tính phí vượt giờ = (số giờ vượt làm tròn lên) × hourly_rate
3. **Gia hạn**: Thêm X giờ, cập nhật hourly_end_time
4. **Hiển thị**: "Thời gian: 14:00 → 18:00 (4 giờ)"

#### Khách theo tháng (Monthly):
1. **Check-in**: Không phụ thu - thường có thỏa thuận trước
2. **Check-out**: Không phụ thu thời gian trong ngày - tính theo ngày tròn
3. **Gia hạn**: Thêm X tháng, tính lại chiết khấu nếu đủ điều kiện
4. **Hiển thị**: "Thời gian: 01/02/2026 → 01/05/2026 (3 tháng)"

---

### Thứ tự triển khai đề xuất

1. **bookingCalculations.ts** - Core logic tính toán
2. **useBookingActions.ts** - Hook xử lý check-in/out
3. **CheckInConfirmDialog.tsx** - UI check-in
4. **CheckoutSummaryDialog.tsx** - UI checkout (phức tạp nhất)
5. **PaymentStep.tsx + ReviewStep.tsx** - UI booking wizard
6. **ExtendBookingDialog.tsx** - UI gia hạn

---

### Ước tính thời gian

| Giai đoạn | Ước tính |
|-----------|----------|
| Cập nhật bookingCalculations.ts | ~15 phút |
| Cập nhật useBookingActions.ts | ~20 phút |
| Cập nhật CheckInConfirmDialog.tsx | ~10 phút |
| Cập nhật CheckoutSummaryDialog.tsx | ~25 phút |
| Cập nhật Booking Wizard (PaymentStep + ReviewStep) | ~15 phút |
| Cập nhật ExtendBookingDialog.tsx | ~15 phút |
| Testing & fixes | ~20 phút |
| **Tổng** | **~2 giờ** |
