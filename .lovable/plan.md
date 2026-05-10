# Plan hoàn thiện trước Pilot

Mục tiêu: từ trạng thái "feature-complete" → "ready-for-paying-customers" trong **5 sprint × 1 tuần**. Sau sprint 5 là sẵn sàng pilot 1–2 khách sạn thật.

Nguyên tắc: chỉ làm những thứ chặn pilot. Nice-to-have (BI, native app, multi-language) **không** đưa vào plan này.

---

## Sprint 1 — An toàn dữ liệu & Test (tuần 1)

**Mục tiêu**: không mất dữ liệu, không double-charge, không lệch tồn kho khi nhiều người thao tác đồng thời.

### 1.1. Chạy & cố định test concurrency có sẵn
- Chạy `supabase/tests/inventory_concurrency.sql` (đã viết, chưa verify), fix nếu fail.
- Bổ sung 4 kịch bản tương tự:
  - 5 lễ tân cùng check-in 1 phòng → chỉ 1 thành công.
  - 2 webhook SePay trùng `reference_code` → chỉ 1 invoice paid.
  - 2 NV cùng `submit_room_check_lean` 1 booking → conflict được phát hiện.
  - 5 distribution order cùng cấp phát từ 1 SKU → không âm tồn.

### 1.2. Unit test logic tài chính (Vitest)
Bắt buộc 100% các hàm sau:
- `calculateBookingTotal`, `calculateUnpaidDebt`, `distributeGroupPayment`.
- `calculateEarlyCheckinSurcharge`, `calculateExtraServiceCharges`.
- Mapping `consolidateDisplayStatus` (distribution UI).

### 1.3. Integration test edge function
- `sepay-webhook`: 6 kịch bản (match đúng, lệch ±1k, sai content, duplicate, type=extend, additional_rooms).
- `create-user`, `update-user`: hierarchy enforcement.
- `mobile-scan-upload`: tenant isolation.

**Deliverable**: GitHub Actions chạy test mỗi PR, coverage ≥80% cho 3 module: bookings, payments, inventory.

---

## Sprint 2 — Onboarding & Hướng dẫn (tuần 2)

**Mục tiêu**: 1 chủ khách sạn tự setup app trong 30 phút mà không cần gọi support.

### 2.1. Setup Wizard cho tenant mới
Trang `/onboarding` 6 bước (skip được, resume được):
1. Thông tin khách sạn (tên, địa chỉ, logo, mã số thuế).
2. Tạo warehouse mặc định (1-click).
3. Import items (Excel template tải sẵn) hoặc tạo nhanh 10 item mẫu.
4. Tạo rooms (Excel template hoặc grid input theo tầng).
5. Mời user (Manager + Staff đầu tiên qua email).
6. Cấu hình ca làm việc (3 ca mặc định: sáng/chiều/đêm).

Trigger: `tenant.onboarded_at IS NULL` → auto redirect khi login lần đầu.

### 2.2. Empty state hướng dẫn ở mỗi module
Khi list rỗng → hiển thị illustration + 3 bước + button "Bắt đầu". Áp dụng cho: rooms, items, bookings, distribution, laundry, maintenance.

### 2.3. Tooltip onboarding theo role
Lần đầu vào mỗi trang chính, hiện 3–5 tooltip dẫn dắt (driver.js hoặc tự build). Lưu cờ `user.tour_completed.{page}`.

**Deliverable**: video demo 3 phút quay lại flow setup → đăng landing page.

---

## Sprint 3 — Đối soát thanh toán & Báo cáo cuối ca (tuần 3)

**Mục tiêu**: chủ khách sạn ngủ ngon — không sợ tiền lệch, lễ tân bàn giao tiền minh bạch.

### 3.1. Cron đối soát SePay
- Edge function `reconcile-sepay-payments` chạy mỗi giờ.
- So sánh `payment_transactions` (status `pending` >30 phút) vs API SePay.
- 3 trường hợp: match thiếu → tự update; không có ở SePay → mark `expired`; có ở SePay nhưng không có ở app → tạo `payment_anomaly` record + notify Owner.
- Trang `/finance/reconciliation` cho Owner xem anomaly + resolve thủ công.

### 3.2. Báo cáo cuối ca lễ tân
- Trang `/reports/shift-handover` tổng hợp 1 ca:
  - Số booking check-in / check-out / huỷ.
  - Doanh thu phòng + dịch vụ + minibar.
  - Tiền mặt thu được (theo từng phương thức).
  - Số dư đầu ca + cuối ca + chênh lệch.
- Nút "In PDF bàn giao" (chữ ký lễ tân giao + nhận).
- Lưu `shift_handover_records` để truy vết.

### 3.3. Báo cáo cuối ngày tự động
- Cron 23:55 mỗi ngày → render PDF tổng kết → email cho Owner + lưu storage `daily-reports/`.

