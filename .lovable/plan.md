

## Kế hoạch: Tái cấu trúc Checkout Room Check thành 2 giai đoạn liên tiếp

### Hiểu rõ yêu cầu

**Flow mới của bạn:**

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    LỄ TÂN YÊU CẦU KIỂM TRA CHECKOUT                  │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  NHÂN VIÊN A LÊN PHÒNG (1 LẦN DUY NHẤT)                              │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  PHASE 1: BÁO CÁO PHỤ THU ĐỂ LỄ TÂN TÍNH TIỀN                       │
│  ├── Kiểm tra đồ tiêu hao tính phí (minibar)                         │
│  ├── Kiểm tra đồ mất/hỏng                                            │
│  └── GỬI NGAY → Lễ tân nhận thông báo realtime → Tính tiền khách    │
│                                                                      │
│  PHASE 2: BÁO CÁO BỔ SUNG ĐỒ (tiếp tục ngay lập tức)                │
│  ├── Kiểm tra đồ cần bổ sung                                         │
│  ├── Đánh dấu đồ cần giặt/thay                                       │
│  ├── Đánh giá tình trạng phòng (sạch/bẩn)                            │
│  └── GỬI → Tạo Supplement Requests, Laundry Requests, Cleaning Task │
│                                                                      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  NHÂN VIÊN B (KHO) NHẬN PHIẾU GIAO                                   │
│  ├── Ra kho lấy đồ theo phiếu                                        │
│  ├── Lên phòng bổ sung đồ                                            │
│  └── Xác nhận hoàn thành                                             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PHÒNG SẴN SÀNG ĐÓN KHÁCH MỚI                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Điểm khác biệt quan trọng:**
- Nhân viên A **không quay lại phòng** - làm 2 phase liền mạch trong 1 lần
- Sau Phase 1: Gửi **thông báo realtime** cho lễ tân để tính tiền (không đợi)
- Sau Phase 2: Tự động tạo requests và phòng chuyển sang `cleaning`

### So sánh với hệ thống hiện tại

| Hiện tại (5 steps) | Mới (6 steps với điểm gửi giữa chừng) |
|-------------------|---------------------------------------|
| 1. Chọn loại kiểm tra | 1. Chọn loại kiểm tra |
| 2. Kiểm tra đồ dùng (tất cả) | 2. Kiểm tra đồ tính phí + mất/hỏng |
| 3. Phụ thu minibar | **3. GỬI PHASE 1 → Thông báo lễ tân** |
| 4. Tình trạng phòng | 4. Kiểm tra đồ bổ sung + giặt/thay |
| 5. Đánh giá & Hoàn tất | 5. Tình trạng phòng & Dọn dẹp |
|  | 6. Đánh giá & Hoàn tất (GỬI PHASE 2) |

---

### Chi tiết triển khai kỹ thuật

#### Bước 1: Cập nhật `roomCheckConfig.ts` - Thêm flags cho 2 phases

**File:** `src/lib/roomCheckConfig.ts`

Thêm config mới để phân biệt 2 giai đoạn:

```typescript
export interface CheckTypeConfig {
  // ... existing fields
  
  // NEW: Checkout 2-phase config
  hasIntermediateSubmit?: boolean      // Có gửi giữa chừng không (checkout only)
  phase1Actions?: {                     // Actions cho Phase 1 (tính phí)
    linen: LinenAction[]
    consumable: ConsumableAction[]
    equipment: EquipmentAction[]
    furniture: FurnitureAction[]
  }
  phase2Actions?: {                     // Actions cho Phase 2 (bổ sung)
    linen: LinenAction[]
    consumable: ConsumableAction[]
    equipment: EquipmentAction[]
    furniture: FurnitureAction[]
  }
}

// Checkout config mới
checkout: {
  // ... existing
  hasIntermediateSubmit: true,
  
  phase1Actions: {
    linen: ['ok', 'lost', 'damaged'],           // Chỉ báo mất/hỏng
    consumable: ['ok', 'consumed', 'lost'],      // Đã dùng, mất
    equipment: ['ok', 'lost', 'damaged'],        // Mất, hỏng
    furniture: ['ok', 'lost', 'damaged'],
  },
  
  phase2Actions: {
    linen: ['ok', 'laundry', 'change', 'add'],   // Giặt, thay, thêm
    consumable: ['ok', 'empty'],                  // Hết → cần bổ sung
    equipment: ['ok'],                            // Đã báo ở phase 1
    furniture: ['ok'],
  },
}
```

#### Bước 2: Cập nhật `RoomCheckPage.tsx` - Logic 2 phases

**File:** `src/pages/rooms/RoomCheckPage.tsx`

**Thay đổi chính:**

