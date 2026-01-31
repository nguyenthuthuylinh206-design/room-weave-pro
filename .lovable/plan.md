
## Kế hoạch: Mở rộng nút GIAO → Room Check liền mạch + Dọn dẹp

### TỔNG QUAN

Khi nhân viên ấn nút **GIAO** trên phiếu giao hàng:
1. Gọi API `deliver_stop` để đánh dấu đã giao ở backend
2. Tự động chuyển đến trang **Room Check** với loại kiểm tra mới: `delivery`
3. Luồng kiểm tra giao hàng gồm 3 bước:
   - **Bước 1**: Xác nhận đồ đã giao + Bổ sung nếu thiếu
   - **Bước 2**: Tình trạng phòng & Yêu cầu dọn dẹp
   - **Bước 3**: Xem lại & Hoàn tất

### THIẾT KẾ LUỒNG MỚI

```text
+------------------+      +------------------+      +------------------+
|   GIAO (button)  | ---> | Room Check Page  | ---> |   Hoàn thành     |
|                  |      | type=delivery    |      |   (quay lại DS)  |
+------------------+      +------------------+      +------------------+
        |                         |
        v                         v
 deliver_stop API         3 bước kiểm tra:
 (đánh dấu delivered)     1. Xác nhận đồ giao
                          2. Dọn dẹp phòng
                          3. Hoàn tất
```

---

### CHI TIẾT TRIỂN KHAI

#### 1. Thêm Check Type mới: `delivery`

**File: `src/lib/roomCheckConfig.ts`**

```typescript
export type CheckType = 'daily' | 'checkin' | 'checkout' | 'maintenance' | 'delivery'

delivery: {
  label: 'Kiểm tra sau giao hàng',
  description: 'Xác nhận đồ đã giao và tình trạng phòng',
  headerColor: 'bg-cyan-50 border-cyan-200',
  headerTextColor: 'text-cyan-700',
  linenActions: ['ok', 'add', 'change'],        // OK, Thêm, Đổi
  consumableActions: ['ok', 'empty'],            // OK, Hết
  equipmentActions: ['ok'],
  furnitureActions: ['ok'],
  showBookingInfo: false,
  allowDamageCharges: false,
  blockOnDamaged: false,
  requireInspection: false,
}
```

#### 2. Cập nhật UnifiedRoomList - Chuyển hướng sau khi GIAO

**File: `src/components/distribution/components/UnifiedRoomList.tsx`**

Thay đổi hàm `handleDeliver`:

```typescript
const handleDeliver = (stop: RouteStop) => {
  deliverStop.mutate(
    {
      roomOrderId: stop.id,
      roomInfo: { ... }
    },
    { 
      onSuccess: () => {
        onRefresh?.()
        // TỰ ĐỘNG CHUYỂN ĐẾN ROOM CHECK
        navigate(`/rooms/${stop.room_id}/check?type=delivery&distribution_order_id=${stop.distribution_order_id}&room_order_id=${stop.id}`)
      } 
    }
  )
}
```

#### 3. Cập nhật RoomCheckPage - Hỗ trợ luồng delivery

**File: `src/pages/rooms/RoomCheckPage.tsx`**

- Thêm `delivery` vào danh sách prefilledType
- Đọc `distribution_order_id` và `room_order_id` từ URL
- Luồng delivery có 3 bước:
  1. **Xác nhận đồ giao** (hiển thị danh sách từ phiếu)
  2. **Tình trạng dọn dẹp** (CleaningRequestStep)
  3. **Hoàn tất** (ReviewStep)

```typescript
const distributionOrderId = searchParams.get('distribution_order_id')
const roomOrderId = searchParams.get('room_order_id')
const isDeliveryType = watchedCheckType === 'delivery'

// Số bước cho delivery
const getTotalSteps = () => {
  if (quickMode) return 2
  if (isCheckoutType) return 6
  if (isDeliveryType) return 3  // NEW: Đồ giao → Dọn dẹp → Hoàn tất
  return 3
}
```

#### 4. Component mới: DeliveryItemsStep

**File mới: `src/components/rooms/check-steps/DeliveryItemsStep.tsx`**

Hiển thị danh sách đồ từ phiếu giao hàng và cho phép:
- ✅ Xác nhận đã giao đủ
- ➕ Bổ sung thêm (nếu thiếu)
- 🔄 Đổi/thay (nếu đồ cũ hỏng)

```typescript
interface DeliveryItemsStepProps {
  distributionOrderId: string
  roomOrderId: string
  form: UseFormReturn<RoomCheckFormData>
  roomId: string
  hotelId: string
  tenantId: string
}
```

#### 5. Cập nhật CheckTypeStep - Thêm icon delivery

**File: `src/components/rooms/check-steps/CheckTypeStep.tsx`**

```typescript
const checkTypes = [
  // ... existing types
  {
    value: 'delivery',
    label: 'Sau giao hàng',
    shortLabel: 'Giao hàng',
    icon: Package,
  },
]
```

#### 6. Quay lại phiếu giao hàng sau khi hoàn tất

Sau khi submit Room Check loại `delivery`, tự động quay lại trang phiếu giao hàng:

```typescript
// Trong onSubmit của RoomCheckPage
if (data.check_type === 'delivery' && distributionOrderId) {
  navigate(`/inventory/distributions/${distributionOrderId}`)
} else {
  navigate(isManager ? `/rooms/${id}` : '/rooms')
}
```

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/lib/roomCheckConfig.ts` | Thêm type `delivery` + config |
| `src/components/distribution/components/UnifiedRoomList.tsx` | Chuyển hướng đến Room Check sau GIAO |
| `src/pages/rooms/RoomCheckPage.tsx` | Hỗ trợ luồng 3 bước cho delivery |
| `src/components/rooms/check-steps/DeliveryItemsStep.tsx` | Component mới hiển thị đồ giao |
| `src/components/rooms/check-steps/CheckTypeStep.tsx` | Thêm icon + option delivery |
| `src/types/rooms.types.ts` | Cập nhật CheckType type |

---

### LƯU Ý QUAN TRỌNG

1. **Luồng delivery đơn giản hơn checkout**: Không có 2 giai đoạn, không tính phí, chỉ xác nhận + bổ sung + dọn dẹp
2. **Tự động quay lại phiếu**: Sau khi hoàn tất, nhân viên quay lại phiếu để tiếp tục giao các phòng khác
3. **Không tạo task housekeeping riêng**: Vì đã gộp dọn dẹp vào luồng, không cần tạo task `delivery_confirmation` nữa
