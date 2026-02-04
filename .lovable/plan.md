

## Đánh giá toàn bộ quy trình Lô Giặt Nháp (Draft Laundry Batch)

### LUỒNG HIỆN TẠI

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. KIỂM TRA PHÒNG (Room Check)                                                  │
│    └── Checkout → Tự động tạo laundry_request (status: pending)                │
│        └── items từ "items_sent_to_laundry"                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2. TAB YÊU CẦU GIẶT (LaundryRequestsTab)                                        │
│    ├── Hiển thị danh sách yêu cầu giặt pending                                 │
│    ├── Hiển thị thông tin Draft Batch (nếu có)                                 │
│    ├── Nút "Thêm vào lô giặt nháp" → Dialog xác nhận                           │
│    └── Nút "Gửi đi" → Dialog gửi lô giặt                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3. THÊM VÀO LÔ NHÁP (RPC: add_laundry_to_draft_batch)                          │
│    ├── Tìm/tạo batch status='draft' cho hôm nay                                │
│    ├── Thêm items vào laundry_batch_items                                      │
│    ├── Cập nhật total_items                                                    │
│    └── Cập nhật laundry_request.status = 'added_to_batch'                      │
│                                                                                 │
│    ✅ ĐÃ SỬA: Dùng quantity_delivered thay vì sent_quantity                    │
│    ✅ ĐÃ SỬA: Thêm 'draft' vào constraint                                      │
│    ✅ ĐÃ SỬA: vendor_id và delivery_date nullable                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 4. GỬI LÔ GIẶT (RPC: send_draft_batch)                                          │
│    ├── Kiểm tra batch.status = 'draft'                                         │
│    ├── Cập nhật vendor_id, delivery_date, expected_return_date                 │
│    ├── Cập nhật status = 'delivered'                                           │
│    └── Tính estimated_cost từ vendor contract                                  │
│                                                                                 │
│    ✅ ĐÃ CÓ: send_draft_batch RPC                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 5. QUY TRÌNH SAU GỬI (delivered → ready → received → stocked)                   │
│    ├── Đánh dấu sẵn sàng: delivered → ready                                    │
│    ├── Nhận đồ về: ReceiveBatchPage → received                                 │
│    └── Nhập kho: useStockInFromLaundry → stocked                               │
│                                                                                 │
│    ✅ ĐÃ CÓ: Đầy đủ                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### CÁC VẤN ĐỀ PHÁT HIỆN

| # | Vấn đề | Mức độ | Mô tả |
|---|--------|--------|-------|
| 1 | RPC `get_laundry_batch_detail` không hỗ trợ draft batch | **CRITICAL** | Dùng `JOIN laundry_vendors` nhưng draft batch có `vendor_id = NULL` → Không thể xem chi tiết draft batch |
| 2 | RPC `get_laundry_batches_filtered` không hiển thị draft batch | **HIGH** | Dùng `JOIN laundry_vendors` → Draft batches bị loại khỏi danh sách |
| 3 | Thiếu UI xem/sửa draft batch | **MEDIUM** | Không có trang riêng để quản lý draft batch (thêm/xóa items) |
| 4 | Filter status không có option 'draft' | **LOW** | LaundryBatchesPage không có option filter status='draft' |
| 5 | Thiếu BatchStatusBadge cho status 'draft' | **LOW** | Badge component chưa định nghĩa style cho 'draft' |
| 6 | Inventory deduction không xảy ra khi thêm vào draft | **MEDIUM** | Đồ giặt chưa bị trừ khỏi kho khi thêm vào draft (chỉ trừ khi send) |

---

### GIẢI PHÁP ĐỀ XUẤT

#### 1. Sửa RPC `get_laundry_batch_detail` (CRITICAL)

**Vấn đề**: JOIN vendor_id = NULL sẽ không trả về kết quả.

**Giải pháp**: Đổi từ `JOIN` sang `LEFT JOIN` cho laundry_vendors.

```sql
CREATE OR REPLACE FUNCTION get_laundry_batch_detail(p_batch_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'batch', row_to_json(lb.*),
    'vendor', CASE WHEN lv.id IS NOT NULL THEN row_to_json(lv.*) ELSE NULL END,
    'hotel', row_to_json(h.*),
    'delivery_staff', row_to_json(ds.*),
    'return_staff', row_to_json(rs.*),
    'items', (...)
  ) INTO v_result
  FROM laundry_batches lb
  LEFT JOIN laundry_vendors lv ON lv.id = lb.vendor_id  -- Đổi từ JOIN sang LEFT JOIN
  JOIN hotels h ON h.id = lb.hotel_id
  LEFT JOIN users ds ON ds.id = lb.delivery_staff_id
  LEFT JOIN users rs ON rs.id = lb.return_staff_id
  WHERE lb.id = p_batch_id;
  
  RETURN v_result;
END;
$$;
```

