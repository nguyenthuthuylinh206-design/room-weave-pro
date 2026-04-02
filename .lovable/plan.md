

## Phân tích Logic Online/Offline Nhân sự — Vấn đề phát hiện

### Cách hoạt động hiện tại

Trạng thái nhân viên được lưu trong bảng `staff_status` với 4 giá trị: `available`, `busy`, `break`, `offline`.

**Cách set trạng thái:**
1. **Thủ công**: Nhân viên tự đổi trạng thái qua `useUpdateMyStatus` (upsert vào `staff_status`)
2. **Tự động khi kiểm tra phòng**: Trigger `update_staff_status_from_room_check` → tự chuyển sang `busy` khi bắt đầu room check, về `available` khi kết thúc
3. **Mặc định**: Nếu user chưa có record trong `staff_status` → hiển thị `offline` (fallback ở dòng 112: `status?.status || 'offline'`)

---

### Lỗi 1 (NGHIÊM TRỌNG): Không có cơ chế tự động chuyển sang `offline`

**Hiện tại**: Một khi nhân viên set trạng thái `available`, trạng thái đó giữ **MÃI MÃI** — kể cả khi họ đóng app, tắt máy, hoặc không hoạt động nhiều ngày.

Dữ liệu thực tế chứng minh: Có nhân viên `last_seen_at = 2026-01-12` (gần 3 tháng trước) nhưng `status = available`.

**Cần**: Cron job hoặc trigger tự động chuyển nhân viên sang `offline` khi `last_seen_at` quá X phút (ví dụ 30 phút không hoạt động).

### Lỗi 2 (NGHIÊM TRỌNG): Không cập nhật `last_seen_at` khi user hoạt động

**Hiện tại**: `last_seen_at` chỉ được cập nhật khi:
- Nhân viên chủ động đổi trạng thái (`useUpdateMyStatus`)
- Trigger room check chạy

**Thiếu**: Không có heartbeat/ping định kỳ từ client. Nếu nhân viên đang dùng app nhưng không đổi trạng thái hay kiểm tra phòng → `last_seen_at` không cập nhật → hệ thống không biết họ còn online.

### Lỗi 3 (TRUNG BÌNH): Kết thúc ca không chuyển offline

Khi nhân viên kết thúc ca (`useShiftManagement` → `endShift`), chỉ set `shift_end_at` nhưng **không** chuyển `status` sang `offline`. Nhân viên hết ca vẫn hiển thị `available`.

### Lỗi 4 (NHẸ): User mới chưa có record `staff_status`

User mới tạo không tự động có record trong `staff_status`. Fallback `offline` đúng logic nhưng thiếu `last_seen_at` → không hiển thị "Hoạt động X phút trước".

---

### Kế hoạch sửa

| # | File | Thay đổi |
|---|------|----------|
| 1 | Migration SQL | Tạo cron function `auto_offline_inactive_staff`: chuyển `status = 'offline'` cho staff có `last_seen_at < now() - interval '30 minutes'` và `status != 'offline'` |
| 2 | `supabase/functions/check-subscription-status/index.ts` | Thêm gọi function `auto_offline_inactive_staff` vào cron hiện có (chạy mỗi 5 phút) |
| 3 | `src/hooks/useStaffStatus.ts` | Thêm heartbeat: khi component mount, upsert `last_seen_at = now()` mỗi 5 phút cho user hiện tại (chỉ khi đã có record) |
| 4 | `src/hooks/useShiftManagement.ts` | Khi `endShift`, set thêm `status: 'offline'` cùng lúc set `shift_end_at` |
| 5 | Migration SQL | Tạo trigger: khi user mới được tạo trong `users`, auto insert record `staff_status` với `status = 'offline'` |

### Chi tiết kỹ thuật

**Heartbeat (client)**: Trong `useStaffStatus`, thêm `useEffect` với `setInterval` 5 phút, gọi:
```typescript
supabase.from('staff_status')
  .update({ last_seen_at: new Date().toISOString() })
  .eq('user_id', currentUserId)
```

**Auto-offline (DB function)**:
```sql
UPDATE staff_status 
SET status = 'offline', updated_at = now()
WHERE status != 'offline' 
  AND last_seen_at < now() - interval '30 minutes';
```

**End shift → offline**:
```typescript
.update({ shift_end_at: now, status: 'offline', last_seen_at: now })
```

