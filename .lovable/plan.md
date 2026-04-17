

## Đánh giá hiệu suất khi 10.000 người dùng đồng thời

### Kết luận nhanh
Codebase hiện tại **chưa sẵn sàng cho 10K user concurrent**. Dưới đây là các vấn đề lớn nhất, phân theo mức độ nghiêm trọng.

---

### 🔴 NGHIÊM TRỌNG — Phải sửa trước

**1. App.tsx eager-import 120 page components → bundle JS đầu vào quá lớn**
- File `App.tsx` (1021 dòng) `import` toàn bộ 120 page (Dashboard, Inventory, Items, Reports, SuperAdmin, Maintenance, PO, …) ngay từ đầu.
- Hệ quả: 1 user mới mở `/` cũng phải tải `recharts`, `exceljs`, `jspdf`, `html2canvas`, `framer-motion`, `qr-code-styling`, `qr-scanner-wechat`, `embla-carousel`, `html5-qrcode`… → bundle có thể 2–4 MB.
- Với 10K user mỗi lần deploy mới, bandwidth + LCP tăng gấp nhiều lần.
- **Fix:** dùng `React.lazy()` + `<Suspense>` cho mọi route nặng (đặc biệt Reports, SuperAdmin, Laundry, Maintenance, Inventory). Hiện `grep "React.lazy"` trả về **0 kết quả**.

**2. Realtime subscriptions không kiểm soát — sẽ là chi phí lớn nhất khi scale**
- 26 file dùng `supabase.channel(...)`, mỗi user khi vào dashboard có thể mở 5–10 channel song song (tasks, stock, payments, sessions, staff_status, bookings, laundry, telegram_connections, …).
- 10.000 user × ~7 channel = ~70.000 realtime connections đồng thời. Mặc định Supabase plan thường giới hạn ở mức thấp hơn rất nhiều, đồng thời tăng CPU instance đáng kể.
- Nhiều channel còn **không có filter `tenant_id`** (ví dụ `telegram_connections` trong `useStaffStatus`, `laundry-requests-changes` trong `LaundryRequestsTab`, `unified-tasks-housekeeping`) → mọi user nhận event của tất cả tenant → sai dữ liệu + bùng băng thông.
- **Fix:**
  - Bắt buộc `filter: tenant_id=eq.${tenantId}` cho mọi channel.
  - Gộp nhiều channel của cùng 1 page vào 1 channel duy nhất (Supabase cho phép `.on(...).on(...)` chồng nhau).
  - Chỉ subscribe khi page đang `visible` (`document.visibilityState === 'visible'`), unsubscribe khi tab ẩn.

**3. Polling `refetchInterval` chồng chéo → đập database liên tục**
- 18 hook dùng `refetchInterval` 30s–2 phút: `useDashboardStats`, `useStaffStatus`, `useInventoryDashboard`, `useLaundryDashboard`, `usePendingCounts`, `usePendingPayments`, `useBookingConflicts`, `useReports`, `useStockAdjustments`, `useOnShiftStaffList(All)`, `useBookingStats`, `RecentActivityFeed` (30s), `NotificationBell`, …
- 1 user mở Dashboard có thể phát sinh ~10 query mỗi phút. 10K user → **~100.000 query/phút = ~1.700 query/giây** chỉ riêng polling.
- Đã có realtime rồi thì không cần polling nữa.
- **Fix:** bỏ `refetchInterval` ở các hook đã có realtime; giữ lại chỉ cho cron-like data (ví dụ subscription expiry).

---

### 🟠 QUAN TRỌNG

**4. Query không tối ưu**
- 55 file dùng `.select('*')` — kéo toàn bộ cột, nhiều cột JSON nặng (room_checks `items_lost`, `items_damaged` …).
- `BookingsPage` `limit(100)` + nested select rất lớn → mỗi khách mở trang ~vài trăm KB JSON.
- `useShiftHistory` `.limit(500)`, `useSupplementRequests` `.limit(200)`, `useRecurringIssues` `.limit(500)` → cần phân trang server-side.
- **Fix:**
  - Chỉ `select` cột thật sự cần.
  - Thêm pagination (`range(from, to)`) cho mọi list view.
  - Tạo DB index trên các cột filter phổ biến: `tenant_id`, `hotel_id`, `room_id`, `status`, `checked_at`, `created_at` (kiểm tra qua `supabase--linter`).

