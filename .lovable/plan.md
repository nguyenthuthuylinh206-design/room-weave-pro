

## Kế hoạch: Phân biệt quy trình kiểm tra phòng theo loại

### Mục tiêu
Tạo workflow riêng biệt cho từng loại kiểm tra phòng, phù hợp với nghiệp vụ thực tế của khách sạn.

---

### Phase 1: Định nghĩa Actions theo từng loại check

**1.1 Kiểm tra hàng ngày (Daily)**

| Tab | Actions cho phép | Mô tả |
|-----|------------------|-------|
| Đồ vải | OK, Thay | Kiểm tra đồ còn sạch không, có cần thay không |
| Tiêu hao | OK, Hết | Kiểm tra còn đủ không |
| Thiết bị | OK, Hỏng | Chỉ báo cáo nếu thiết bị hỏng |
| Nội thất | OK, Hỏng | Chỉ báo cáo nếu nội thất hỏng |

**Đặc điểm:**
- KHÔNG có action "Mất" (không phải thời điểm tính toán)
- KHÔNG có action "Giặt" (chỉ ghi nhận thay, không tính lấy đồ bẩn)
- Focus vào vệ sinh và trạng thái phòng

---

**1.2 Kiểm tra trước Check-in (Pre Check-in)**

| Tab | Actions cho phép | Mô tả |
|-----|------------------|-------|
| Đồ vải | OK, Thiếu, Thêm | Kiểm tra đồ sạch đã được đặt đủ chưa |
| Tiêu hao | OK, Thiếu | Kiểm tra đồ dùng đã stock đầy đủ |
| Thiết bị | OK, Hỏng (block check-in) | Thiết bị phải hoạt động tốt |
| Nội thất | OK, Hỏng (block check-in) | Nội thất phải nguyên vẹn |

**Đặc điểm:**
- KHÔNG có action "Mất/Giặt/Đổi" (phòng đã dọn xong)
- Nếu có item "Hỏng" -> Cảnh báo KHÔNG nên cho khách check-in
- Focus vào: Phòng đã sẵn sàng đón khách chưa?

---

**1.3 Kiểm tra sau Check-out (Post Checkout)**

| Tab | Actions cho phép | Mô tả |
|-----|------------------|-------|
| Đồ vải | OK, Giặt, Mất, Hỏng | Lấy đồ bẩn, ghi nhận mất/hỏng |
| Tiêu hao | OK, Đã dùng (+charge), Mất (+charge) | Ghi nhận sử dụng, charge khách |
| Thiết bị | OK, Mất (+charge), Hỏng (+charge) | Ghi nhận mất/hỏng, charge khách |
| Nội thất | OK, Hỏng (+charge) | Ghi nhận hỏng, charge khách |

**Đặc điểm:**
- CÓ ĐẦY ĐỦ actions để kiểm kê
- Liên kết với booking để hiển thị thông tin khách
- Tính toán damage charges trực tiếp
- Hoàn thành checkout_inspection_request

---

### Phase 2: Cập nhật UI Components

**2.1 Tạo config cho actions theo check_type**

File: `src/lib/roomCheckConfig.ts`

```typescript
export const CHECK_TYPE_CONFIG = {
  daily: {
    label: 'Kiểm tra hàng ngày',
    description: 'Kiểm tra vệ sinh và đồ dùng thường ngày',
    linenActions: ['ok', 'change'],  // Chỉ OK hoặc Thay
    consumableActions: ['ok', 'empty'],  // Chỉ OK hoặc Hết
    equipmentActions: ['ok', 'damaged'],
    furnitureActions: ['ok', 'damaged'],
    showBookingInfo: false,
    allowDamageCharges: false,
  },
  checkin: {
    label: 'Kiểm tra trước check-in',
    description: 'Đảm bảo phòng sẵn sàng cho khách',
    linenActions: ['ok', 'missing', 'add'],  // OK, Thiếu, Thêm
    consumableActions: ['ok', 'missing'],
    equipmentActions: ['ok', 'damaged'],
    furnitureActions: ['ok', 'damaged'],
    showBookingInfo: true,  // Hiển thị booking sắp tới
    allowDamageCharges: false,
    blockOnDamaged: true,  // Cảnh báo nếu có đồ hỏng
  },
  checkout: {
    label: 'Kiểm tra sau check-out',
    description: 'Kiểm kê sau khi khách rời đi',
    linenActions: ['ok', 'laundry', 'lost', 'damaged'],
    consumableActions: ['ok', 'consumed', 'lost'],
    equipmentActions: ['ok', 'lost', 'damaged'],
    furnitureActions: ['ok', 'damaged'],
    showBookingInfo: true,  // Hiển thị booking vừa checkout
    allowDamageCharges: true,  // Cho phép tính phí charge
    requireInspection: true,  // Yêu cầu checkout_inspection
  },
  maintenance: {
    label: 'Kiểm tra bảo trì',
    description: 'Kiểm tra sau sửa chữa',
    linenActions: ['ok', 'missing'],
    consumableActions: ['ok', 'missing'],
    equipmentActions: ['ok', 'damaged', 'replaced'],
    furnitureActions: ['ok', 'damaged', 'replaced'],
    showBookingInfo: false,
    allowDamageCharges: false,
  },
}
```