**Deliverable**: 2 mẫu PDF chuẩn (handover + daily) đã review với 1 chủ khách sạn thật.

---

## Sprint 4 — Monitoring, Backup, Cron Health (tuần 4)

**Mục tiêu**: phát hiện sự cố trước khi khách hàng phát hiện.

### 4.1. Cron health dashboard
- Bảng `cron_run_log`: mọi cron job ghi lại `job_name, started_at, finished_at, status, error`.
- Trang `/super-admin/system/cron`: list job + lần chạy cuối + tỷ lệ thành công 7 ngày + button "Run now".
- Áp dụng cho 8 cron đang chạy (DND lift, grace, snapshot hourly, reminder, reconcile, daily report, presence cleanup, room status auto-transition).

### 4.2. Performance monitoring
- Wrap top 10 RPC quan trọng (`perform_checkin`, `perform_checkout`, `submit_room_check_lean`, `transition_*`, `distribute_group_payment`...) đo p50/p95/p99.
- Bảng `rpc_performance_metrics` (rollup hourly).
- Trang Super Admin: chart latency theo RPC + alert khi p95 > 500ms 3 chu kỳ liên tiếp.

### 4.3. Backup & Rollback playbook
- Tài liệu `docs/RUNBOOK.md`:
  - Cách restore DB từ Supabase backup (point-in-time).
  - Cách rollback migration cụ thể (mọi migration mới phải có `-- ROLLBACK` block).
  - Quy trình xử lý sự cố: payment lệch / tồn kho âm / RLS leak / cron fail.
- Test thử restore vào staging 1 lần.

### 4.4. Error tracking
- Tích hợp Sentry hoặc tự build `client_error_log` + `edge_error_log` table.
- Trang Super Admin xem error gần nhất, group theo signature.

**Deliverable**: Owner có thể tự xem "hệ thống đang khoẻ không" ở 1 trang.

---

## Sprint 5 — Email Production, Polish, Pilot Setup (tuần 5)

**Mục tiêu**: bật pilot.

### 5.1. Email infrastructure production-ready
- Setup email domain Lovable Cloud cho tenant chính (`notify.{domain}`).
- Verify DKIM/SPF/DMARC.
- Migrate các nơi đang dùng email mock → `send-transactional-email` qua queue.
- Test send: invoice PDF, password reset, welcome, renewal warning, daily report.

### 5.2. Polish các điểm UX còn rough
- Chạy lại checklist mobile portrait (iPhone SE, Android 360px) trên 10 flow chính.
- Fix loading state / empty state / error toast còn thô.
- Kiểm tra Vietnamese terminology toàn app (script tự động grep từ tiếng Anh trong UI).

### 5.3. Legal & Compliance
- Trang `/legal/terms`, `/legal/privacy` (template VN có sẵn, customize tên app).
- Cookie banner (nếu publish public).
- Trang `/help` với FAQ + nút liên hệ Zalo/Email support.

### 5.4. Pilot kit
- Tài liệu `PILOT_PLAYBOOK.md`: tiêu chí chọn khách sạn, checklist setup tại site, kênh feedback, SLA fix bug, quy trình rollback nếu pilot fail.
- Form Google Form thu feedback hàng tuần.
- Slack/Zalo channel riêng cho pilot.

**Deliverable**: 1–2 khách sạn pilot ký cam kết, lịch onboard trong tuần 6.

---

## Tổng quan thứ tự ưu tiên

```text
Sprint 1: An toàn (test)         ← chặn cứng, không bỏ qua
Sprint 2: Onboarding             ← chặn pilot (khách không tự setup được)
Sprint 3: Tài chính (đối soát)   ← chặn niềm tin (chủ KS sợ mất tiền)
Sprint 4: Monitoring             ← chặn vận hành (không thấy sự cố)
Sprint 5: Email + Pilot kit      ← bật go-live
```

## Giả định
- Đội: 1 dev fulltime + bạn duyệt UX. Nếu nhiều dev hơn → song song Sprint 1+2 và 3+4.
- Pilot: chấp nhận 2–3 sao, ≤30 phòng, có Owner sẵn sàng feedback.
- Không thêm feature mới ngoài plan này trong 5 tuần — feature request mới phải đợi sau pilot.

## Rủi ro chính
1. **Test concurrency phát hiện race condition lớn** → có thể trượt Sprint 1 sang tuần 2. Mitigate: scope hẹp 5 kịch bản trên.
2. **SePay đối soát phức tạp hơn dự kiến** (rate limit / API thay đổi) → chuẩn bị fallback xem manual + export CSV.
3. **Khách pilot từ chối / không đủ commitment** → có 3 ứng viên backup, pre-screen sớm từ Sprint 3.

## Sau pilot (không thuộc plan này)
- BI nâng cao, Multi-language, Native app, Marketplace tích hợp OTA, AI gợi ý giá phòng.
