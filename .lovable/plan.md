

## Phân tích logic tính phí Minibar - Phát hiện lỗi

### Nghiệp vụ hiện tại

Hệ thống có **2 nguồn dữ liệu** ghi nhận đồ khách dùng, gây ra vấn đề tính phí trùng:

```text
┌─────────────────────────────────────────────────────────────┐
│                   ROOM CHECK (Checkout)                      │
│                                                              │
│  Step 1: ItemsCheckStep                                      │
│  → items_consumed (JSON trong room_checks)                   │
│  → Ghi nhận đồ tiêu hao: nước, snack, khăn... (ALL items)   │
│  → Lưu unit_price vào JSON                                   │
│                                                              │
│  Step 2: ChargeableItemsStep                                 │
│  → chargeable_consumptions (bảng riêng)                      │
│  → Chỉ đồ có is_chargeable=true                             │
│  → Lưu charge_price, tạo record billing chính thức           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              CHECKOUT COST CALCULATION                        │
│                                                              │
│  Source 1: fetchServiceChargeSummary()                        │
│  → Đọc chargeable_consumptions (is_billed=false)             │
│  → Cộng vào serviceCharges                                   │
│                                                              │
│  Source 2: room_checks.items_consumed                        │
│  → Đọc từ JSON room_checks                                   │
│  → Cộng vào damageCharges (item_type='consumed')             │
│                                                              │
│  → CÙNG MỘT MÓN ĐỒ bị tính 2 LẦN!                         │
└─────────────────────────────────────────────────────────────┘
```

---

### Bug 1: TÍNH PHÍ TRÙNG minibar/chargeable items 🔴 CRITICAL

**Luồng lỗi:**
1. Nhân viên checkout, bước "Items": đánh dấu nước ngọt đã dùng → `items_consumed` = [{name: "Coca", qty: 1, unit_price: 20k}]
2. Bước "Chargeable Items": chọn Coca (is_chargeable=true) → `chargeable_consumptions` = [{name: "Coca", qty: 1, unit_price: 20k}]
3. Khi tính tiền:
   - `fetchServiceChargeSummary()` → serviceCharges += 20k (từ `chargeable_consumptions`)
   - `items_consumed` từ room_checks → damageCharges += 20k (cộng như "consumed" damage)
   - **Tổng = 40k thay vì 20k**

**Ảnh hưởng:** Mọi file checkout đều bị: `BookingsPage.tsx`, `GroupCheckoutDialog.tsx`, `RoomBookingDialog.tsx`

**Sửa:** `items_consumed` từ `room_checks` KHÔNG nên cộng vào chi phí nếu đã có trong `chargeable_consumptions`. Cụ thể:
- Khi build `damageItems` từ room_checks, **loại bỏ `items_consumed`** khỏi damage charges. Chỉ giữ `items_lost` và `items_damaged`.
- Lý do: đồ consumed đã được track chính thức qua `chargeable_consumptions` table rồi (ChargeableItemsStep tạo record). `items_consumed` trong room_checks chỉ nên dùng cho **inventory tracking** (trừ kho), không phải billing.

---

### Bug 2: `CustomerUsedDialog` KHÔNG tạo chargeable_consumptions 🟡 HIGH

**Vị trí:** `src/components/rooms/CustomerUsedDialog.tsx`

**Vấn đề:** Khi nhân viên bấm "Khách đã dùng" từ danh sách đồ phòng:
- Chỉ gọi `useUpdateRoomItemQuantity` → giảm số lượng trong phòng
- **KHÔNG** tạo record `chargeable_consumptions`
- Nếu item có `is_chargeable=true`, phí sẽ bị mất hoàn toàn

**Sửa:** Sau khi giảm số lượng, kiểm tra item có `is_chargeable=true` không. Nếu có, tạo `chargeable_consumptions` record tự động. Cần thêm thông tin `booking_id` (từ current booking của phòng) và `is_chargeable`/`charge_price` vào props.

---

### Bug 3: `fetchServiceChargeSummary` chỉ đọc `is_billed=false` 🟡 MEDIUM

**Vị trí:** `src/hooks/useBookingServiceCharges.ts` line 42

```typescript
.eq('is_billed', false)  // Chỉ lấy chưa thu
```

**Vấn đề:** Khi tính `totalAmount` cho checkout, chỉ cộng phí minibar **chưa thu**. Nếu nhân viên đã "Đánh dấu đã thu" (mark as billed) trước checkout, phí đó biến mất khỏi tổng hóa đơn → `totalAmount` sai → `payment_status` sai.

**Sửa:** Tách thành 2 trường hợp:
- Khi hiển thị "còn lại cần thu" → filter `is_billed=false` (đúng)
- Khi tính `totalAmount` cho checkout/invoice → lấy **TẤT CẢ** (bỏ filter `is_billed`) để tổng hóa đơn phản ánh đúng toàn bộ chi phí

---

### Tóm tắt thay đổi

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| 1 | 🔴 | `BookingsPage.tsx`, `GroupCheckoutDialog.tsx`, `RoomBookingDialog.tsx`, `useGroupCheckoutCalculations.ts` | Loại bỏ `items_consumed` khỏi damageItems — chỉ giữ `items_lost` + `items_damaged` |
| 2 | 🟡 | `CustomerUsedDialog.tsx` | Tạo `chargeable_consumptions` khi item có `is_chargeable=true` |
| 3 | 🟡 | `useBookingServiceCharges.ts` | Thêm param `includeAllBilled` cho `fetchServiceChargeSummary`, dùng khi tính tổng checkout |

