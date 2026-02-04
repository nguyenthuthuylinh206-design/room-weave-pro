

## Kế hoạch: Sửa lỗi "column i.thumbnail_url does not exist"

### NGUYÊN NHÂN LỖI

RPC `get_laundry_batch_detail` tham chiếu đến cột **`i.thumbnail_url`** nhưng cột này **KHÔNG TỒN TẠI** trong bảng `items`.

**Lỗi database:**
```
{"code":"42703","message":"column i.thumbnail_url does not exist"}
```

### SCHEMA THỰC TẾ

Bảng `items` không có cột `thumbnail_url`. Hình ảnh được lưu trong bảng riêng `item_images`:

| Bảng | Cột liên quan |
|------|---------------|
| `items` | Không có cột ảnh |
| `item_images` | `url`, `is_primary`, `item_id` |

---

### GIẢI PHÁP

Cập nhật RPC `get_laundry_batch_detail` để:
1. Lấy ảnh từ bảng `item_images` (ảnh có `is_primary = true`)
2. Sử dụng `LEFT JOIN` để không gây lỗi nếu item không có ảnh

**SQL sửa đổi:**

```sql
-- Thay:
'item_thumbnail', i.thumbnail_url

-- Bằng:
'item_thumbnail', (
  SELECT ii.url 
  FROM item_images ii 
  WHERE ii.item_id = i.id AND ii.is_primary = true 
  LIMIT 1
)
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| Database Migration | Sửa RPC `get_laundry_batch_detail` - thay `i.thumbnail_url` bằng subquery lấy ảnh từ `item_images` |

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Lỗi "column i.thumbnail_url does not exist" | RPC hoạt động thành công |
| Không thể xem chi tiết lô giặt | Xem được chi tiết lô giặt với hình ảnh item |

