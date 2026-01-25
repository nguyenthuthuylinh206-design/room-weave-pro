
## Kế hoạch: Phân loại và Thông báo vật dụng tiêu hao tính phí

### I. THAY ĐỔI DATABASE

#### 1.1 Thêm cột phân loại vào bảng `items`

```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_chargeable BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN DEFAULT true;
-- is_complimentary = true: Đồ miễn phí (bàn chải, xà phòng)
-- is_chargeable = true: Đồ tính tiền (minibar, đồ uống)
```

#### 1.2 Tạo bảng tracking đồ tính tiền đã dùng

```sql
CREATE TABLE chargeable_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  booking_id UUID NOT NULL REFERENCES room_bookings(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  is_billed BOOLEAN DEFAULT false,
  notes TEXT
);
```

### II. CẬP NHẬT UI QUẢN LÝ SẢN PHẨM

#### 2.1 Form tạo/sửa Item - Thêm tùy chọn phân loại

| Trường | Mô tả | Áp dụng |
|--------|-------|---------|
| `is_chargeable` | Đánh dấu "Có tính phí khách" | consumables |
| `is_complimentary` | Đánh dấu "Miễn phí đi kèm phòng" | consumables |
| `charge_price` | Giá bán cho khách (có thể khác unit_price) | consumables + chargeable |

**Files cần sửa:**
- `src/lib/validations/items.schemas.ts` - Thêm fields mới vào schema
- `src/pages/items/ItemFormPage.tsx` - Thêm toggle switches
- `src/components/items/MobileItemFormPage.tsx` - Mobile form

#### 2.2 UI hiển thị badge phân loại

- Badge "Tính phí" (màu đỏ) cho items chargeable
- Badge "Miễn phí" (màu xanh) cho items complimentary
- Cột "Loại tính phí" trong danh sách items

### III. CẬP NHẬT FLOW CHECKOUT

#### 3.1 Tab riêng cho đồ tính phí trong Room Check

**Component mới:** `ChargeableItemsStep.tsx`
- Hiển thị danh sách chỉ các items `is_chargeable = true`
- Input số lượng khách đã dùng cho mỗi item
- Tự động tính tổng tiền phụ thu

#### 3.2 Cập nhật `useRoomChecks.ts`

```typescript
// Khi save room check với check_type = 'checkout'
// Lọc và lưu consumables tính tiền vào chargeable_consumptions
const chargeableItems = items.filter(i => i.is_chargeable && i.consumed > 0)
await supabase.from('chargeable_consumptions').insert(chargeableItems.map(...))
```

#### 3.3 Cập nhật tính toán checkout

**File:** `src/hooks/useBookingActions.ts`
- Tách riêng `calculateChargeableConsumables()` chỉ tính đồ có `is_chargeable = true`
- Hiển thị rõ ràng trong breakdown: "Phụ thu minibar: X đ"

### IV. HỆ THỐNG THÔNG BÁO

#### 4.1 Thông báo realtime khi ghi nhận đồ tính phí

**Trigger:** Sau khi nhân viên ghi nhận consumables trong Room Check

**Nội dung thông báo:**
```
📦 Phòng 301 - Phụ thu minibar
• 2x Coca-Cola: 40.000đ
• 1x Snack: 25.000đ
Tổng: 65.000đ
```

**Người nhận:**
- Receptionist đang làm việc
- Manager (nếu số tiền > ngưỡng cảnh báo)

#### 4.2 File cần thêm/sửa

```
src/hooks/useChargeableConsumptions.ts - Hook quản lý
supabase/functions/notify-chargeable/index.ts - Edge function gửi thông báo
```

### V. HIỂN THỊ TRONG BOOKING DETAIL

#### 5.1 Component `ChargeableConsumablesCard.tsx`

Tách riêng từ `BookingConsumablesCard.tsx`:
- Chỉ hiển thị items có `is_chargeable = true`
- Highlight với màu khác (đỏ/cam)
- Hiển thị badge "Chưa thu" / "Đã thu"

#### 5.2 Checkout Summary Dialog

Thêm section riêng:
```
╔═══════════════════════════════╗
║ 💰 PHỤ THU MINIBAR            ║
╠═══════════════════════════════╣
║ Coca-Cola (2x)       40.000đ  ║
║ Snack (1x)           25.000đ  ║
╠═══════════════════════════════╣
║ TỔNG PHỤ THU:        65.000đ  ║
╚═══════════════════════════════╝
```

### VI. DANH SÁCH FILES CẦN THAY ĐỔI

| File | Loại | Mô tả |
|------|------|-------|
| `supabase/migrations/xxx.sql` | Migration | Thêm cột + bảng mới |
| `src/types/items.types.ts` | Type | Thêm interface fields |
| `src/lib/validations/items.schemas.ts` | Validation | Thêm fields schema |
| `src/pages/items/ItemFormPage.tsx` | UI | Toggle tính phí |
| `src/components/items/MobileItemFormPage.tsx` | Mobile UI | Toggle tính phí |
| `src/hooks/useChargeableConsumptions.ts` | Hook | CRUD consumptions |
| `src/components/rooms/check-steps/ChargeableItemsStep.tsx` | Component | Tab đồ tính phí |
| `src/components/bookings/ChargeableConsumablesCard.tsx` | Component | Card phụ thu |
| `src/hooks/useBookingActions.ts` | Hook | Tính toán riêng |
| `supabase/functions/notify-chargeable/index.ts` | Edge Fn | Gửi thông báo |

### VII. KẾT QUẢ SAU TRIỂN KHAI

1. ✅ Phân loại rõ ràng đồ miễn phí vs tính tiền
2. ✅ Thông báo realtime khi khách sử dụng đồ tính tiền
3. ✅ Checkout không bỏ sót phí phụ thu
4. ✅ Báo cáo doanh thu minibar/phụ thu riêng
5. ✅ Quản lý dễ dàng qua UI form items
