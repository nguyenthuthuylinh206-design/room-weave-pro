

## Kế hoạch sửa lỗi: Định dạng tiền tệ và đơn vị giá phòng theo loại booking

### VẤN ĐỀ HIỆN TẠI

| Vấn đề | Hiện trạng | Yêu cầu |
|--------|------------|---------|
| **Input giá phòng** | Hiển thị `1500000` | Hiển thị `1.500.000` có dấu phân cách |
| **Đơn vị giá** | Cố định "đ/đêm" | Thay đổi theo `bookingType` |
| **Placeholder** | Cố định "Giá/đêm" | Thay đổi theo `bookingType` |
| **Label tổng giá** | "Tổng giá phòng/đêm" | Thay đổi theo `bookingType` |

### SƠ ĐỒ LOGIC

```text
┌─────────────────────────────────────────────────────────────┐
│                   state.bookingType                         │
├────────────┬────────────────┬───────────────────────────────┤
│   daily    │    hourly      │    monthly                    │
├────────────┼────────────────┼───────────────────────────────┤
│ Đơn vị:    │ Đơn vị:        │ Đơn vị:                       │
│ đ/đêm      │ đ/giờ          │ đ/tháng                       │
│            │                │                               │
│ Placeholder:│ Placeholder:  │ Placeholder:                  │
│ Giá/đêm    │ Giá/giờ        │ Giá/tháng                     │
│            │                │                               │
│ Dùng:      │ Dùng:          │ Dùng:                         │
│ base_price │ hourly_price   │ monthly_price                 │
│            │ hoặc tính từ   │ hoặc tính từ                  │
│            │ base_price     │ base_price                    │
└────────────┴────────────────┴───────────────────────────────┘
```

### CHI TIẾT SỬA FILE

**File:** `src/components/bookings/booking-wizard/steps/RoomSelectionStep.tsx`

#### 1. Thêm helper function để lấy text theo booking type

```typescript
// Thêm sau getRoomTypeLabel (khoảng line 52)
const getPriceUnitLabel = (bookingType: string) => {
  switch (bookingType) {
    case 'hourly': return 'đ/giờ'
    case 'monthly': return 'đ/tháng'
    default: return 'đ/đêm' // daily
  }
}

const getPricePlaceholder = (bookingType: string) => {
  switch (bookingType) {
    case 'hourly': return 'Giá/giờ'
    case 'monthly': return 'Giá/tháng'
    default: return 'Giá/đêm'
  }
}

const getTotalLabel = (bookingType: string) => {
  switch (bookingType) {
    case 'hourly': return 'Tổng giá phòng/giờ:'
    case 'monthly': return 'Tổng giá phòng/tháng:'
    default: return 'Tổng giá phòng/đêm:'
  }
}
```

#### 2. Sửa Input giá để hiển thị dấu phân cách

```typescript
// Thay đổi Input (Line 164-173)
<Input
  type="text"
  inputMode="numeric"
  value={room.customPrice > 0 ? formatNumber(room.customPrice) : ''}
  onChange={(e) => {
    // Loại bỏ tất cả ký tự không phải số
    const value = e.target.value.replace(/[^0-9]/g, '')
    onUpdateRoomPrice(room.id, parseInt(value) || 0)
  }}
  placeholder={getPricePlaceholder(state.bookingType)}
  className="w-28 h-8 text-right"
/>
```

Cần import thêm `formatNumber` từ `@/lib/utils`.

#### 3. Sửa đơn vị giá (Line 175)

```typescript
// Từ:
<span className="text-xs text-muted-foreground whitespace-nowrap">đ/đêm</span>

// Thành:
<span className="text-xs text-muted-foreground whitespace-nowrap">
  {getPriceUnitLabel(state.bookingType)}
</span>
```

#### 4. Sửa label tổng giá (Line 192)

```typescript
// Từ:
<span className="text-muted-foreground">Tổng giá phòng/đêm:</span>

// Thành:
<span className="text-muted-foreground">{getTotalLabel(state.bookingType)}</span>
```

#### 5. Sửa giá hiển thị trên room card (Line 117-120)

Hiện tại luôn hiển thị `base_price`, cần thay đổi theo `bookingType`:

```typescript
// Thay đổi logic hiển thị giá trong room card
{(() => {
  let displayPrice = room.base_price
  if (state.bookingType === 'hourly' && room.hourly_price) {
    displayPrice = room.hourly_price
  } else if (state.bookingType === 'monthly' && room.monthly_price) {
    displayPrice = room.monthly_price
  }
  return displayPrice && displayPrice > 0 ? (
    <span className="text-xs font-medium text-primary">
      {formatCurrency(displayPrice)}
    </span>
  ) : null
})()}
```

### KẾT QUẢ MONG ĐỢI

| Booking Type | Input Display | Unit Label | Placeholder | Tổng Label |
|--------------|--------------|------------|-------------|------------|
| **daily** | 1.500.000 | đ/đêm | Giá/đêm | Tổng giá phòng/đêm: |
| **hourly** | 200.000 | đ/giờ | Giá/giờ | Tổng giá phòng/giờ: |
| **monthly** | 10.000.000 | đ/tháng | Giá/tháng | Tổng giá phòng/tháng: |

### FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/bookings/booking-wizard/steps/RoomSelectionStep.tsx` | Thêm helper functions, sửa Input/Label/Unit |

