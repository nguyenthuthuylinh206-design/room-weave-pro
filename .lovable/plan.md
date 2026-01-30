

## Kế hoạch: Fix các lỗi trong 2-Phase Checkout Room Check

### Phân tích hiện trạng

Sau khi review code, tôi phát hiện một số vấn đề cần sửa:

---

### Vấn đề 1: Phase 1 Confirm Step không có nút "Tiếp theo"

**Vị trí:** `src/components/rooms/check-steps/Phase1ConfirmStep.tsx`

**Vấn đề:** Sau khi `phase1Submitted = true`, component hiển thị nút "Tiếp tục kiểm tra" nhưng nút này không có `onClick` handler. Người dùng không thể chuyển sang step 4.

**Giải pháp:** Thêm prop `onContinue` để cho phép chuyển sang Phase 2.

```typescript
// Thêm prop
onContinue?: () => void

// Trong phần phase1Submitted
<Button variant="outline" className="gap-2" onClick={onContinue}>
  <ChevronRight className="h-4 w-4" />
  Tiếp tục kiểm tra
</Button>
```

---

### Vấn đề 2: handleNext logic cho Step 3 checkout

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 514-517

**Vấn đề:** Khi ở Step 3 (Phase 1 Confirm), nút "Tiếp theo" gọi `handleNext()` nhưng logic chỉ set `isValid = true` mà không xử lý phase transition đúng cách.

**Giải pháp:** Cập nhật `handleNext()` để:
1. Nếu `phase1Submitted = true` → cho phép tiến sang step 4
2. Nếu `phase1Submitted = false` → block và hiển thị toast yêu cầu gửi Phase 1 trước

```typescript
} else if (currentStep === 3 && isCheckoutType) {
  // Phase 1 must be submitted before proceeding
  if (!phase1Submitted) {
    toast({
      title: 'Chưa gửi báo cáo',
      description: 'Vui lòng gửi báo cáo cho lễ tân trước khi tiếp tục.',
      variant: 'destructive',
    })
    return // Block navigation
  }
  isValid = true
}
```

---

### Vấn đề 3: RoomCheckPage - Phase1ConfirmStep cần callback

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 1069-1078

**Vấn đề:** `Phase1ConfirmStep` không nhận prop `onContinue` để xử lý khi user bấm "Tiếp tục" sau khi gửi Phase 1.

**Giải pháp:** Truyền callback để chuyển step:

```typescript
<Phase1ConfirmStep
  chargeableItems={chargeableItems}
  lostItems={(form.getValues('items_lost') || []) as LostItem[]}
  damagedItems={(form.getValues('items_damaged') || []) as DamagedItem[]}
  roomNumber={room.room_number}
  guestName={currentBooking?.guest_name}
  onSubmitPhase1={handlePhase1Submit}
  onContinue={() => setCurrentStep(4)} // NEW
  isSubmitting={isSubmittingPhase1}
  phase1Submitted={phase1Submitted}
/>
```

---

### Vấn đề 4: ConsumableTabBooking - "consumed" action không có trong allowedActions cho Phase 1

**Vị trí:** `src/components/rooms/check-steps/item-type-tabs/ConsumableTabBooking.tsx`

**Vấn đề:** Phase 1 config có `['ok', 'consumed', 'lost']` nhưng UI không có nút "Đã dùng" cho các loại kiểm tra khác checkout.

**Hiện tại:** Code đang check `allowedActions.includes('missing')` và `allowedActions.includes('empty')` nhưng không check `consumed`.

**Giải pháp:** Không cần sửa - "consumed" chỉ được track qua counter UI cho checkout mode.

---

### Vấn đề 5: Cần reset checked items khi chuyển từ Phase 1 sang Phase 2

**Vị trí:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`

**Vấn đề tiềm ẩn:** Khi chuyển từ Phase 1 (step 2) sang Phase 2 (step 4), các state như `checkedItems`, `laundryItems`, v.v. vẫn giữ nguyên từ Phase 1. Điều này có thể gây nhầm lẫn hoặc trùng lặp dữ liệu.

**Giải pháp:** Không cần thay đổi - việc giữ state là đúng vì:
- Phase 1 đánh dấu đồ mất/hỏng/tiêu hao
- Phase 2 bổ sung thêm đồ giặt/thay/thêm
- Cả hai phase cùng contribute vào form data cuối cùng

---

### Vấn đề 6: Nút "Tiếp theo" ở Step 3 (Checkout) không cần thiết

**Vị trí:** `src/pages/rooms/RoomCheckPage.tsx` - Line 1129-1133

**Vấn đề:** Ở Step 3 checkout, có 2 cách để tiến sang step 4:
1. Bấm nút cam "Gửi cho lễ tân & Tiếp tục" (trong Phase1ConfirmStep) - tự động chuyển step
2. Bấm nút "Tiếp theo" ở footer - hiện đang gọi handleNext()

**Giải pháp:** Nút "Tiếp theo" chỉ nên hoạt động sau khi Phase 1 đã gửi. Cập nhật UI:
- Ẩn nút "Tiếp theo" ở Step 3 checkout khi chưa gửi Phase 1
- Hoặc hiển thị disabled với tooltip "Vui lòng gửi báo cáo trước"

---

### Thứ tự triển khai

| # | Công việc | File | Chi tiết |
|---|-----------|------|----------|
| 1 | Thêm prop `onContinue` cho Phase1ConfirmStep | `Phase1ConfirmStep.tsx` | Thêm prop + wiring |
| 2 | Truyền callback `onContinue` từ RoomCheckPage | `RoomCheckPage.tsx` | Line ~1069 |
| 3 | Fix handleNext logic cho Step 3 checkout | `RoomCheckPage.tsx` | Block nếu chưa gửi Phase 1 |
| 4 | Cải thiện UX: ẩn/disable "Tiếp theo" khi cần | `RoomCheckPage.tsx` | Footer buttons |

### Ước tính: ~30 phút

