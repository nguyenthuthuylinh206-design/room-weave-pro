
## Sửa lỗi: Laundry requests không được tạo khi kiểm tra phòng hàng ngày (Daily Check)

### Nguyên nhân gốc

Sau khi phân tích code và database:

| Loại kiểm tra | Tạo Laundry Request | Trạng thái |
|---------------|---------------------|------------|
| **checkout** | ✅ Có | Đúng |
| **daily** | ❌ Không | **Lỗi - cần sửa** |
| **checkin** | ❌ Không | Đúng (thường không có đồ giặt) |
| **maintenance** | ❌ Không | Đúng |

**Vấn đề:** Hàm `createLaundryRequestFromCheck()` chỉ được gọi trong `processCheckoutCheck()` (line 340-352). Khi nhân viên thực hiện **daily check** có đồ gửi giặt, hệ thống chỉ update `quantity_in_laundry` trong items table mà **KHÔNG** tạo `laundry_request` record.

**Dữ liệu DB cho thấy:**
- Room check gần nhất có laundry items: `check_type: daily` với 2 items (Chăn hè, Khăn tắm lớn)
- Bảng `laundry_requests`: **Trống hoàn toàn** (0 records)

---

### Giải pháp

Thêm logic tạo laundry request vào `processDailyCheck()` để các kiểm tra hàng ngày có đồ giặt cũng tự động tạo yêu cầu.

### Chi tiết thay đổi

#### File: `src/hooks/useRoomChecks.ts`

**1. Cập nhật interface của `processDailyCheck` để nhận thêm parameters:**

```typescript
async function processDailyCheck(params: {
  roomId: string
  data: RoomCheckFormData
  userId?: string
  tenantId?: string
  hotelId: string
  roomNumber: string
  checkId?: string          // Thêm mới
  userName?: string         // Thêm mới
}) {
```

**2. Thêm logic tạo laundry request sau khi update quantities:**

```typescript
// 3. Auto-create laundry request nếu có đồ gửi giặt
const hasLaundry = laundryItems.length > 0
if (hasLaundry && tenantId && userId && checkId) {
  await createLaundryRequestFromCheck({
    roomId,
    roomNumber,
    tenantId,
    hotelId,
    userId,
    userName: userName || 'Nhân viên',
    checkId,
    laundryItems,
  })
}
```

**3. Cập nhật call site trong main mutation (line 750-751):**

```typescript
case 'daily':
  await processDailyCheck({
    ...baseParams,
    checkId: check.id,                    // Thêm
    userName: user?.full_name || 'Nhân viên', // Thêm
  })
  break
```

---

### Kết quả mong đợi

Sau khi sửa:
1. Nhân viên thực hiện daily check với đồ gửi giặt
2. Hệ thống tự động tạo `laundry_request` với status `pending`
3. Manager nhận notification về đồ giặt từ phòng
4. Dữ liệu hiển thị ngay trong `/laundry?tab=requests` nhờ realtime subscription

---

### Kiểm tra bổ sung

Đảm bảo cũng hoạt động cho các trường hợp khác:

| Check type | Laundry | Consumed/Lost | Damaged Equipment |
|------------|---------|---------------|-------------------|
| daily | ✅ → Laundry Request | ❌ (không track) | ❌ (không track) |
| checkout | ✅ → Laundry Request | ✅ → Supplement Request | ✅ → Maintenance |
| checkin | ❌ | ❌ | Cảnh báo block |
| maintenance | ❌ | ❌ | ❌ |

---

### Thời gian triển khai

| Bước | Thời gian |
|------|-----------|
| Cập nhật processDailyCheck | ~5 phút |
| Cập nhật call site | ~2 phút |
| Test end-to-end | ~5 phút |
| **Tổng** | **~12 phút** |
