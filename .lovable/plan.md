

## Sửa lỗi: Form validation fail - "Chưa hợp lệ" khi ấn Hoàn thành

### Nguyên nhân gốc

Schema `roomCheckFormSchema` yêu cầu `cleanliness_score` là **bắt buộc** (`z.number()` không có `.default()`), nhưng:

1. Khi resume từ localStorage, nếu dữ liệu cũ không có field này → validation fail
2. Giá trị có thể bị `undefined` sau khi hydrate từ localStorage
3. Schema không tự động set default khi parse

### Giải pháp

Thêm `.default(5)` vào schema để đảm bảo luôn có giá trị hợp lệ ngay cả khi resume từ localStorage.

### Chi tiết thay đổi

**File:** `src/lib/validations/rooms.schemas.ts`

**Thay đổi dòng 70-72:**

```typescript
// TRƯỚC (thiếu default)
cleanliness_score: z.number({
  required_error: 'Vui lòng đánh giá mức độ sạch sẽ',
}).int().min(1, 'Điểm phải từ 1-5').max(5, 'Điểm phải từ 1-5'),

// SAU (thêm default)
cleanliness_score: z.number({
  required_error: 'Vui lòng đánh giá mức độ sạch sẽ',
}).int().min(1, 'Điểm phải từ 1-5').max(5, 'Điểm phải từ 1-5').default(5),
```

### Tại sao giải pháp này hoạt động

| Trường hợp | Trước | Sau |
|------------|-------|-----|
| Mới tạo form | ✅ `defaultValues: { cleanliness_score: 5 }` | ✅ Vẫn hoạt động |
| Resume từ localStorage (có giá trị) | ✅ Giữ nguyên | ✅ Giữ nguyên |
| Resume từ localStorage (thiếu/undefined) | ❌ Validation fail | ✅ Default = 5 |

### Thay đổi bổ sung (phòng ngừa)

Cũng nên thêm `.default()` cho các field khác chưa có để tránh lỗi tương tự:

```typescript
check_type: z.enum([...]).default('daily'), // Thêm default
```

### Thời gian triển khai

| Bước | Thời gian |
|------|-----------|
| Sửa schema | 1 phút |
| Test | 2 phút |
| **Tổng** | **~3 phút** |

