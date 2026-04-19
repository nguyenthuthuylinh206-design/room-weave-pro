

## Vấn đề

Khi nhân viên nhấn "Bắt đầu" task từ dashboard:
- Đã navigate đúng URL: `/rooms/:id/check?type=checkout|checkin|replenish`
- Code đã có `shouldAutoSkip = !!prefilledType` → `initialStep = 2` (skip step chọn loại)

**NHƯNG vẫn lộ ra step 1 ("Chọn loại kiểm tra") trong các tình huống:**

1. **Nút "Quay lại"** ở step 2 đưa nhân viên về step 1 → thấy lại 6 ô chọn loại (cho phép nhân viên đổi loại task khác → sai logic, vì task đã chỉ định rõ ràng).
2. **Resume từ localStorage**: Nếu lần trước đã thoát ở step 1, mở lại sẽ load `step=1` từ localStorage thay vì áp dụng `prefilledType`.
3. **Quick mode toggle** nằm trong CheckTypeStep — có cần riêng cho task được giao không?

→ Khi đã được giao task xác định loại (`?type=...` trong URL), **bước "Chọn loại kiểm tra" KHÔNG được phép xuất hiện** và **không được phép back về**.

## Hướng sửa

Trong `src/pages/rooms/RoomCheckPage.tsx`:

### 1. Khóa step 1 khi có `prefilledType`

Khi `shouldAutoSkip = true` (URL có `?type=...`):
- **Không cho phép `setCurrentStep(1)`** ở bất kỳ đường nào (back, resume, fresh).
- `handleBack`: chặn nếu `currentStep === 2 && shouldAutoSkip` → ẩn nút "Quay lại" trên step 2 luôn (đã có nút X để hủy task).
- `startFresh` & resume từ localStorage: dùng `Math.max(2, savedStep)` thay vì set thẳng `step`.

### 2. Quick mode toggle

Quick mode hiện nằm trong CheckTypeStep (step 1). Khi ẩn step 1:
- **Bỏ quick mode toggle hoàn toàn** khi vào từ task được giao (vì task được giao luôn yêu cầu kiểm tra chi tiết).
- Hoặc: chuyển toggle ra header (nếu cần giữ).
→ Đề xuất: **Bỏ luôn** khi `shouldAutoSkip = true`.

### 3. Đảm bảo `check_type` không bị ghi đè

- Khi `prefilledType` tồn tại, **luôn force** `form.setValue('check_type', prefilledType)` sau resume/restore session, kể cả localStorage có giá trị khác.
- Khi resume từ localStorage, override `data.check_type = prefilledType` trước khi `form.reset(data)`.

### 4. Ẩn nút "Quay lại" trên step 2 khi auto-skip

Sửa điều kiện hiển thị nút Back (line 1528):
```tsx
{currentStep > 1 
  && !(currentStep === 2 && shouldAutoSkip)  // ← thêm
  && !(currentStep === 4 && isCheckoutType && phase1Submitted) && (...)}
```

Và trong `handleBack`: chặn `if (shouldAutoSkip && currentStep <= 2) return`.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/pages/rooms/RoomCheckPage.tsx` | (1) `handleBack`: chặn về step 1 khi `shouldAutoSkip`. (2) `useEffect` resume localStorage: ép step ≥ 2 và override `check_type = prefilledType`. (3) `startFresh`: nếu `shouldAutoSkip` → set step 2 thay vì 1. (4) Ẩn nút "Quay lại" ở step 2 khi `shouldAutoSkip`. (5) Force-set `check_type` = `prefilledType` sau khi restore session. |

Không sửa `CheckTypeStep.tsx`, không sửa hook, không migration. Đồng thời giữ flow cũ (vào trang trực tiếp không qua task vẫn thấy step 1 chọn loại bình thường).

