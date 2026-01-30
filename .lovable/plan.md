

## Kế hoạch: Tiếp tục fix các lỗi trong 2-Phase Checkout Room Check

### Phân tích các vấn đề còn lại

Sau khi review code, tôi phát hiện các vấn đề sau:

---

### Vấn đề 1: Nút "Quay lại" ở Step 4 cho phép quay về Step 3

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 614-618

**Vấn đề:** Khi ở Step 4 (Phase 2 Items), nút "Quay lại" (`handleBack()`) cho phép quay về Step 3 (Phase 1 Confirm). Tuy nhiên, Phase 1 đã gửi rồi (`phase1Submitted = true`), việc quay lại sẽ gây nhầm lẫn vì UI hiển thị "Đã gửi" nhưng không có gì để làm.

**Giải pháp:** Cập nhật `handleBack()` để:
- Khi ở Step 4 checkout và `phase1Submitted = true` → Hiển thị toast cảnh báo hoặc skip Step 3
- Hoặc đơn giản hơn: cho phép quay lại nhưng Phase1ConfirmStep đã hiển thị đúng trạng thái "Đã gửi"

**Quyết định:** Giữ nguyên logic hiện tại vì `Phase1ConfirmStep` đã xử lý đúng - khi `phase1Submitted = true`, nó hiển thị thông báo "Đã gửi" và nút "Tiếp tục". UX này hợp lý.

---

### Vấn đề 2: Không có chỉ báo phase hiện tại trong UI

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 1008-1017

**Vấn đề:** Mặc dù step titles đã được update, nhưng không có indicator rõ ràng cho nhân viên biết đang ở Phase 1 hay Phase 2.

**Giải pháp:** Thêm badge/chip "Phase 1" hoặc "Phase 2" vào header hoặc step title khi `isCheckoutType`.

```typescript
// Ví dụ trong CardTitle
{currentStep === 2 && !quickMode && isCheckoutType && (
  <>
    <Badge variant="outline" className="mr-2 bg-orange-100 text-orange-700">Phase 1</Badge>
    Kiểm tra đồ tính phí & mất/hỏng
  </>
)}
```

---

### Vấn đề 3: Step 3 (Phase1ConfirmStep) không có ChargeableItemsStep khi không có booking

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 1066-1067

**Vấn đề:** `ChargeableItemsStep` chỉ render khi có `currentBooking`. Nếu không có booking (trường hợp hiếm), UI sẽ thiếu phần chọn đồ tính phí.

**Hiện trạng:** Code đã check `{currentBooking && (...)}` nên không crash. Tuy nhiên, nếu checkout mà không có booking thì flow sẽ không hợp lý.

**Giải pháp:** Không cần sửa - checkout luôn có booking, nếu không có thì UI đã handle đúng.

---

### Vấn đề 4: Duplicate chargeable submission trong final submit

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 667-696

**Vấn đề:** Trong `onSubmit()`, code vẫn save chargeable consumptions lại lần nữa:
```typescript
if (data.check_type === 'checkout' && chargeableItems.length > 0) {
  const savedItems = await createChargeableConsumptions.mutateAsync(chargeableItems)
  ...
}
```

Nhưng `chargeableItems` đã được save trong `handlePhase1Submit()` rồi. Điều này có thể gây duplicate entries.

**Giải pháp:** Thêm check để skip nếu Phase 1 đã submit:
```typescript
// Skip if already submitted in Phase 1
if (data.check_type === 'checkout' && chargeableItems.length > 0 && !phase1Submitted) {
  ...
}
```

---

### Vấn đề 5: `items_lost` không được lấy từ form đúng cách trong Phase1ConfirmStep

**Vị trí:** `src/components/rooms/check-steps/Phase1ConfirmStep.tsx`

**Kiểm tra:** Props `lostItems` và `damagedItems` được truyền từ RoomCheckPage với:
```typescript
lostItems={(form.getValues('items_lost') || []) as LostItem[]}
damagedItems={(form.getValues('items_damaged') || []) as DamagedItem[]}
```

**Phân tích:** `items_lost` không phải là field trong form schema. Đúng field là `items_missing` với `reason: 'lost'` hoặc state riêng `lostItems` trong `ItemsCheckStep`.

**Vấn đề thực sự:** `ItemsCheckStep` lưu `lostItems` vào form field `items_lost` (Line 213):
```typescript
form.setValue('items_lost', lostItems)
```

Nhưng trong `roomCheckFormSchema`, không có field `items_lost`! Điều này khiến dữ liệu lost items có thể không được persist đúng cách.

**Giải pháp cần kiểm tra:** Xác nhận schema có field `items_lost` hay không.

---

### Vấn đề 6: handlePhase1Submit chưa include lost/damaged items trong notification

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 581-591

**Vấn đề:** Code log lost/damaged items nhưng không thực sự gửi trong notification:
```typescript
if (lostItems.length > 0 || damagedItems.length > 0) {
  // This notification is for lost/damaged - could extend notify-chargeable or use a new function
  console.log('[RoomCheckPage] Phase 1: Lost/damaged items:', { lostItems, damagedItems, lostTotal, damagedTotal })
}
```

**Giải pháp:** Bổ sung lost/damaged vào payload của `notify-chargeable` hoặc tạo notification riêng.

---

### Thứ tự triển khai

| # | Công việc | File | Chi tiết |
|---|-----------|------|----------|
| 1 | Fix duplicate chargeable submission | `RoomCheckPage.tsx` | Thêm check `!phase1Submitted` |
| 2 | Thêm phase indicator vào step titles | `RoomCheckPage.tsx` | Badge "Phase 1/2" |
| 3 | Include lost/damaged trong Phase 1 notification | `RoomCheckPage.tsx` | Extend notify-chargeable payload |
| 4 | Verify form schema có items_lost | `rooms.schemas.ts` | Kiểm tra và add nếu thiếu |

### Ước tính: ~45 phút

