

## Kế hoạch: Chặn Check-in khi Phòng đang Occupied

### VẤN ĐỀ HIỆN TẠI

| Layer | Kiểm tra | Status |
|-------|----------|--------|
| Database RPC | Chỉ check booking status | THIẾU |
| Client code | Chỉ check ngày check-in | THIẾU |
| Kết quả | Cho phép check-in khi phòng đang có khách | BUG |

**Hậu quả nghiêm trọng:**
- 2 booking cùng `checked_in` cho 1 phòng
- Phòng P102: Khách cũ chưa checkout + Khách mới đã check-in
- Dữ liệu không nhất quán, gây rối loạn vận hành

---

### GIẢI PHÁP

#### 1. Cập nhật RPC `perform_checkin` - Thêm validation room status

```sql
CREATE OR REPLACE FUNCTION perform_checkin(
  p_booking_id UUID,
  p_room_id UUID,
  p_early_checkin_charge NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_now TIMESTAMPTZ := now();
  v_room_status TEXT;
  v_current_booking_id UUID;
BEGIN
  -- THÊM: Kiểm tra room status trước khi check-in
  SELECT status INTO v_room_status
  FROM rooms WHERE id = p_room_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;
  
  -- THÊM: Chặn check-in nếu phòng đang occupied
  IF v_room_status = 'occupied' THEN
    -- Tìm booking hiện tại đang chiếm phòng
    SELECT rb.id INTO v_current_booking_id
    FROM room_bookings rb
    WHERE rb.room_id = p_room_id 
      AND rb.status = 'checked_in'
      AND rb.id != p_booking_id
    LIMIT 1;
    
    IF v_current_booking_id IS NOT NULL THEN
      RAISE EXCEPTION 'Room is currently occupied by another guest. Please checkout existing booking first.';
    END IF;
  END IF;
  
  -- THÊM: Chỉ cho phép check-in nếu phòng vacant, cleaning, hoặc check_out
  IF v_room_status NOT IN ('vacant', 'cleaning', 'check_out', 'reserved') THEN
    RAISE EXCEPTION 'Room status (%) does not allow check-in. Room must be vacant or cleaned.', v_room_status;
  END IF;

  -- Giữ nguyên logic cũ...
  UPDATE room_bookings
  SET 
    status = 'checked_in',
    actual_check_in = v_now,
    early_checkin_charge = p_early_checkin_charge,
    updated_at = v_now
  WHERE id = p_booking_id
    AND status IN ('confirmed', 'pending');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already checked in/out';
  END IF;

  UPDATE rooms
  SET 
    status = 'occupied',
    updated_at = v_now
  WHERE id = p_room_id;

  v_result := jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'room_id', p_room_id,
    'checked_in_at', v_now
  );

  RETURN v_result;
END;
$$;
```

#### 2. Cập nhật Client - Thêm validation trước khi gọi API

**File:** `src/pages/bookings/BookingsPage.tsx` - `handleCheckInClick`

```typescript
const handleCheckInClick = async (booking: BookingWithRoom) => {
  const now = new Date()
  const today = startOfDay(now)
  const checkInDate = startOfDay(new Date(booking.check_in_date))

  // Block check-in if today is before check_in_date
  if (isBefore(today, checkInDate)) {
    toast({
      variant: 'destructive',
      title: 'Chưa đến ngày nhận phòng',
      description: `Lịch nhận phòng: ${format(checkInDate, 'dd/MM/yyyy', { locale: vi })}.`,
    })
    return
  }

  // THÊM: Kiểm tra room status trước khi check-in
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('status')
    .eq('id', booking.room_id)
    .single()

  if (roomError) {
    toast({
      variant: 'destructive',
      title: 'Lỗi kiểm tra phòng',
      description: roomError.message,
    })
    return
  }

  // THÊM: Chặn nếu phòng đang occupied
  if (roomData.status === 'occupied') {
    // Kiểm tra booking nào đang chiếm phòng
    const { data: currentBooking } = await supabase
      .from('room_bookings')
      .select('id, guest_name, check_out_date')
      .eq('room_id', booking.room_id)
      .eq('status', 'checked_in')
      .neq('id', booking.id)
      .single()

    if (currentBooking) {
      toast({
        variant: 'destructive',
        title: 'Phòng đang có khách',
        description: `Khách "${currentBooking.guest_name}" chưa checkout (dự kiến: ${format(new Date(currentBooking.check_out_date), 'dd/MM/yyyy')}). Vui lòng checkout khách hiện tại trước.`,
      })
      return
    }
  }

  // THÊM: Chặn nếu phòng đang maintenance
  if (roomData.status === 'maintenance' || roomData.status === 'out_of_order') {
    toast({
      variant: 'destructive',
      title: 'Phòng không khả dụng',
      description: `Phòng đang trong trạng thái "${roomData.status}". Không thể check-in.`,
    })
    return
  }

  // Tiếp tục logic check-in hiện tại...
  setActionBooking(booking)
  // ...
}
```

