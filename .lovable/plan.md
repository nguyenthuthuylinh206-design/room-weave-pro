

## Sửa lỗi: Nút "Xác nhận thêm" không hoạt động

### NGUYÊN NHÂN

Khi nhấn nút "Xác nhận thêm", hệ thống gọi hook `useDraftLaundryBatch()` để lấy thông tin lô giặt nháp hiện tại. Query này đang lỗi vì:

```
GET /rest/v1/laundry_batches?select=...item:items(id,code,name,thumbnail)...
Status: 400
Error: column items_2.thumbnail does not exist
```

**Vấn đề**: Query đang select cột `thumbnail` từ bảng `items`, nhưng cột này **KHÔNG TỒN TẠI** trong database.

### SO SÁNH

| File | Query items | Có thumbnail? |
|------|-------------|---------------|
| `useMaintenanceRequests.ts` | `item:items(id, code, name)` | Không |
| `useChargeableConsumptions.ts` | `item:items(id, name, code, charge_price, unit_price)` | Không |
| `useBookingConsumables.ts` | `item:items(id, name, code, unit_price)` | Không |
| **`useLaundryRequests.ts`** | `item:items(id, code, name, thumbnail)` | **CÓ - SAI** |

### GIẢI PHÁP

Xóa cột `thumbnail` khỏi query vì nó không tồn tại trong bảng `items`.

### FILE CẦN SỬA

| File | Dòng | Thay đổi |
|------|------|----------|
| `src/hooks/useLaundryRequests.ts` | 279 | Xóa `thumbnail` khỏi select |

### CHI TIẾT

**Trước:**
```typescript
item:items(id, code, name, thumbnail)
```

**Sau:**
```typescript
item:items(id, code, name)
```

### KẾT QUẢ MONG ĐỢI

- Query `useDraftLaundryBatch()` hoạt động bình thường (status 200)
- Dialog "Xác nhận thêm" hiển thị thông tin lô giặt nháp chính xác
- Nút "Xác nhận thêm" hoạt động và thêm được items vào batch

