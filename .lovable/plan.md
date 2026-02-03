
## Kế hoạch: Gộp Checkout Nhóm thành 1 Thao tác Hoàn chỉnh

### PHÂN TÍCH YÊU CẦU

Người dùng yêu cầu một luồng checkout nhóm mới với các tính năng:

1. **Một thao tác checkout gộp** - Không cần checkout từng phòng riêng lẻ
2. **Hiển thị tất cả phòng khách đã đặt** - Danh sách phòng với checkbox chọn checkout
3. **Chọn checkout phòng nào** - Có thể checkout từng phòng hoặc tất cả
4. **Tiền cọc giữ đến phòng checkout cuối cùng** - Logic phân phối cọc
5. **Kiểm tra phòng vẫn có** - Mỗi phòng có checkout inspection
6. **Phân công nhân viên khác nhau cho mỗi phòng** - Select staff riêng biệt

---

### LUỒNG MỚI ĐỀ XUẤT

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED GROUP CHECKOUT DIALOG                          │
└──────────────────────────────────────────────────────────────────────────┘

Step 1: Hiển thị danh sách phòng + Chọn checkout
┌─────────────────────────────────────────────────────────────────────────┐
│  🚪 Checkout nhóm - Nguyễn Văn A                                        │
│  Đặt từ: 03/02 → 04/02 • 3 phòng                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ☑ CHỌN TẤT CẢ (3 phòng)                                                │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ☑ P.101 - Superior         [Đang ở]                               │  │
│  │   Nhân viên kiểm tra: [Chọn nhân viên...      ▼]                  │  │
│  │   Trạng thái: ○ Chưa gửi yêu cầu                                  │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ ☑ P.102 - Deluxe           [Đang ở]                               │  │
│  │   Nhân viên kiểm tra: [Trần Văn B (trong ca) ▼]                   │  │
│  │   Trạng thái: ⏳ Đang chờ kiểm tra                                 │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ ☐ P.103 - Suite            [Đang ở]                               │  │
│  │   (Bỏ qua - khách ở thêm)                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  [Gửi yêu cầu kiểm tra phòng đã chọn (2)]    ← Khi chưa gửi yêu cầu    │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  💰 THANH TOÁN                                                           │
│  Phòng checkout: 101, 102                                                │
│  Tổng tiền: 3.800.000đ                                                  │
│  Tiền cọc (giữ từ P.103): -500.000đ   ← Cọc từ phòng không checkout    │
│  Đã TT: -1.500.000đ                                                     │
│  ─────────────────────────────────────────────────────────────────────  │
│  CẦN THU: 1.800.000đ                                                    │
│                                                                          │
│  ⚠️ 1 phòng đang chờ kiểm tra. Có thể checkout sau khi kiểm tra xong.  │
│                                                                          │
│  [Thu nhỏ]    [Thanh toán]    [Checkout (2) phòng đã sẵn sàng]          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### CHI TIẾT THAY ĐỔI

#### 1. **Cải tiến `GroupCheckoutDialog.tsx`**

| Thành phần | Thay đổi |
|-----------|----------|
| State management | Thêm `selectedRooms: Set<string>` để track phòng được chọn checkout |
| Staff assignment | Thêm map `staffAssignments: Record<bookingId, staffId>` cho mỗi phòng |
| Deposit logic | Tính tiền cọc chỉ trừ khi checkout phòng cuối cùng |
| Batch inspection | Cho phép gửi nhiều yêu cầu kiểm tra cùng lúc |
| Selective checkout | Chỉ checkout các phòng được chọn + đã hoàn thành kiểm tra |

**Cấu trúc state mới:**
```typescript
interface GroupCheckoutState {
  selectedRooms: Set<string>           // Booking IDs được chọn checkout
  staffAssignments: Map<string, string> // bookingId -> staffId
  inspectionRequests: Map<string, InspectionStatus>
}
```

#### 2. **Logic Tiền cọc mới**

