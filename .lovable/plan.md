

## Kế hoạch: Loại bỏ icon sản phẩm

### VẤN ĐỀ HIỆN TẠI

Trong `CategoryItemRow.tsx`, mỗi item đang hiển thị icon/thumbnail sản phẩm:
- Consumable items: Hiển thị thumbnail (nếu có) hoặc icon Droplets
- Các loại khác: Hiển thị thumbnail hoặc icon Package

Icon này chiếm 40x40px không cần thiết và làm rối mắt.

### GIẢI PHÁP

Loại bỏ hoàn toàn việc hiển thị thumbnail/icon sản phẩm:

1. **Xóa hàm `renderThumbnail()`** (dòng 205-223)
2. **Xóa nơi gọi hàm** (dòng 330 và 401)

### CHI TIẾT THAY ĐỔI

**File:** `src/components/rooms/check-steps/item-type-tabs/CategoryItemRow.tsx`

| Vị trí | Thay đổi |
|--------|----------|
| Dòng 205-223 | Xóa toàn bộ hàm `renderThumbnail()` |
| Dòng 330 | Xóa `{itemType === 'consumable' && renderThumbnail()}` |
| Dòng 401 | Xóa `{renderThumbnail()}` trong expanded form |

### KẾT QUẢ

```text
TRƯỚC:
┌─────────────────────────────────────────────────────────┐
│ [🖼️] ● Khăn tắm lớn ×2         [Giặt] [Đổi] [Mất]     │
└─────────────────────────────────────────────────────────┘

SAU:
┌─────────────────────────────────────────────────────────┐
│ ● Khăn tắm lớn ×2              [Giặt] [Đổi] [Mất]     │
└─────────────────────────────────────────────────────────┘
```

### LỢI ÍCH

1. **Gọn gàng hơn** - Tiết kiệm 40px chiều ngang mỗi row
2. **Tập trung vào thông tin** - Tên item và actions rõ ràng hơn
3. **Hiệu suất** - Bớt load hình ảnh thumbnail