#### 3. Cập nhật `RoomBookingDialog.tsx` - Tương tự

Thêm cùng logic validation vào `handleCheckInClick` trong component này.

#### 4. Cập nhật `useBookingActions.ts` - Thêm validation

```typescript
const handleCheckIn = async (bookingId: string, roomId: string) => {
  setIsLoading(true)
  try {
    // THÊM: Kiểm tra room status
    const { data: room, error: roomFetchError } = await supabase
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .single()

    if (roomFetchError) throw roomFetchError

    if (room.status === 'occupied') {
      throw new Error('Phòng đang có khách. Vui lòng checkout trước khi check-in.')
    }

    if (room.status === 'maintenance' || room.status === 'out_of_order') {
      throw new Error('Phòng đang bảo trì. Không thể check-in.')
    }

    // Giữ nguyên logic hiện tại...
    const { data: result, error: rpcError } = await supabase.rpc('perform_checkin', {
      p_booking_id: bookingId,
      p_room_id: roomId,
      p_early_checkin_charge: earlyCheckinCharge,
    })

    if (rpcError) throw rpcError
    // ...
  }
}
```

---

### ERROR MESSAGES TÙY CHỈNH

| Room Status | Message | Action |
|-------------|---------|--------|
| `occupied` | "Phòng đang có khách [Tên]. Vui lòng checkout trước." | Link đến checkout |
| `maintenance` | "Phòng đang bảo trì. Không thể check-in." | - |
| `out_of_order` | "Phòng ngừng hoạt động. Không thể check-in." | - |
| `cleaning` | Cho phép check-in (phòng sắp sẵn sàng) | - |

---

### QUY TRÌNH SAU KHI SỬA

```text
                    Bấm "Check-in"
                          │
              ┌───────────▼───────────┐
              │ Kiểm tra Room Status  │
              └───────────┬───────────┘
                          │
     ┌────────────────────┼────────────────────┐
     │                    │                    │
     ▼                    ▼                    ▼
 occupied             cleaning           maintenance
     │                    │                    │
     ▼                    ▼                    ▼
 ❌ CHẶN              ✅ CHO PHÉP          ❌ CHẶN
"Phòng có khách"     "Check-in"       "Phòng bảo trì"
     │                    │
     ▼                    │
"Checkout trước"          │
                          ▼
               ┌──────────────────────┐
               │ Kiểm tra Booking     │
               │ Status = confirmed?  │
               └──────────────────────┘
                          │
                    ✅ Check-in
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi | Độ phức tạp |
|------|----------|------------|
| Database Migration | Cập nhật RPC `perform_checkin` với room status check | Cao |
| `src/pages/bookings/BookingsPage.tsx` | Thêm validation room status trước check-in | Trung bình |
| `src/components/rooms/RoomBookingDialog.tsx` | Thêm validation tương tự | Trung bình |
| `src/hooks/useBookingActions.ts` | Thêm validation làm backup | Thấp |

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau |
|--------|-------|-----|
| Check-in khi phòng occupied | Cho phép (BUG) | Chặn + thông báo rõ |
| 2 booking checked_in cùng phòng | Có thể xảy ra | Không thể |
| Thông báo cho user | Không có | "Phòng đang có khách X, checkout trước" |
| Database integrity | Không đảm bảo | Đảm bảo 100% |