**5. React Query config chưa tối ưu cho high concurrency**
- `App.tsx`: `staleTime: 5 phút`, `retry: 1`, `refetchOnWindowFocus: false` — ổn cho cache nhưng:
  - Thiếu `gcTime` cao → data bị xóa nhanh, mỗi lần quay lại trang phải fetch lại.
  - Một số hook permission đã có `staleTime 5 phút / gcTime 10 phút` (theo memory) — nên áp pattern này rộng hơn cho `useUser`, `useTenant`, `useHotels` để giảm RPC.

**6. Service Worker cache file 8 MB**
- `vite.config.ts` cho phép precache file đến **8 MB** → một single chunk khổng lồ sẽ được nhồi vào SW. Khi 10K user cùng tải bản mới → bandwidth peak rất cao.
- **Fix:** giảm xuống 2 MB, kết hợp code-splitting ở mục (1) để Vite tự chia chunk nhỏ.

**7. Heartbeat staff_status mỗi 5 phút × user**
- `useStaffStatus`: mỗi user `UPDATE staff_status SET last_seen_at = now()` mỗi 5 phút.
- 10K user → ~33 write/giây liên tục, trigger realtime broadcast tới tất cả người đang xem trang Staff → khuếch đại thành ~hàng nghìn event/giây.
- **Fix:**
  - Tăng heartbeat lên 10–15 phút.
  - Dùng presence channel của Supabase Realtime thay vì UPDATE bảng (presence không ghi DB).
  - Hoặc batch heartbeat qua edge function `cron`.

---

### 🟡 NÊN LÀM

**8. Dependencies nặng nên lazy-import**
- `exceljs`, `jspdf`, `jspdf-autotable`, `html2canvas`, `qr-scanner-wechat`, `html5-qrcode`, `recharts`, `framer-motion` chỉ dùng ở 1 vài nơi → dùng `import()` động bên trong handler, không import top-level.

**9. Compute size Lovable Cloud**
- Với mục tiêu 10K concurrent user, instance mặc định gần như chắc chắn không đủ. Cần **upgrade Lovable Cloud instance** tại Backend → Advanced settings → Upgrade instance, đồng thời theo dõi DB CPU và connection pool (PgBouncer).

**10. Index DB & RLS**
- Chạy `supabase--linter` để tìm:
  - Bảng thiếu index trên cột filter.
  - RLS policy có subquery/`EXISTS` nặng cần thay bằng SECURITY DEFINER function (đã có pattern `has_role`).
- Đặc biệt rà các bảng nóng: `room_checks`, `room_check_sessions`, `housekeeping_tasks`, `room_bookings`, `booking_payments`, `notifications`, `staff_status`, `stock_adjustments`.

---

### Kế hoạch triển khai (chia 3 đợt)

**Đợt 1 — Giảm tải client & bandwidth (1–2 ngày)**
- Code-split toàn bộ route trong `App.tsx` bằng `React.lazy` + `<Suspense fallback>`.
- Lazy-import `exceljs / jspdf / html2canvas / recharts / qr-scanner / html5-qrcode` trong handler.
- Hạ `maximumFileSizeToCacheInBytes` SW xuống 2 MB.

**Đợt 2 — Giảm tải realtime & polling (1–2 ngày)**
- Audit 26 file `supabase.channel` → bắt buộc filter `tenant_id`, gộp channel cùng page, pause khi tab ẩn.
- Bỏ `refetchInterval` khỏi các hook đã có realtime (Dashboard, Inventory, Laundry, Pending counts, Booking conflicts, Staff status…).
- Chuyển `staff_status` heartbeat sang Supabase Presence; tăng chu kỳ heartbeat.

**Đợt 3 — Giảm tải database (2–3 ngày)**
- Thay `.select('*')` bằng cột cụ thể ở các hook hot path (bookings, room_checks, tasks, payments).
- Thêm pagination thật cho BookingsPage, ShiftHistory, SupplementRequests, RecurringIssues, NotificationCenter.
- Chạy `supabase--linter`, thêm index còn thiếu, refactor RLS dùng SECURITY DEFINER nếu cần.
- Khuyến nghị user **upgrade Lovable Cloud instance** trước khi mở public 10K user.

### Kết quả mong đợi
- Bundle JS đầu vào: ~3 MB → **<500 KB** (nhờ code-split).
- Realtime connections: ~7/user → **1–2/user**, có filter tenant.
- DB query/giây từ polling: ~1.700 → **gần 0**.
- Heartbeat write/giây: ~33 → **0** (chuyển sang presence).
- Sẵn sàng chịu tải tăng 10–20× so với hiện tại; phần còn lại do Lovable Cloud instance đảm nhiệm.