1. **Thêm state để track phase:**
```typescript
const [currentPhase, setCurrentPhase] = useState<1 | 2>(1)
const [phase1Submitted, setPhase1Submitted] = useState(false)
```

2. **Cập nhật `getTotalSteps()`:**
```typescript
const getTotalSteps = () => {
  if (quickMode) return 2
  if (isCheckoutType) return 6 // Type -> Phase1 Items -> Phase1 Confirm -> Phase2 Items -> Cleaning -> Review
  return 3
}
```

3. **Thêm step "Gửi Phase 1" với nút "Gửi cho lễ tân":**
   - Step 3 sẽ hiển thị tóm tắt Phase 1 (đồ tính phí, mất, hỏng)
   - Có nút "Gửi cho lễ tân" → gọi notification realtime
   - Sau khi gửi, tự động chuyển sang Step 4 (Phase 2)

4. **Logic gửi Phase 1:**
```typescript
const handlePhase1Submit = async () => {
  // 1. Save chargeable consumptions
  if (chargeableItems.length > 0) {
    await createChargeableConsumptions.mutateAsync(chargeableItems)
  }
  
  // 2. Gửi notification realtime cho lễ tân
  await supabase.functions.invoke('notify-chargeable', {
    body: {
      tenant_id: room.tenant_id,
      hotel_id: room.hotel_id,
      booking_id: currentBooking.id,
      room_id: id,
      room_number: room.room_number,
      items: chargeableItems,
      lost_items: lostItems,
      damaged_items: damagedItems,
      total_amount: calculateTotal(),
      recorded_by_name: user.full_name,
    }
  })
  
  // 3. Mark phase 1 as complete
  setPhase1Submitted(true)
  setCurrentPhase(2)
  setCurrentStep(4) // Move to Phase 2 Items
  
  toast({
    title: 'Đã gửi cho lễ tân',
    description: 'Bạn có thể tiếp tục kiểm tra đồ bổ sung',
  })
}
```

#### Bước 3: Tạo component `Phase1ConfirmStep.tsx`

**File mới:** `src/components/rooms/check-steps/Phase1ConfirmStep.tsx`

```typescript
// Hiển thị tóm tắt Phase 1
// - Đồ tính phí (minibar)
// - Đồ mất
// - Đồ hỏng
// - Tổng tiền phụ thu

// Có nút "Gửi cho lễ tân" màu cam nổi bật
// Có note: "Sau khi gửi, lễ tân sẽ nhận thông báo để tính tiền khách"
```

#### Bước 4: Tách `ItemsCheckStep` thành 2 phases

**Option A (Recommended):** Truyền prop `phase` vào `ItemsCheckStep`
```typescript
<ItemsCheckStep
  form={form}
  items={items}
  checkType="checkout"
  phase={currentPhase}  // 1 hoặc 2
/>
```

Trong `ItemsCheckStep`, filter actions theo phase:
```typescript
const getAvailableActions = (itemType: string) => {
  if (checkType === 'checkout' && phase === 1) {
    return checkTypeConfig.phase1Actions[itemType]
  }
  if (checkType === 'checkout' && phase === 2) {
    return checkTypeConfig.phase2Actions[itemType]
  }
  return checkTypeConfig[`${itemType}Actions`]
}
```

#### Bước 5: Cập nhật flow steps trong render

**File:** `src/pages/rooms/RoomCheckPage.tsx`

```typescript
// Step labels
{currentStep === 1 && 'Chọn loại kiểm tra'}
{currentStep === 2 && isCheckoutType && 'Kiểm tra đồ tính phí & mất/hỏng'}
{currentStep === 3 && isCheckoutType && 'Gửi báo cáo cho lễ tân'}
{currentStep === 4 && isCheckoutType && 'Kiểm tra đồ bổ sung & giặt/thay'}
{currentStep === 5 && isCheckoutType && 'Tình trạng phòng & Dọn dẹp'}
{currentStep === 6 && isCheckoutType && 'Đánh giá & Hoàn tất'}
```

---

### Sơ đồ UI mới cho Checkout

