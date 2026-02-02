

# Phân tích & Kế hoạch Cải thiện Hệ thống Đặt phòng

## TỔNG QUAN ĐÁNH GIÁ

Sau khi phân tích toàn bộ mã nguồn liên quan đến đặt phòng, tôi đã xác định **3 vấn đề nghiêm trọng** và **5 vấn đề cần cải thiện**.

---

## VẤN ĐỀ NGHIÊM TRỌNG (CRITICAL)

### 1. Đặt phòng theo giờ - KHÔNG kiểm tra trùng lặp

| File | Vấn đề | Mức độ |
|------|--------|--------|
| `useBookingForm.ts` (Line 324) | Bỏ qua validation overlap cho hourly booking | **CRITICAL** |
| `validate_booking_dates` (RPC) | Chỉ so sánh ngày, không so sánh giờ | **CRITICAL** |

**Code hiện tại:**
```typescript
// Line 324-325 in useBookingForm.ts
if (state.bookingType !== 'hourly') {
  // Chỉ gọi validate_booking_dates cho Daily/Monthly
}
```

**Hậu quả:** Có thể đặt 2 booking theo giờ cùng phòng, cùng ngày, trùng thời gian!

**Giải pháp:**
1. Tạo RPC mới `validate_hourly_booking` với logic so sánh `TIMESTAMPTZ`
2. Cập nhật `useBookingForm.ts` để gọi validation cho hourly booking

---

### 2. `useAvailableRooms` không hỗ trợ Hourly/Monthly

| File | Vấn đề |
|------|--------|
| `useAvailableRooms.ts` | Chỉ nhận `checkInDate` và `checkOutDate` |
| `RoomSelectionStep.tsx` (Line 85-88) | Luôn truyền daily dates, kể cả khi chọn hourly/monthly |

**Code hiện tại:**
```typescript
// RoomSelectionStep.tsx
const { data: availableRooms } = useAvailableRooms(
  state.checkInDate,  // ❌ Sai khi bookingType = 'hourly' hoặc 'monthly'
  state.checkOutDate
)
```

**Giải pháp:** Cập nhật logic để truyền đúng dates theo `bookingType`:
- hourly: `state.hourlyDate`, `state.hourlyDate` (cùng ngày)
- monthly: `state.monthlyStartDate`, calculated end date
- daily: `state.checkInDate`, `state.checkOutDate`

---

### 3. Thiếu hiển thị `booking_type` trong danh sách đặt phòng

| File | Vấn đề |
|------|--------|
| `BookingsPage.tsx` | Không hiển thị loại đặt phòng (Giờ/Ngày/Tháng) |

**Hậu quả:** 
- Khó phân biệt các loại booking trong danh sách
- Cột "Check-in/Check-out" không có ý nghĩa với hourly booking

**Giải pháp:** Thêm badge phân loại và hiển thị giờ cho hourly bookings

---

## VẤN ĐỀ CẦN CẢI THIỆN (ENHANCEMENTS)

### 4. Check-in sớm cố định mốc 14:00

| File | Vấn đề |
|------|--------|
| `BookingsPage.tsx` (Line 329) | Check-in sau 14:00 không tính phụ thu - sai với hourly booking |

**Code hiện tại:**
```typescript
// Line 328-331
if (hours >= 14) {
  performCheckIn(booking, 0)  // ❌ Không phù hợp với hourly
}
```

**Giải pháp:** Kiểm tra `booking_type` trước khi áp dụng logic phụ thu

---

### 5. Thiếu validation thời gian thực

| File | Vấn đề |
|------|--------|
| `DateTimeStep.tsx` | Cho phép chọn giờ bắt đầu trong quá khứ (hourly) |

**Ví dụ:** Lúc 15:00 vẫn có thể chọn hourly booking bắt đầu lúc 10:00 cùng ngày

**Giải pháp:** Thêm validation disable các time slots đã qua

---

### 6. Thiếu thông tin thời gian phòng trống (hourly)

| File | Vấn đề |
|------|--------|
| `RoomSelectionStep.tsx` | Không hiển thị phòng sẽ trống từ mấy giờ |

**Giải pháp:** Khi đặt hourly trong ngày, hiển thị badge "Trống từ XX:XX"

---

### 7. Query limit mặc định 100 bookings

