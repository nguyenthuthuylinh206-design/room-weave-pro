

## Phân Tích Quy Trình Xử Lý Đồ Hỏng/Mất/Giặt Sau Khi Kiểm Tra Phòng

### I. TÌNH TRẠNG HIỆN TẠI

| Loại Item | Sau khi kiểm tra | Thông báo | Tạo phiếu tự động | Thiếu sót |
|-----------|------------------|-----------|-------------------|-----------|
| **Đồ gửi giặt** | Cập nhật `quantity_in_laundry` | ❌ Không | ❌ Không tạo Laundry Batch | Quản lý không biết để tạo lô giặt |
| **Đồ mất** | Tạo `inventory_transaction (lost)` | ✅ `sendSupplementAlert` | ❌ Không tạo phiếu xuất kho | Chỉ thông báo, không có action cụ thể |
| **Đồ tiêu hao** | Tạo `inventory_transaction (consumed)` | ✅ `sendSupplementAlert` | ❌ Không tạo phiếu xuất kho | Tương tự đồ mất |
| **Đồ hỏng** | Lưu vào `items_damaged` | ⚠️ Thông báo chung | ❌ Không tạo maintenance | Không có quy trình sửa chữa/thay thế |
| **Đồ cần thay** | Lưu vào `items_replaced` | ❌ Không | ❌ Không | Đã được xử lý tại chỗ |

**Vấn đề cốt lõi:**
1. Thông báo hiện tại chỉ là text tổng hợp, không có chi tiết để Manager xem và hành động
2. Không có quy trình tự động tạo phiếu công việc (laundry batch, outbound request)
3. Đồ hỏng không được theo dõi riêng cho maintenance

---

### II. ĐỀ XUẤT CẢI TIẾN

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     ROOM CHECK COMPLETED                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┬─────────────────┐
        ▼                       ▼                       ▼                 ▼
┌───────────────┐     ┌─────────────────┐     ┌────────────────┐ ┌────────────────┐
│ Đồ gửi giặt   │     │ Đồ mất/tiêu hao │     │ Đồ hỏng        │ │ Đồ thay thế    │
│ (laundry)     │     │ (lost/consumed) │     │ (damaged)      │ │ (replaced)     │
└───────┬───────┘     └────────┬────────┘     └───────┬────────┘ └────────────────┘
        │                      │                      │            (Đã xử lý)
        ▼                      ▼                      ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ Tạo Laundry       │ │ Tạo Supplement    │ │ Tạo Maintenance   │
│ Request (pending) │ │ Request (pending) │ │ Request           │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ Thông báo chi tiết│ │ Thông báo chi tiết│ │ Thông báo chi tiết│
│ → Manager         │ │ → Kho/Manager     │ │ → Maintenance     │
│ Link: /laundry    │ │ Link: /supplements│ │ Link: /maintenance│
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

---

### III. CHI TIẾT GIẢI PHÁP

#### A. Tạo bảng `supplement_requests` mới

**Mục đích:** Theo dõi yêu cầu bổ sung đồ sau room check

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | FK tenants |
| hotel_id | uuid | FK hotels |
| room_id | uuid | FK rooms |
| room_check_id | uuid | FK room_checks |
| status | text | pending, approved, completed, rejected |
| request_type | text | lost, consumed, damaged |
| items | jsonb | Array of items [{item_id, item_name, quantity, unit_price}] |
| total_value | numeric | Tổng giá trị |
| requested_by | uuid | FK users |
| approved_by | uuid | FK users |
| notes | text | Ghi chú |
| created_at | timestamptz | |

#### B. Cập nhật `useRoomChecks.ts` - Sau khi lưu check

**Thêm logic sau `processCheckoutCheck`:**

1. **Đồ gửi giặt → Tạo Laundry Request**
   - Gom `items_sent_to_laundry` thành 1 request
   - Status: `pending_batch` (chờ Manager tạo batch)
   - Thông báo có link đến `/laundry/requests`

2. **Đồ mất/tiêu hao → Tạo Supplement Request**
   - Gom `items_lost` + `items_consumed` (nếu cần thay)
   - Status: `pending` 
   - Thông báo có link đến `/supplements` (trang mới)

3. **Đồ hỏng → Tạo Maintenance Request**
   - Mỗi item hỏng loại `equipment/furniture` → 1 maintenance request
   - Priority dựa trên mức độ hỏng
   - Thông báo có link đến `/maintenance`

#### C. Trang quản lý Supplement Requests (mới)

**Route:** `/supplements`

**Chức năng:**
- Danh sách các request bổ sung đồ
- Lọc theo phòng, ngày, trạng thái
- Duyệt request → Tự động tạo phiếu xuất kho
- Từ chối request → Ghi lý do

#### D. Cải tiến Laundry Requests

**Tùy chọn 1:** Tạo bảng `laundry_requests` riêng
- Staff kiểm tra phòng → Tạo request
- Manager duyệt → Gom nhiều request thành 1 batch

**Tùy chọn 2:** Gom trực tiếp vào pending batch
- Có 1 batch "draft" cho mỗi hotel/ngày
- Items từ room check tự động thêm vào batch draft
- Manager finalize batch khi đủ đồ

#### E. Thông báo chi tiết hơn

**Hiện tại:** "Phòng 101 cần bổ sung: Khăn tắm: 2, Bàn chải: 1..."

**Cải tiến:**
```
📦 Yêu cầu bổ sung đồ - Phòng 101

Đồ mất (2 items):
• Khăn tắm x2 - 50,000đ
• Dép đi trong phòng x1 - 25,000đ

Đồ tiêu hao cần thay (1 item):
• Bàn chải đánh răng x2 - 10,000đ

Tổng giá trị: 85,000đ

[Xem chi tiết] [Duyệt & Xuất kho]
```

---

### IV. PHẠM VI TRIỂN KHAI

**Giai đoạn 1 (Ưu tiên cao):**
1. Tạo bảng `supplement_requests`
2. Cập nhật `useRoomChecks.ts` để tạo request tự động
3. Tạo trang `/supplements` cơ bản
4. Cải tiến thông báo với link trực tiếp

**Giai đoạn 2:**
1. Tích hợp laundry requests
2. Auto-create maintenance cho đồ hỏng
3. Dashboard thống kê requests

**Giai đoạn 3:**
1. Workflow automation (duyệt tự động theo điều kiện)
2. Mobile-optimized UI cho Manager
3. Báo cáo chi phí theo phòng/kỳ

---

### V. CÂU HỎI XÁC NHẬN

Trước khi triển khai, cần xác nhận:

1. **Ưu tiên:** Bắt đầu với Giai đoạn 1 (supplement requests) hay cần cả 3 loại cùng lúc?

2. **Laundry flow:** 
   - Phương án A: Tạo request riêng → Manager gom thành batch
   - Phương án B: Auto-add vào batch draft của ngày

3. **Maintenance cho đồ hỏng:**
   - Tự động tạo cho tất cả đồ hỏng?
   - Hay chỉ tạo cho equipment/furniture (không tạo cho linen/consumable)?