---

**2.2 Cập nhật LinenTab để nhận check_type**

Thêm prop `checkType` và filter actions theo config:

```typescript
interface LinenTabProps {
  items: ExtendedRoomItem[]
  checkType: CheckType  // THÊM MỚI
  laundryItems: LaundryItem[]
  // ...existing props
}

// Render buttons dựa trên config
const allowedActions = CHECK_TYPE_CONFIG[checkType].linenActions
```

---

**2.3 Cập nhật ConsumableTab tương tự**

- Daily: Chỉ "OK" hoặc "Hết"
- Checkin: Chỉ "OK" hoặc "Thiếu"
- Checkout: "OK", "Đã dùng", "Mất" + hiển thị unit_price

---

**2.4 Cập nhật ItemsCheckStep để truyền checkType**

```typescript
<LinenTab
  items={filterBySearch(linenItems)}
  checkType={form.watch('check_type')}  // THÊM
  laundryItems={laundryItems}
  // ...
/>
```

---

### Phase 3: Logic đặc biệt theo loại check

**3.1 Daily Check**
- Sau khi submit: Chỉ update room_items, KHÔNG tạo inventory_transaction cho "mất"
- Gửi notification nếu có vấn đề vệ sinh (cleanliness_score thấp)

**3.2 Pre Check-in**
- Hiển thị warning nếu có item "Thiếu" hoặc "Hỏng"
- Block submit với confirm dialog: "Phòng chưa sẵn sàng, vẫn tiếp tục?"
- Sau submit: Update room status về "vacant" nếu đạt yêu cầu

**3.3 Post Checkout**
- Hiển thị thông tin booking (guest name, dates)
- Tính toán damage charges real-time
- Sau submit:
  - Hoàn thành checkout_inspection_request
  - Tạo inventory_transaction cho items mất/hỏng
  - Update room status về "cleaning"
  - Gửi summary report cho manager

---

### Phase 4: UI khác biệt

**4.1 Thay đổi màu sắc header theo loại**

```typescript
const getCheckTypeColor = (type: CheckType) => {
  switch (type) {
    case 'daily': return 'bg-blue-50 border-blue-200'
    case 'checkin': return 'bg-green-50 border-green-200'
    case 'checkout': return 'bg-orange-50 border-orange-200'
    case 'maintenance': return 'bg-purple-50 border-purple-200'
  }
}
```

**4.2 Hiển thị booking info khi checkin/checkout**

```tsx
{(checkType === 'checkin' || checkType === 'checkout') && currentBooking && (
  <Card className="mb-4">
    <CardContent className="p-3">
      <div className="text-sm">
        <span className="text-muted-foreground">Khách: </span>
        <span className="font-medium">{currentBooking.guest_name}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {format(currentBooking.check_in_date)} - {format(currentBooking.check_out_date)}
      </div>
    </CardContent>
  </Card>
)}
```

**4.3 Summary khác nhau khi review**

- Daily: "Vệ sinh: X/10, Có Y item cần thay"
- Checkin: "Phòng sẵn sàng: Có/Không, X item thiếu"
- Checkout: "Tổng phí charge: XXX VND, Giặt Y items"

---

### Tổng kết Files cần thay đổi

| File | Thay đổi |
|------|----------|
| `src/lib/roomCheckConfig.ts` | TẠO MỚI - Config actions theo check_type |
| `src/components/rooms/check-steps/ItemsCheckStep.tsx` | Truyền checkType xuống tabs |
| `src/components/rooms/check-steps/item-type-tabs/LinenTab.tsx` | Filter actions theo checkType |
| `src/components/rooms/check-steps/item-type-tabs/ConsumableTabBooking.tsx` | Filter actions theo checkType |
| `src/components/rooms/check-steps/item-type-tabs/EquipmentTab.tsx` | Filter actions theo checkType |
| `src/components/rooms/check-steps/item-type-tabs/FurnitureTab.tsx` | Filter actions theo checkType |
| `src/components/rooms/check-steps/ReviewStep.tsx` | Summary khác nhau theo checkType |
| `src/pages/rooms/RoomCheckPage.tsx` | Hiển thị booking info, màu header |
| `src/hooks/useRoomChecks.ts` | Logic xử lý khác nhau theo checkType |

---

### Kết quả mong đợi

| Loại | Trước | Sau |
|------|-------|-----|
| Daily | Quá nhiều options không cần thiết | Chỉ OK/Thay/Hết/Hỏng |
| Checkin | Không biết phòng có sẵn sàng không | Checklist rõ ràng, warning nếu chưa OK |
| Checkout | Không liên kết booking | Hiện thông tin khách, tính charge tự động |