```text
┌─────────────────────────────────────────────────────────────────┐
│  Bước 1/6: Chọn loại kiểm tra                                   │
│  ─────────────────────────────────────────────────────────────  │
│  [Hàng ngày] [Check-in] [CHECK-OUT ✓] [Bảo trì]                 │
│                                                                 │
│                           [Tiếp theo →]                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Bước 2/6: Kiểm tra đồ tính phí & mất/hỏng                      │
│  ─────────────────────────────────────────────────────────────  │
│  ⚡ PHASE 1: Báo cáo để lễ tân tính tiền                         │
│                                                                 │
│  [Đồ vải] [Tiêu hao] [Thiết bị] [Nội thất]                      │
│                                                                 │
│  Minibar:                                                       │
│  ├── Coca Cola       [+] 2 [-]    50.000đ                       │
│  ├── Snack           [+] 1 [-]    30.000đ                       │
│                                                                 │
│  Đồ mất/hỏng:                                                   │
│  ├── Khăn tắm        [Mất x1]                                   │
│  ├── Remote TV       [Hỏng - cần thay]                          │
│                                                                 │
│                           [Tiếp theo →]                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Bước 3/6: Gửi báo cáo cho lễ tân                               │
│  ─────────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📋 TÓM TẮT PHỤ THU                                        │  │
│  │                                                           │  │
│  │  Đồ dùng tính phí:                                        │  │
│  │  • 2x Coca Cola          100.000đ                         │  │
│  │  • 1x Snack               30.000đ                         │  │
│  │                                                           │  │
│  │  Đồ mất:                                                  │  │
│  │  • 1x Khăn tắm           150.000đ                         │  │
│  │                                                           │  │
│  │  Đồ hỏng:                                                 │  │
│  │  • 1x Remote TV          200.000đ (thay thế)              │  │
│  │  ─────────────────────────────────────────────────────    │  │
│  │  TỔNG CỘNG:              480.000đ                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📱 Lễ tân sẽ nhận thông báo ngay khi bạn gửi                   │
│                                                                 │
│  [← Quay lại]         [🔔 GỬI CHO LỄ TÂN & TIẾP TỤC]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Bước 4/6: Kiểm tra đồ bổ sung & giặt/thay                      │
│  ─────────────────────────────────────────────────────────────  │
│  ⚡ PHASE 2: Yêu cầu bổ sung đồ dùng                             │
│                                                                 │
│  [Đồ vải] [Tiêu hao] [Thiết bị] [Nội thất]                      │
│                                                                 │
│  Đồ vải - Cần thay/giặt:                                        │
│  ├── Ga giường       [Giặt x1] [Thay sạch x1]                   │
│  ├── Khăn tắm        [Thêm x2]                                  │
│                                                                 │
│  Tiêu hao - Cần bổ sung:                                        │
│  ├── Dầu gội         [Hết - cần bổ sung]                        │
│  ├── Xà phòng        [Hết - cần bổ sung]                        │
│                                                                 │
│                           [Tiếp theo →]                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Bước 5/6: Tình trạng phòng & Dọn dẹp                           │
│  ─────────────────────────────────────────────────────────────  │
│  (Giữ nguyên CleaningRequestStep hiện tại)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Bước 6/6: Đánh giá & Hoàn tất                                  │
│  ─────────────────────────────────────────────────────────────  │
│  (Giữ nguyên ReviewStep hiện tại)                               │
│                                                                 │
│  [← Quay lại]                        [✓ HOÀN THÀNH KIỂM TRA]   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Thứ tự triển khai

| # | Công việc | File | Ước tính |
|---|-----------|------|----------|
| 1 | Cập nhật `roomCheckConfig.ts` với phase configs | Config | 20 phút |
| 2 | Tạo `Phase1ConfirmStep.tsx` | Component mới | 45 phút |
| 3 | Cập nhật `ItemsCheckStep.tsx` để support phases | Component | 40 phút |
| 4 | Cập nhật `RoomCheckPage.tsx` với logic 6 steps | Page | 60 phút |
| 5 | Cập nhật `notify-chargeable` edge function | Edge function | 20 phút |
| 6 | Testing & fix bugs | - | 30 phút |

**Tổng thời gian ước tính: ~3.5 giờ**

---

### Lợi ích của thiết kế mới

1. **Lễ tân nhận thông báo sớm hơn** → Có thể tính tiền khách ngay trong khi nhân viên A vẫn đang kiểm tra
2. **Nhân viên A không cần quay lại phòng** → Tiết kiệm thời gian
3. **Flow rõ ràng** → Phân biệt rõ 2 giai đoạn (tính tiền vs bổ sung đồ)
4. **Backward compatible** → Các loại kiểm tra khác (daily, checkin, maintenance) không bị ảnh hưởng

### Câu hỏi xác nhận

1. **Nút "Gửi cho lễ tân" có cần hiển thị loading/confirmation không?** Hay gửi ngay và chuyển sang bước tiếp theo?

2. **Nếu Phase 1 không có gì để báo cáo (không có phụ thu, không mất/hỏng)** → Có cần hiển thị Step 3 không? Hay tự động skip sang Step 4?

3. **Phase 1 đã gửi rồi, nhân viên có thể quay lại sửa không?** Hay chỉ cho phép tiến về phía trước?

