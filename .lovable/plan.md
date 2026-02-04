

## Sửa lỗi: vendor_id NOT NULL constraint khi tạo draft batch

### NGUYÊN NHÂN

Bảng `laundry_batches` có các constraint NOT NULL:
- `vendor_id` - **NOT NULL** 
- `delivery_date` - **NOT NULL**

Nhưng RPC `add_laundry_to_draft_batch` tạo draft batch **KHÔNG có** vendor_id và delivery_date (vì theo workflow mới, thông tin này chỉ được nhập khi "Gửi lô giặt").

### GIẢI PHÁP

Thay đổi constraint của 2 cột này thành **NULLABLE** để hỗ trợ workflow draft batch:

| Cột | Hiện tại | Sau khi sửa | Lý do |
|-----|----------|-------------|-------|
| `vendor_id` | NOT NULL | NULLABLE | Draft batch chưa có vendor |
| `delivery_date` | NOT NULL | NULLABLE | Draft batch chưa có ngày giao |
| `total_weight_kg` | NOT NULL | NULLABLE (hoặc DEFAULT 0) | Có thể chưa cân |

### MIGRATION CẦN TẠO

```sql
-- Cho phép vendor_id và delivery_date là NULL cho draft batches
ALTER TABLE public.laundry_batches 
  ALTER COLUMN vendor_id DROP NOT NULL;

ALTER TABLE public.laundry_batches 
  ALTER COLUMN delivery_date DROP NOT NULL;

ALTER TABLE public.laundry_batches 
  ALTER COLUMN total_weight_kg SET DEFAULT 0;

-- Thêm constraint: vendor_id và delivery_date bắt buộc khi status != 'draft'
-- (Tùy chọn - có thể thêm sau nếu cần đảm bảo data integrity)
```

### WORKFLOW SAU KHI SỬA

```text
1. "Thêm vào lô giặt nháp" 
   └── Tạo batch với status='draft', vendor_id=NULL, delivery_date=NULL ✅

2. "Gửi lô giặt" (draft → delivered)
   └── Cập nhật vendor_id, delivery_date, status='delivered' ✅
```

### KẾT QUẢ MONG ĐỢI

- Nút "Xác nhận thêm" hoạt động bình thường
- Draft batch được tạo thành công với vendor_id=NULL
- Khi gửi lô giặt, vendor và dates được bổ sung

