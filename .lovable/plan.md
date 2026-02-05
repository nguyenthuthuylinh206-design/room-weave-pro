

## Phân tích: Nút "Tự động" không cộng dồn số lượng

### HÀNH VI HIỆN TẠI

Nút **"Tự động"** hoạt động theo logic:

```text
Lần 1: 
- Query database: Phòng thiếu 3 khăn (tiêu chuẩn 5, hiện có 2)
- Điền: +3 khăn ✅
- Kho: 10 → tính còn 7

Lần 2:
- Query database: Phòng vẫn thiếu 3 khăn (database chưa cập nhật)
- Nhưng getRemainingStock() kiểm tra allocations đã có 3 khăn
- canAllocate = min(3, 7-3=4) = 3
- Điền: existingItems[idx].quantity + 3 = 3 + 3 = 6 ❌ BUG!
```

**Thực tế đang có BUG**: Code ở dòng 401-405 **ĐANG CỘNG DỒN** nếu còn kho! Vấn đề là nếu tồn kho đã hết thì `canAllocate = 0` nên không thêm được gì.

---

### NGUYÊN NHÂN THỰC SỰ

Sau khi phân tích kỹ, vấn đề là:

1. **RPC chỉ trả về items có `quantity_in_stock > 0`** (dòng 44 trong SQL)
2. **Nếu kho đã cạn** sau lần điền đầu tiên → RPC không trả về item đó nữa
3. **Kết quả**: `missingItems` trống hoặc thiếu items → không có gì để cộng dồn

---

### GIẢI PHÁP

Thay đổi logic để khi ấn "Tự động" lần 2:
- Vẫn tính số thiếu từ database 
- **Nhưng chỉ cộng thêm phần CHƯA được điền** (so với allocations hiện tại)
- Tránh điền trùng lặp

```typescript
// Trong autoFillMissingItemsForRoom
for (const m of missingItems) {
  // Lấy số đã điền trong allocations
  const existingAlloc = prev.find(a => a.room_id === roomId)
  const alreadyAllocated = existingAlloc?.items.find(i => i.item_id === m.item_id)?.quantity || 0
  
  // Số cần thêm = số thiếu - số đã điền
  const needToAdd = Math.max(0, m.missing_qty - alreadyAllocated)
  
  if (needToAdd > 0) {
    // Tính kho còn
    const remaining = getRemainingStock(m.item_id, m.item_stock)
    const canAllocate = Math.min(needToAdd, remaining)
    // ...
  }
}
```

---

### THAY ĐỔI CẦN THỰC HIỆN

| # | File | Thay đổi |
|---|------|----------|
| 1 | `useDistributionForm.ts` | Cập nhật `autoFillMissingItemsForRoom` để trừ số đã điền trước khi tính thêm |
| 2 | `useDistributionForm.ts` | Cập nhật `autoFillMissingItems` tương tự |

---

### HÀNH VI SAU KHI SỬA

```text
Lần 1:
- Phòng thiếu 3 khăn, đã điền 0
- Thêm: min(3-0, kho) = 3 ✅

Lần 2:
- Phòng thiếu 3 khăn, đã điền 3
- Thêm: min(3-3, kho) = 0 
- Message: "Phòng đã đủ tiêu chuẩn" ✅

Nếu user XÓA bớt 1:
- Đã điền còn 2
- Ấn Tự động: thêm min(3-2, kho) = 1 ✅
```

**Kết quả**: Nút "Tự động" luôn điền **đúng số thiếu theo tiêu chuẩn**, không cộng dồn vô hạn, và thông báo rõ ràng khi đã đủ.

