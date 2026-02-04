# Kế hoạch: Hoàn thiện Logic "Thêm vào lô giặt nháp"

## TRẠNG THÁI: ✅ HOÀN THÀNH

---

## FILES ĐÃ TẠO/CẬP NHẬT

| File | Mô tả | Trạng thái |
|------|-------|------------|
| `src/components/laundry/AddToLaundryBatchDialog.tsx` | Dialog xác nhận trước khi thêm vào batch | ✅ Tạo mới |
| `src/components/laundry/SendLaundryBatchDialog.tsx` | Dialog gửi lô giặt (draft → delivered) | ✅ Tạo mới |
| `src/hooks/useSendDraftBatch.ts` | Hook mutation gửi lô giặt | ✅ Tạo mới |
| `src/components/laundry/LaundryRequestsTab.tsx` | Tích hợp 2 dialog mới | ✅ Cập nhật |
| Database Migration | RPC `send_draft_batch` | ✅ Tạo mới |

---

## QUY TRÌNH HOÀN CHỈNH

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. ROOM CHECK → Tạo laundry_request (pending)                                │
│    └── Inventory đã cập nhật: stock -, laundry +                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. XEM YÊU CẦU GIẶT                                                          │
│    ├── Click "Thêm vào lô giặt nháp"                                        │
│    └── Dialog xác nhận hiển thị (items, tổng, thông tin draft batch)        │
│        └── Confirm → Thêm vào draft batch                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. KHI ĐỦ ITEMS → "GỬI LÔ GIẶT"                                              │
│    ├── Dialog yêu cầu: vendor, ngày giao, người giao, người nhận            │
│    └── Confirm → status: draft → delivered                                  │
│        └── Inventory: KHÔNG THAY ĐỔI (đã update ở step 1)                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. TIẾP TỤC QUY TRÌNH CHUẨN                                                  │
│    delivered → ready → received → stocked                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## KẾT QUẢ

| Metric | Trước | Sau |
|--------|-------|-----|
| Xác nhận trước khi thêm | ❌ Không | ✅ Có dialog xác nhận |
| Thông tin draft batch | ❌ Không hiển thị | ✅ Hiển thị số lượng hiện có/sau khi thêm |
| Gửi lô giặt | ❌ Không có | ✅ Có dialog yêu cầu đầy đủ thông tin |
| Vendor cho draft batch | ❌ Thiếu | ✅ Bổ sung khi gửi |
| Flow hoàn chỉnh | ❌ Không | ✅ draft → delivered với đầy đủ data |

---

## CHỨC NĂNG CHI TIẾT

### AddToLaundryBatchDialog
- Hiển thị mã yêu cầu, phòng
- Liệt kê danh sách đồ giặt với số lượng
- Hiển thị thông tin lô giặt nháp (nếu có) hoặc thông báo sẽ tạo mới
- Hiển thị số lượng hiện có và sau khi thêm
- Nút Hủy / Xác nhận thêm

### SendLaundryBatchDialog  
- Hiển thị thông tin lô giặt (mã, số lượng, trọng lượng)
- Form nhập: đơn vị giặt, ngày giao, ngày dự kiến nhận, người giao, tên người nhận
- Validation với Zod schema
- Gọi RPC `send_draft_batch` để cập nhật status → delivered

### RPC send_draft_batch
- Validate batch phải ở status 'draft' và có items
- Lấy giá từ vendor contract_info
- Tính estimated_cost = total_weight_kg × price_per_kg
- Update batch với vendor, dates, staff, status
- Update vendor stats (total_orders, total_value)
