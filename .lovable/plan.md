

## Bug: Nút "Thanh toán đủ" tiền mặt không hoạt động

### Nguyên nhân gốc

Tại line 492-506 trong `GroupPaymentDialog.tsx`:

```typescript
onClick={() => {
  setAmount(remainingAmount.toString())  // setState async — chưa cập nhật ngay
  if (paymentMethod === 'cash') {
    handleCashPayment()  // đọc parsedAmount từ state CŨ → = 0 → return sớm
  }
}}
```

`handleCashPayment()` dùng `parsedAmount` (line 120: `parseFloat(amount.replace(...))`), nhưng `amount` state chưa được cập nhật khi function chạy → `parsedAmount = 0` → `isValidAmount = false` → return "Số tiền không hợp lệ" → không làm gì cả.

Cùng bug tồn tại ở nút custom amount (line 585-587) nhưng ít gặp hơn vì user thường đã nhập amount trước.

### Sửa

Refactor `handleCashPayment` và `handleBankTransfer` nhận `overrideAmount` tùy chọn, ưu tiên dùng thay vì đọc từ state:

**File:** `src/components/bookings/GroupPaymentDialog.tsx`

1. Sửa `handleCashPayment(overrideAmount?: number)` — dùng `overrideAmount ?? parsedAmount`
2. Sửa `handleBankTransfer(overrideAmount?: number)` — tương tự
3. Nút "Thanh toán đủ" gọi trực tiếp `handleCashPayment(remainingAmount)` hoặc `handleBankTransfer(remainingAmount)` mà không cần `setAmount` trước
4. Vẫn giữ `setAmount` để UI hiển thị đúng