```typescript
// Trong useGroupBooking.ts - thêm field deposit
interface GroupBookingData {
  // ... existing fields
  totalDeposit: number           // Tổng cọc của cả nhóm
  depositPerRoom: number[]       // Cọc từng phòng
}

// Khi tính toán checkout:
function calculateGroupCheckoutAmount(
  selectedBookingIds: string[],
  allBookings: GroupBookingRoom[],
  allCheckedOut: boolean
) {
  const selectedBookings = allBookings.filter(b => selectedBookingIds.includes(b.id))
  const remainingBookings = allBookings.filter(
    b => !selectedBookingIds.includes(b.id) && b.status !== 'checked_out'
  )
  
  // Tổng cần thu từ các phòng được chọn
  let totalOwed = selectedBookings.reduce((sum, b) => 
    sum + (b.total_amount || 0) - (b.amount_paid || 0), 0
  )
  
  // Nếu còn phòng khác chưa checkout -> Giữ tiền cọc
  // Nếu đây là lần checkout cuối cùng -> Áp dụng cọc
  const isLastCheckout = remainingBookings.length === 0
  
  if (isLastCheckout) {
    // Trừ tổng tiền cọc của cả nhóm
    totalOwed -= groupDeposit
  }
  
  return {
    totalOwed,
    isLastCheckout,
    depositApplied: isLastCheckout ? groupDeposit : 0,
    holdingDeposit: !isLastCheckout ? groupDeposit : 0,
  }
}
```

#### 3. **Component Room Card với Staff Assignment**

```tsx
// Compact room card với staff selector
function RoomCheckoutCard({ 
  booking, 
  selected, 
  onSelect, 
  staffAssignment,
  onStaffChange,
  inspectionStatus,
  staffList,
}: RoomCheckoutCardProps) {
  const isCheckedOut = booking.status === 'checked_out'
  
  return (
    <div className={cn(
      "border rounded-lg p-3",
      selected && "bg-blue-50 border-blue-200",
      isCheckedOut && "opacity-50"
    )}>
      <div className="flex items-start gap-3">
        {/* Checkbox - disabled if already checked out */}
        <Checkbox 
          checked={selected}
          onCheckedChange={onSelect}
          disabled={isCheckedOut}
        />
        
        <div className="flex-1 space-y-2">
          {/* Room info */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">P.{booking.room?.room_number}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {booking.room?.room_type}
              </span>
            </div>
            <Badge variant={isCheckedOut ? 'secondary' : 'outline'}>
              {isCheckedOut ? 'Đã trả' : 'Đang ở'}
            </Badge>
          </div>
          
          {/* Staff selector - only show if selected and not checked out */}
          {selected && !isCheckedOut && (
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">NV kiểm tra:</Label>
              <Select 
                value={staffAssignment} 
                onValueChange={onStaffChange}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Chọn nhân viên..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={staff.avatar_url} />
                          <AvatarFallback>{staff.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span>{staff.full_name}</span>
                        <span className="text-xs text-green-600">(trong ca)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Inspection status */}
          {selected && !isCheckedOut && inspectionStatus && (
            <InspectionStatusBadge status={inspectionStatus} />
          )}
        </div>
      </div>
    </div>
  )
}
```

#### 4. **Batch Inspection Request**

```typescript
// Gửi yêu cầu kiểm tra cho nhiều phòng cùng lúc
const handleBatchInspectionRequest = async () => {
  const roomsToRequest = Array.from(selectedRooms).filter(bookingId => {
    const inspection = inspectionMap.get(bookingId)
    return !inspection || inspection.status === 'not_requested'
  })
  
  if (roomsToRequest.length === 0) {
    toast.info('Tất cả phòng đã được gửi yêu cầu kiểm tra')
    return
  }
  
  setIsProcessing(true)
  try {
    for (const bookingId of roomsToRequest) {
      const booking = groupData.bookings.find(b => b.id === bookingId)
      const staffId = staffAssignments.get(bookingId)
      
      if (!staffId) {
        toast.error(`Chưa chọn nhân viên cho phòng ${booking?.room?.room_number}`)
        continue
      }
      
      // Create inspection + housekeeping task
      await supabase.from('checkout_inspection_requests').insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        room_id: booking.room_id,
        booking_id: bookingId,
        assigned_to: staffId,
        requested_by: currentUserId,
        status: 'pending',
      })
      
      await supabase.from('housekeeping_tasks').insert({
        tenant_id: tenantId,
        hotel_id: hotelId,
        room_id: booking.room_id,
        booking_id: bookingId,
        assigned_to: staffId,
        task_type: 'checkout_inspection',
        title: `Kiểm tra checkout P.${booking?.room?.room_number}`,
        priority: 'high',
        status: 'pending',
      })
    }
    
    toast.success(`Đã gửi ${roomsToRequest.length} yêu cầu kiểm tra`)
    refetchInspections()
  } catch (error) {
    toast.error('Lỗi gửi yêu cầu kiểm tra')
  } finally {
    setIsProcessing(false)
  }
}
```

#### 5. **Selective Checkout**

