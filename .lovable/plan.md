

## Kế hoạch: Sửa lỗi nút "Tiếp theo" không hoạt động trong Checkout mode

### I. NGUYÊN NHÂN GỐC

Hàm `handleNext` trong `RoomCheckPage.tsx` thiếu xử lý validation cho step 3 (Chargeable Items) và step 4 (Cleaning Request) trong checkout mode:

| Step | Nội dung | Hiện tại | Vấn đề |
|------|----------|----------|--------|
| 1 | Loại kiểm tra | ✅ Có validation | OK |
| 2 | Kiểm tra đồ dùng | ✅ Có validation | OK |
| 3 | Chargeable Items (Checkout) | ❌ Không có case | `isValid = false` |
| 4 | Cleaning Request (Checkout) | ❌ Không có case | `isValid = false` |
| 5 | Review | ✅ Có (nhưng điều kiện sai) | Conflict với step 3 |

**Logic lỗi:**
```typescript
if ((currentStep === 2 && quickMode) || currentStep === 3) {
  isValid = await form.trigger(['cleanliness_score']) // Sai! Step 3 checkout là Chargeable
}
// Thiếu: step 4 (Cleaning) hoàn toàn không được handle
```

---

### II. GIẢI PHÁP

Cập nhật logic `handleNext` để xử lý đúng cho checkout 5-step flow:

```typescript
const handleNext = async () => {
  let isValid = false
  
  if (currentStep === 1) {
    isValid = await form.trigger(['check_type'])
    if (isValid && quickMode) {
      form.setValue('items_complete', true)
      form.setValue('items_missing', [])
      form.setValue('items_damaged', [])
    }
  } else if (currentStep === 2 && !quickMode) {
    isValid = await form.trigger(['items_complete', 'items_missing', 'items_damaged'])
  } else if (currentStep === 2 && quickMode) {
    // Quick mode: step 2 là review
    isValid = await form.trigger(['cleanliness_score'])
  } else if (currentStep === 3 && isCheckoutType) {
    // THÊM: Checkout step 3 = Chargeable Items (không cần validate)
    isValid = true
  } else if (currentStep === 4 && isCheckoutType) {
    // THÊM: Checkout step 4 = Cleaning Request (không cần validate)
    isValid = true
  } else if (currentStep === 3 && !isCheckoutType) {
    // Non-checkout: step 3 là Review
    isValid = await form.trigger(['cleanliness_score'])
  }
  
  if (isValid && currentStep < totalSteps) {
    setCurrentStep(currentStep + 1)
  }
}
```

---

### III. FILE CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/pages/rooms/RoomCheckPage.tsx` | Sửa hàm `handleNext` (lines 423-443) |

---

### IV. LOGIC SAU KHI SỬA

**Checkout mode (5 steps):**
```text
Step 1: Check 'check_type' ✓
Step 2: Check 'items_complete', 'items_missing', 'items_damaged' ✓
Step 3: Chargeable Items → isValid = true (optional, no required fields)
Step 4: Cleaning Request → isValid = true (optional, có defaults)
Step 5: Review → Submit
```

**Daily/Checkin/Maintenance mode (3 steps):**
```text
Step 1: Check 'check_type' ✓
Step 2: Check items ✓
Step 3: Review → Submit
```

---

### V. CHI TIẾT KỸ THUẬT

Thay thế đoạn code trong `handleNext`:

**Trước:**
```typescript
} else if ((currentStep === 2 && quickMode) || currentStep === 3) {
  isValid = await form.trigger(['cleanliness_score'])
}
```

**Sau:**
```typescript
} else if (currentStep === 2 && quickMode) {
  // Quick mode: step 2 là review cuối
  isValid = await form.trigger(['cleanliness_score'])
} else if (currentStep === 3 && isCheckoutType) {
  // Checkout step 3 = Chargeable Items - optional, không cần validate
  isValid = true
} else if (currentStep === 4 && isCheckoutType) {
  // Checkout step 4 = Cleaning Request - có defaults, không cần validate
  isValid = true
} else if (currentStep === 3 && !isCheckoutType) {
  // Non-checkout: step 3 là Review cuối
  isValid = await form.trigger(['cleanliness_score'])
}
```

---

### VI. TESTING

1. Vào phòng có booking → Chọn checkout
2. Step 1: Chọn loại → Tiếp theo ✓
3. Step 2: Kiểm tra đồ → Tiếp theo ✓
4. **Step 3: Chargeable** → Tiếp theo ✓ (trước đó bị stuck)
5. **Step 4: Cleaning** → Tiếp theo ✓ (trước đó bị stuck)
6. Step 5: Review → Hoàn thành