| File | Vấn đề |
|------|--------|
| `BookingsPage.tsx` (Line 193) | `.limit(100)` có thể bỏ sót bookings |

**Giải pháp:** Thêm pagination hoặc tăng limit + warning khi gần limit

---

### 8. Thiếu cột `booking_type` trong query list

| File | Vấn đề |
|------|--------|
| `BookingsPage.tsx` (Line 187-192) | Query không select các trường hourly/monthly |

**Query hiện tại thiếu:**
```typescript
// Cần thêm:
booking_type, hourly_rate, hourly_start_time, hourly_end_time, 
booking_hours, monthly_rate, booking_months
```

---

## SƠ ĐỒ VẤN ĐỀ VALIDATION

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     BOOKING OVERLAP VALIDATION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   DAILY                    HOURLY                    MONTHLY            │
│   ┌──────────┐            ┌──────────┐             ┌──────────┐        │
│   │ ✅ Works │            │ ❌ BROKEN│             │ ✅ Works │        │
│   └──────────┘            └──────────┘             └──────────┘        │
│                                                                         │
│   validate_booking_dates   SKIPPED!                validate_booking_   │
│   (DATE comparison)        (Line 324)              dates               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         ROOM AVAILABILITY                               │
│                                                                         │
│   useAvailableRooms luôn nhận checkInDate/checkOutDate                 │
│   ❌ Khi hourly: state.hourlyDate không được sử dụng                   │
│   ❌ Khi monthly: state.monthlyStartDate không được sử dụng            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## KẾ HOẠCH SỬA LỖI

### Ưu tiên 1: Sửa lỗi Critical

#### 1.1 Tạo RPC `validate_hourly_booking`

```sql
CREATE OR REPLACE FUNCTION validate_hourly_booking(
  p_room_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM room_bookings
  WHERE room_id = p_room_id
    AND booking_type = 'hourly'
    AND status IN ('confirmed', 'checked_in')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND hourly_start_time < p_end_time
    AND hourly_end_time > p_start_time;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'HOURLY_OVERLAP');
  END IF;

  RETURN jsonb_build_object('valid', true);
END;
$$;
```

#### 1.2 Cập nhật `useBookingForm.ts`

Thêm validation cho hourly booking:
```typescript
if (state.bookingType === 'hourly') {
  // Gọi RPC validate_hourly_booking với start/end timestamps
}
```

#### 1.3 Cập nhật `RoomSelectionStep.tsx`

Truyền đúng dates theo bookingType:
```typescript
const getAvailabilityDates = () => {
  switch (state.bookingType) {
    case 'hourly': return { checkIn: state.hourlyDate, checkOut: state.hourlyDate }
    case 'monthly': return { checkIn: state.monthlyStartDate, checkOut: addMonths(...) }
    default: return { checkIn: state.checkInDate, checkOut: state.checkOutDate }
  }
}
```

### Ưu tiên 2: Cải thiện UI

#### 2.1 Cập nhật `BookingsPage.tsx`

1. Mở rộng query để lấy thêm các trường booking_type
2. Thêm Badge hiển thị loại booking (Giờ/Ngày/Tháng)
3. Hiển thị giờ cụ thể cho hourly bookings
4. Sửa logic check-in theo booking_type

#### 2.2 Cập nhật `DateTimeStep.tsx`

Thêm validation để disable time slots đã qua khi chọn hourly booking hôm nay

---

## FILES CẦN SỬA

| Thứ tự | File | Thay đổi | Độ phức tạp |
|--------|------|----------|-------------|
| 1 | Database migration | Tạo RPC `validate_hourly_booking` | Trung bình |
| 2 | `useBookingForm.ts` | Thêm validation cho hourly | Cao |
| 3 | `RoomSelectionStep.tsx` | Fix dates theo bookingType | Trung bình |
| 4 | `BookingsPage.tsx` | Expand query + UI improvements | Cao |
| 5 | `DateTimeStep.tsx` | Time slot validation | Thấp |

---

## KẾT QUẢ MONG ĐỢI

1. **Hourly booking** sẽ được validate đúng - không còn đặt trùng thời gian
2. **Room availability** hiển thị chính xác theo loại booking
3. **Danh sách đặt phòng** phân biệt rõ các loại booking
4. **Check-in/out** xử lý đúng logic theo từng loại hình
5. **Time selection** ngăn chặn chọn thời gian không hợp lệ