#### 2. Sửa RPC `get_laundry_batches_filtered` (HIGH)

**Vấn đề**: JOIN vendor loại bỏ draft batches.

**Giải pháp**: Đổi sang `LEFT JOIN` và xử lý null values.

```sql
CREATE OR REPLACE FUNCTION get_laundry_batches_filtered(...)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_batches AS (
    SELECT 
      lb.*,
      COALESCE(lv.name, 'Chưa chọn vendor') as vendor_name,  -- Handle NULL
      lv.contract_info->>'logo_url' as vendor_logo,
      lv.rating as vendor_rating
    FROM laundry_batches lb
    LEFT JOIN laundry_vendors lv ON lv.id = lb.vendor_id  -- Đổi từ JOIN sang LEFT JOIN
    WHERE lb.tenant_id = p_tenant_id
      AND (p_hotel_id IS NULL OR lb.hotel_id = p_hotel_id)
      AND (p_vendor_id IS NULL OR lb.vendor_id = p_vendor_id)
      AND (p_status IS NULL OR lb.status = p_status)
      AND (p_from_date IS NULL OR lb.delivery_date::date >= p_from_date OR lb.delivery_date IS NULL)
      AND (p_to_date IS NULL OR lb.delivery_date::date <= p_to_date OR lb.delivery_date IS NULL)
  )
  SELECT ... FROM filtered_batches fb
  ORDER BY 
    CASE WHEN fb.status = 'draft' THEN 0 ELSE 1 END,  -- Draft lên đầu
    fb.created_at DESC;
END;
$$;
```

#### 3. Thêm status 'draft' vào BatchStatusBadge (LOW)

**File**: `src/components/laundry/BatchStatusBadge.tsx`

```typescript
const STATUS_CONFIG = {
  draft: { label: 'Nháp', color: 'bg-slate-100 text-slate-700', icon: FileText },
  delivered: { label: 'Đã gửi', color: '...', icon: Truck },
  // ...
}
```

#### 4. Thêm filter option 'draft' vào LaundryBatchesPage (LOW)

**File**: `src/pages/laundry/LaundryBatchesPage.tsx`

```typescript
<SelectItem value="draft">{t('status.draft')}</SelectItem>
```

#### 5. Xử lý UI cho draft batch trong BatchDetailPage (MEDIUM)

**File**: `src/pages/laundry/BatchDetailPage.tsx`

- Hiển thị thông báo "Chưa chọn đơn vị giặt" khi vendor = null
- Thêm nút "Gửi đi giặt" khi status = 'draft'
- Cho phép thêm/xóa items khi status = 'draft'

---

### ƯU TIÊN THỰC HIỆN

| Thứ tự | Task | Lý do |
|--------|------|-------|
| 1 | Sửa `get_laundry_batch_detail` | Không thể xem chi tiết draft batch → Block workflow |
| 2 | Sửa `get_laundry_batches_filtered` | Draft batch không hiển thị trong danh sách |
| 3 | Thêm status 'draft' vào BatchStatusBadge | UI consistency |
| 4 | Cập nhật BatchDetailPage cho draft | UX khi xem draft batch |
| 5 | Thêm filter 'draft' vào LaundryBatchesPage | Optional enhancement |

---

### FILES CẦN THAY ĐỔI

| File | Loại | Thay đổi |
|------|------|----------|
| Database Migration | SQL | Sửa 2 RPC functions |
| `src/components/laundry/BatchStatusBadge.tsx` | Frontend | Thêm status 'draft' |
| `src/pages/laundry/BatchDetailPage.tsx` | Frontend | Handle draft batch UI |
| `src/pages/laundry/LaundryBatchesPage.tsx` | Frontend | Thêm filter option 'draft' |
| `src/components/laundry/MobileBatchDetail.tsx` | Frontend | Handle draft batch UI |

---

### KẾT QUẢ MONG ĐỢI SAU KHI SỬA

| Tính năng | Hiện tại | Sau khi sửa |
|-----------|----------|-------------|
| Xem chi tiết draft batch | Lỗi (vendor NULL) | Hoạt động |
| Danh sách hiển thị draft | Không hiển thị | Hiển thị với badge "Nháp" |
| Nút "Xem lô giặt" trong LaundryRequestsTab | Lỗi khi click | Navigate và hiển thị đúng |
| Workflow draft → delivered | Chỉ qua SendLaundryBatchDialog | Có thể xem detail trước khi send |

