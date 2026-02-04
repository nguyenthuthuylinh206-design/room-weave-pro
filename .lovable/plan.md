

## Kế hoạch: Thêm Dialog Xác nhận Check-in cho TẤT CẢ trường hợp

### VẤN ĐỀ HIỆN TẠI

| Loại Booking | Thời điểm | Dialog xác nhận |
|--------------|-----------|-----------------|
| Daily | Trước 14:00 | CO | 
| Daily | Sau 14:00 | KHONG |
| Hourly | Bất kỳ | KHONG |
| Monthly | Bất kỳ | KHONG |

Người dùng bấm Check-in → Hệ thống check-in ngay mà không xác nhận → Dễ nhầm lẫn!

---

### GIẢI PHÁP

Sửa luồng để **LUÔN hiển thị dialog xác nhận** trước khi check-in, với đầy đủ thông tin:

```text
┌──────────────────────────────────────────────────────────────┐
│                   XÁC NHẬN CHECK-IN                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Khách: Nguyễn Văn A              Phòng: P102               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ THÔNG TIN ĐẶT PHÒNG                                    │ │
│  │                                                        │ │
│  │ Loại booking:     Theo ngày                            │ │
│  │ Ngày nhận phòng:  04/02/2026                           │ │
│  │ Ngày trả phòng:   06/02/2026                           │ │
│  │ Số đêm:           2 đêm                                │ │
│  │ Giá phòng:        500.000đ/đêm                         │ │
│  │ Tổng tiền phòng:  1.000.000đ                           │ │
│  │ Đã cọc:           200.000đ                             │ │
│  │ Còn lại:          800.000đ                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Nếu có phụ thu check-in sớm - hiển thị bảng phụ thu]      │
│                                                              │
│  ✅ Giờ check-in: 15:30 (Không phụ thu)                     │
│                                                              │
│                        [Hủy]     [Xác nhận Check-in]        │
└──────────────────────────────────────────────────────────────┘
```

---

### CHI TIẾT THAY ĐỔI

#### 1. Cập nhật `CheckInConfirmDialog.tsx`

Thêm các props mới để hiển thị đầy đủ thông tin booking:

```typescript
interface CheckInConfirmDialogProps {
  // Props hiện có
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  roomNumber: string
  actualCheckInTime: string
  roomPrice: number
  suggestedCharge: number
  bookingType?: 'daily' | 'hourly' | 'monthly'
  bookingHours?: number
  bookingMonths?: number
  onConfirm: (finalCharge: number, adjustmentNote?: string) => void
  isLoading?: boolean
  
  // THÊM MỚI - Thông tin booking chi tiết
  checkInDate: Date
  checkOutDate: Date
  totalNights?: number
  totalAmount: number
  depositAmount: number
  guestPhone?: string
  bookingSource?: string
}
```

Cập nhật UI để hiển thị:
- Thông tin khách: Tên, SĐT
- Thông tin phòng: Số phòng, loại phòng
- Thông tin thời gian: Ngày nhận/trả, số đêm (hoặc số giờ/tháng)
- Thông tin tài chính: Tổng tiền, đã cọc, còn lại
- Nguồn đặt phòng (nếu có)
- Bảng phụ thu (nếu check-in sớm)

#### 2. Cập nhật `BookingsPage.tsx` - `handleCheckInClick`

Sửa logic để **LUÔN mở dialog**:

```typescript
const handleCheckInClick = async (booking: BookingWithRoom) => {
  // ... validation code hiện tại (ngày, room status) ...
  
  const actualTime = format(now, 'HH:mm')
  const hours = parseInt(actualTime.split(':')[0])
  const roomPrice = (booking as any).room_price || 0

  setActionBooking(booking)

  // Tính phụ thu (nếu có) cho daily booking check-in sớm
  let suggestedCharge = 0
  if (booking.booking_type === 'daily' && hours < 14) {
    suggestedCharge = calculateEarlyCheckinCharge(actualTime, roomPrice)
  }
  
  setSuggestedEarlyCharge(suggestedCharge)
  // LUÔN hiển thị dialog xác nhận
  setShowCheckinConfirm(true)
}
```

