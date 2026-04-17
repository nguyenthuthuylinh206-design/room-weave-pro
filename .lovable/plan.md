

## Đợt 3 — Tối ưu Database Queries & Index

### Mục tiêu
- Giảm payload mỗi query (~50-70%) bằng cách select cột cụ thể
- Phân trang server-side cho list lớn → giảm memory + bandwidth
- Thêm DB index trên cột filter nóng → giảm CPU database
- Refactor RLS dùng SECURITY DEFINER nếu có policy nặng

---

### Phạm vi

**A. Thay `.select('*')` bằng cột cụ thể (hot path trước)**

Ưu tiên các hook query nhiều/payload lớn:
- `useBookings.ts` — booking có nhiều cột JSON nặng (guest_info, room_assignments)
- `useRoomChecks.ts` — `items_lost`, `items_damaged`, `items_consumed` JSON nặng
- `usePayments.ts` / `useBookingPayments.ts`
- `useUnifiedTasks.ts`, `useHousekeepingTasks.ts`
- `useMaintenanceRequests.ts`
- `useLaundryBatches.ts`
- `useStockAdjustments.ts`
- `useNotifications.ts`

55 file dùng `.select('*')` — Đợt 3 chỉ refactor ~10 hot path quan trọng nhất (file ít dùng giữ nguyên để tránh phình scope).

**B. Server-side pagination thực sự**

Thay `.limit(N)` lớn bằng `range(from, to)` + trả `count`:
- `BookingsPage` — hiện `limit(100)`, chuyển sang pagination 25/page
- `useShiftHistory` — `limit(500)` → 50/page
- `useSupplementRequests` — `limit(200)` → 50/page
- `useRecurringIssues` — `limit(500)` → 50/page
- `NotificationCenter` — load thêm khi scroll

**C. Thêm DB index còn thiếu**

Chạy `supabase--linter` để xác định chính xác. Dự kiến cần index trên các bảng nóng:
- `room_checks(tenant_id, hotel_id, checked_at DESC)`
- `room_check_sessions(tenant_id, room_id, status)`
- `housekeeping_tasks(tenant_id, assigned_to, status)`
- `room_bookings(tenant_id, hotel_id, status, check_in_date)`
- `booking_payments(tenant_id, booking_id, status)`
- `notifications(tenant_id, user_id, is_read)`
- `staff_status(tenant_id, user_id)`
- `stock_adjustments(tenant_id, hotel_id, created_at DESC)`

Tất cả là `CREATE INDEX IF NOT EXISTS` → an toàn, không khoá bảng lâu (dùng `CONCURRENTLY` nếu có thể).

**D. RLS audit (chỉ khi linter báo)**

Nếu linter phát hiện policy có subquery nặng → refactor sang SECURITY DEFINER function (theo pattern `has_role` đã có).

---

### Cách triển khai

1. **Chạy `supabase--linter`** để lấy danh sách index thiếu + RLS có vấn đề
2. **Tạo migration** thêm index `IF NOT EXISTS` (an toàn, idempotent)
3. **Refactor 10 hook hot path**: thay `select('*')` → cột cụ thể; chuyển sang `range()` + `count: 'exact'`
4. **Cập nhật UI pagination** ở `BookingsPage`, `ShiftHistory`, `SupplementsPage`, `RecurringIssues`, `NotificationCenter`

---

### Ảnh hưởng đến logic & dữ liệu

**KHÔNG đổi:**
- Schema, RLS policies (chỉ thêm index — không sửa rule)
- Logic nghiệp vụ
- Dữ liệu hiển thị (chỉ thay đổi cột query nhưng vẫn đủ field UI cần)

**ĐỔI:**
- List nhiều trang → user phải bấm next page (UX có pagination control rõ ràng)
- Một số hook trả về ít field hơn → nếu có component nào dùng field "ẩn" → phải bổ sung lại (mình sẽ rà type + grep usage)

**Rủi ro:**
- Bỏ sót cột cần dùng → component lỗi `undefined`. Phòng: grep mọi `data.field` cho từng hook trước khi cắt cột.
- Index `CONCURRENTLY` không chạy được trong transaction migration → dùng `CREATE INDEX IF NOT EXISTS` thường (chấp nhận khoá ngắn).

---

### Kết quả mong đợi
- Payload trung bình mỗi query: giảm 50-70%
- DB CPU khi filter nóng: giảm 30-60% nhờ index
- BookingsPage TTFB: từ ~vài trăm KB → ~30 KB/trang
- Sẵn sàng chịu tải 10K user concurrent (kết hợp Đợt 1 + 2)

### Phạm vi file
- 1 migration mới (index + có thể RLS refactor)
- ~10 hook refactor select cột
- ~5 component UI thêm pagination control

