## Mục tiêu

Tạo bộ checklist QA thủ công toàn diện để bạn (hoặc team) tự click qua từng chức năng theo thứ tự, đánh dấu Pass/Fail, ghi chú lỗi. Không thay đổi code app, chỉ sinh tài liệu.

## Phạm vi checklist

Bao phủ 14 module chính theo roadmap dự án:

1. **Auth & Onboarding** — đăng ký, đăng nhập, quên mật khẩu (OTP), Google OAuth, onboarding tenant/hotel, suspended access
2. **Phân quyền & Đa hotel** — Super Admin / Owner / Hotel Manager / Department Manager / Staff; chuyển hotel, All Hotels mode
3. **Rooms** — CRUD phòng, state machine 11 trạng thái, DND/OOS auto-lift, room status transitions
4. **Bookings** — walk-in, booking thường, group booking, hourly/daily/monthly, OTA, availability conflict, early check-in surcharge
5. **Check-in / Check-out** — `perform_checkin` RPC, group checkout thủ công, inspection prerequisite, deposit logic
6. **Housekeeping & Room Check Lean** — Quick Path, Lean flow (Overview → Inspection → Review → Success), draft resume, undo, edit, QC reject, reopen
7. **Laundry** — batch FSM (delivered → ready → received → stocked), partially_received, compensation, vendor, photo
8. **Inventory** — warehouse, items, categories, asset_group, distribution orders (3-bucket), stock adjustment, minibar billing, dead stock, reorder
9. **Maintenance** — request lifecycle (waiting → pending → in_progress → completed), priority, recurring issues
10. **Payment & VietQR** — tạo invoice, QR SePay webhook, tolerance ±1.000đ, realtime update, group payment distribution
11. **Subscription** — gói theo phòng, gia hạn (extend), mua thêm phòng, grace period, suspended, renewal warnings
12. **Reports** — Revenue, Financial, Operations Insights (KPI + benchmark + AI advice + PDF export), role-based catalog
13. **Notifications & Email** — welcome notification, reminder cron, email domain, push, multi-channel
14. **Super Admin** — tenant management, announcements, version updates, platform settings, reminder automation

Mỗi module gồm:
- **Tiền điều kiện** (data cần seed, role cần test)
- **Test cases** đánh số (TC-XXX) với: thao tác → kết quả mong đợi → ô Pass/Fail/Notes
- **Edge cases** (offline, multi-tenant leak, concurrent, permission denied)
- **Mobile** (iPhone SE portrait, tap target, thumb zone)

## Cấu trúc file deliverable

```
/mnt/documents/qa-checklist/
├── 00-OVERVIEW.md              ← Hướng dẫn cách dùng + test data cần chuẩn bị
├── 01-auth-onboarding.md
├── 02-permissions-multi-hotel.md
├── 03-rooms.md
├── 04-bookings.md
├── 05-checkin-checkout.md
├── 06-housekeeping-room-check.md
├── 07-laundry.md
├── 08-inventory.md
├── 09-maintenance.md
├── 10-payment-vietqr.md
├── 11-subscription.md
├── 12-reports.md
├── 13-notifications-email.md
├── 14-super-admin.md
├── 99-regression-smoke.md      ← Smoke test 15 phút mỗi lần publish
└── QA-Checklist-Full.pdf       ← Bản tổng hợp 1 file PDF in được
```

## Format mỗi test case (mẫu)

```markdown
### TC-RC-012: Room Check Lean — Quick Path "Phòng OK hoàn toàn"

**Role:** Staff (Housekeeping)  
**Tiền điều kiện:** Phòng 101 status = `cleaning`, có booking đã checkout, daily check chưa làm hôm nay  
**Device:** iPhone SE portrait (375px)

| # | Bước | Kết quả mong đợi | Pass | Fail | Notes |
|---|------|------------------|------|------|-------|
| 1 | Vào /rooms/101/check | Redirect /check-lean (router auto) | ☐ | ☐ | |
| 2 | Tap "Phòng OK hoàn toàn" | Hiện QuickPathConfirmSheet | ☐ | ☐ | |
| 3 | Confirm | Toast success, phòng → `available`, audit log có `quick_submit` | ☐ | ☐ | |
| 4 | Vào lại /check-lean | Thấy nút "Hoàn tác" (undo) | ☐ | ☐ | |

**Edge:** Nếu là check-in/check-out (không phải daily/periodic) → Quick Path PHẢI ẩn.
```

## Test data seed (gợi ý phần OVERVIEW)

Liệt kê data tối thiểu cần có trước khi test:
- 1 tenant + 2 hotels (test multi-hotel + All Hotels mode)
- 5 users đủ 5 role
- 20 phòng × 2 hotels
- 30 items, 5 categories, 3 warehouses
- 5 bookings (walk-in, OTA, group 3 phòng, hourly, monthly)
- 3 laundry vendors, 2 batches đang chạy
- 5 maintenance requests
- 1 subscription active sắp hết hạn (test renewal warning)

(Tôi sẽ chỉ liệt kê dữ liệu cần seed — không tự seed vào DB. Nếu sau này cần script seed, làm sprint riêng.)

## Smoke test 15 phút (`99-regression-smoke.md`)

15 test case quan trọng nhất phải Pass mỗi lần publish:
1. Login Owner → Dashboard load < 2s
2. Tạo booking walk-in → check-in atomic
3. Room Check Lean → Quick Path
4. Room Check Lean → báo 1 issue damaged
5. Checkout 1 booking → thanh toán cash
6. Group checkout 3 phòng → VietQR
7. Distribution order: tạo → approve → giao
8. Laundry batch: tạo → received → stocked
9. Maintenance: tạo → assign → complete
10. Reports → Operations Insights load + PDF export
11. Đổi hotel → data filter đúng
12. Staff login → bottom nav chỉ thấy quyền của mình
13. Suspended tenant → bị chặn
14. Mobile iPhone SE → tất cả flow chính tap được
15. Multi-tenant: Owner A KHÔNG thấy data tenant B

## Cách tôi sẽ build

1. Đọc nhanh `docs/architecture/01-modules/*.md` (đã có sẵn 15 module specs) + memory files relevant để liệt kê đúng nghiệp vụ thực tế trong app
2. Viết 16 file Markdown theo cấu trúc trên (~150-250 test cases tổng)
3. Dùng `pandoc` merge → 1 file PDF A4 in được (`QA-Checklist-Full.pdf`)
4. Output `<presentation-artifact>` cho cả `.md` chính và `.pdf` để bạn tải về

## Phần CÒN THIẾU sau plan này

- Không tự động hoá (cần Sprint riêng cho Playwright nếu muốn)
- Không seed data thật (cần Sprint riêng cho Seed Demo Data button)
- Không sinh report kết quả test (bạn tự fill Pass/Fail trong file Markdown, hoặc in PDF tick tay)

## Ước tính

- Thời gian build: 1 lượt agent
- Số file tạo: 17 (16 .md + 1 .pdf)
- Số test case: ~200
- Vị trí: `/mnt/documents/qa-checklist/`

Bạn approve plan này tôi sẽ build luôn.