```typescript
// Checkout chỉ các phòng đã chọn và đã sẵn sàng
const handleSelectiveCheckout = async () => {
  const readyRooms = Array.from(selectedRooms).filter(bookingId => {
    const inspection = inspectionMap.get(bookingId)
    return inspection?.status === 'completed' || inspection?.status === 'not_requested'
  })
  
  if (readyRooms.length === 0) {
    toast.error('Không có phòng nào sẵn sàng checkout')
    return
  }
  
  // Check payment status
  if (totals.remaining > 0) {
    setShowPaymentDialog(true)
    return
  }
  
  setIsProcessing(true)
  try {
    const now = new Date().toISOString()
    
    for (const bookingId of readyRooms) {
      const booking = groupData.bookings.find(b => b.id === bookingId)
      
      // Use RPC for atomic checkout
      await supabase.rpc('perform_checkout', {
        p_booking_id: bookingId,
        p_room_id: booking.room_id,
        p_late_checkout_charge: 0, // Already calculated
        p_service_charges: 0,
        p_subtotal: booking.total_amount,
        p_vat_amount: 0,
        p_service_fee_amount: 0,
        p_total_amount: booking.total_amount,
      })
    }
    
    toast.success(`Đã checkout ${readyRooms.length} phòng thành công!`)
    
    // If all rooms checked out, close dialog
    const allDone = groupData.bookings.every(b => 
      b.status === 'checked_out' || readyRooms.includes(b.id)
    )
    if (allDone) {
      onOpenChange(false)
    }
    
    queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  } catch (error) {
    toast.error('Lỗi checkout')
  } finally {
    setIsProcessing(false)
  }
}
```

---

### CẬP NHẬT HOOK `useGroupBooking.ts`

Thêm các fields mới để hỗ trợ checkout:

```typescript
export interface GroupBookingRoom {
  // ... existing fields
  deposit_amount: number          // NEW: Tiền cọc từng phòng
  late_checkout_charge: number    // NEW: Phí trễ (nếu có)
  damage_charge: number           // NEW: Phí đền bù (nếu có)
}

export interface GroupBookingData {
  // ... existing fields
  totalDeposit: number            // NEW: Tổng cọc cả nhóm
  roomsCheckedOut: number         // NEW: Số phòng đã checkout
  roomsRemaining: number          // NEW: Số phòng còn lại
}

// Query cập nhật
const { data, error } = await supabase
  .from('room_bookings')
  .select(`
    id, room_id, guest_name, guest_phone,
    check_in_date, check_out_date,
    actual_check_in, actual_check_out,
    status, total_amount, amount_paid, payment_status,
    booking_type, deposit_amount,              // ADD deposit
    late_checkout_charge, service_charges,     // ADD charges
    room:rooms(room_number, room_type)
  `)
  .eq('booking_group_id', bookingGroupId)
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/bookings/GroupCheckoutDialog.tsx` | **Viết lại toàn bộ** - UI mới với room selection, staff assignment |
| `src/hooks/useGroupBooking.ts` | Thêm fields deposit_amount, late_checkout_charge |
| `src/pages/bookings/BookingsPage.tsx` | Có thể giữ nguyên - chỉ gọi GroupCheckoutDialog |

---

### LUỒNG NGƯỜI DÙNG SAU KHI TRIỂN KHAI

```text
1. Bấm "CO Nhóm" từ bất kỳ booking nào trong nhóm
   │
2. Dialog mở → Hiển thị tất cả phòng với checkbox
   │
3. Chọn phòng cần checkout (hoặc "Chọn tất cả")
   │
4. Gán nhân viên kiểm tra cho từng phòng đã chọn
   │
5. Bấm "Gửi yêu cầu kiểm tra" → Tạo batch requests
   │
6. Chờ nhân viên kiểm tra → UI realtime cập nhật status
   │  ├─ Có thể "Thu nhỏ" dialog để xử lý khách khác
   │  └─ Badge thông báo khi có phòng hoàn thành
   │
7. Khi phòng sẵn sàng → Bấm "Checkout (X phòng)"
   │  ├─ Nếu còn nợ → Mở thanh toán trước
   │  └─ Nếu đủ tiền → Checkout ngay
   │
8. Tiền cọc:
   ├─ Nếu còn phòng khác → Giữ cọc, hiển thị thông báo
   └─ Nếu checkout hết → Trừ cọc vào tổng
```

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau |
|--------|-------|-----|
| Thao tác checkout 3 phòng | 3 lần riêng lẻ | 1 lần gộp |
| Gán nhân viên kiểm tra | Từng phòng | Batch cùng lúc |
| Quản lý tiền cọc nhóm | Không có | Giữ đến phòng cuối |
| Linh hoạt checkout | Tất cả hoặc không | Chọn phòng bất kỳ |
| Theo dõi tiến độ kiểm tra | Từng dialog | 1 dashboard |