#### 3. Cập nhật props truyền vào `CheckInConfirmDialog`

```tsx
<CheckInConfirmDialog
  open={showCheckinConfirm}
  onOpenChange={(open) => {
    setShowCheckinConfirm(open)
    if (!open) setActionBooking(null)
  }}
  guestName={actionBooking.guest_name}
  guestPhone={actionBooking.guest_phone}
  roomNumber={actionBooking.room?.room_number || ''}
  actualCheckInTime={format(new Date(), 'HH:mm')}
  roomPrice={(actionBooking as any).room_price || 0}
  suggestedCharge={suggestedEarlyCharge}
  bookingType={actionBooking.booking_type || 'daily'}
  bookingHours={actionBooking.booking_hours}
  bookingMonths={actionBooking.booking_months}
  // THÊM MỚI
  checkInDate={new Date(actionBooking.check_in_date)}
  checkOutDate={new Date(actionBooking.check_out_date)}
  totalNights={calculateNights(actionBooking)}
  totalAmount={actionBooking.total_amount || 0}
  depositAmount={actionBooking.deposit_amount || 0}
  bookingSource={actionBooking.booking_source}
  onConfirm={(finalCharge, adjustmentNote) => performCheckIn(actionBooking, finalCharge, adjustmentNote)}
  isLoading={isActionLoading}
/>
```

---

### UI DESIGN CHO DIALOG MỚI

```text
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Xác nhận Check-in                                   [×]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Khách: Nguyễn Văn A              Phòng: P102                  │
│  SĐT: 0901234567                  Nguồn: Booking.com           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ THÔNG TIN ĐẶT PHÒNG                                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Loại booking      Theo ngày                             │   │
│  │ Ngày nhận phòng   04/02/2026                            │   │
│  │ Ngày trả phòng    06/02/2026                            │   │
│  │ Số đêm            2 đêm                                 │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Giá phòng         500.000đ/đêm                          │   │
│  │ Tổng tiền phòng   1.000.000đ                            │   │
│  │ Đã đặt cọc        200.000đ                              │   │
│  │ Còn phải thu      800.000đ                      ← bold  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✅ Giờ check-in: 15:30                                        │
│  ✅ Không áp dụng phụ thu check-in sớm                         │
│                                                                 │
│  ────────────────────────────────────────────────────          │
│                            [Hủy]   [Xác nhận Check-in]         │
└─────────────────────────────────────────────────────────────────┘
```

**Nếu check-in sớm (trước 14:00):**
```text
│  ⚠️ Giờ check-in: 10:30 (Check-in sớm)                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ BẢNG PHỤ THU CHECK-IN SỚM                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✓ 09:00 - 14:00     30%    = 150.000đ          ← active │   │
│  │   05:00 - 09:00     50%    = 250.000đ                   │   │
│  │   Trước 05:00       100%   = 500.000đ                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Phụ thu áp dụng: [_150.000_] đ                                │
│                                                                 │
│  [Miễn phí]   [Theo chuẩn (150.000đ)]                          │
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi | Độ phức tạp |
|------|----------|------------|
| `src/components/bookings/CheckInConfirmDialog.tsx` | Thêm props mới, cập nhật UI hiển thị thông tin booking | Cao |
| `src/pages/bookings/BookingsPage.tsx` | Sửa logic luôn mở dialog, truyền thêm props | Trung bình |
| `src/components/rooms/RoomBookingDialog.tsx` | Cập nhật tương tự cho dialog check-in | Trung bình |

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau |
|--------|-------|-----|
| Check-in có xác nhận | Chỉ khi check-in sớm | TẤT CẢ trường hợp |
| Thông tin hiển thị | Chỉ phụ thu | Đầy đủ: thời gian, tài chính |
| Khả năng nhầm lẫn | Cao (1-click check-in) | Thấp (phải xác nhận) |
| Nhân viên review | Không có cơ hội | Xem đầy đủ trước khi xác nhận |

