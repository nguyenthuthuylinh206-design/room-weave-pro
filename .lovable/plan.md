

## Kế hoạch: Thêm xác nhận khi hủy kiểm tra phòng ở Step 1

### VẤN ĐỀ HIỆN TẠI

Trong `RoomCheckPage.tsx`, hàm `handleCancel` có logic:

```tsx
const handleCancel = () => {
  if (currentStep === 1) {
    navigate(isManager ? `/rooms/${id}` : '/rooms')  // ← Navigate ngay, KHÔNG xác nhận!
  } else {
    setShowCancelDialog(true)  // ← Các step khác thì hiển thị dialog
  }
}
```

**Vấn đề**: Khi ở Step 1, bấm nút "Hủy" sẽ thoát ngay lập tức mà không có dialog xác nhận. Nếu người dùng bấm nhầm, họ không thể quay lại.

### GIẢI PHÁP

Hiển thị dialog xác nhận cho TẤT CẢ các bước, không chỉ step > 1:

| Thay đổi | Mô tả |
|----------|-------|
| Sửa `handleCancel()` | Luôn hiển thị dialog xác nhận, bỏ điều kiện `currentStep === 1` |

### CHI TIẾT THAY ĐỔI

**File**: `src/pages/rooms/RoomCheckPage.tsx`

```tsx
// TRƯỚC (dòng 666-672):
const handleCancel = () => {
  if (currentStep === 1) {
    navigate(isManager ? `/rooms/${id}` : '/rooms')
  } else {
    setShowCancelDialog(true)
  }
}

// SAU:
const handleCancel = () => {
  setShowCancelDialog(true)  // Luôn hiện dialog xác nhận
}
```

### FLOW SAU KHI SỬA

```text
User bấm "Hủy" (bất kỳ step nào)
         │
         ▼
┌────────────────────────────────────────┐
│   Hủy kiểm tra phòng?                  │
│                                        │
│   Bạn có chắc muốn hủy? Tiến trình     │
│   đã lưu sẽ được giữ lại...            │
│                                        │
│   [Tiếp tục kiểm tra]  [Hủy và thoát]  │
└────────────────────────────────────────┘
         │                    │
         │                    ▼
         │              Navigate back
         ▼
   Đóng dialog, tiếp tục kiểm tra
```

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Step 1: Bấm Hủy → Thoát ngay | Step 1: Bấm Hủy → Hiện dialog xác nhận |
| Step 2+: Bấm Hủy → Hiện dialog | Step 2+: Bấm Hủy → Hiện dialog (không đổi) |

### LỢI ÍCH

1. **Tránh lỗi bấm nhầm**: Người dùng có cơ hội quay lại
2. **Nhất quán**: Cùng behavior ở mọi step
3. **Ít code hơn**: Logic đơn giản hơn

