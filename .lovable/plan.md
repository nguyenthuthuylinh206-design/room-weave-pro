## Vấn đề

Tab **Lịch giá theo ngày** đang trống vì bảng `rate_plans` chưa có dữ liệu (0 dòng), trong khi dự án đã có sẵn:
- 8 hạng phòng (`room_types`)
- 8 dòng `room_type_rates` với `daily_rate` (giá ngày mặc định, dùng cho booking hiện tại)
- Số lượng phòng vật lý đếm được từ bảng `rooms`

Người dùng phải bấm "Quản lý gói giá" và nhập tay → không liền mạch.

## Mục tiêu

Khi mở tab Lịch giá theo ngày, dữ liệu phải **tự động kế thừa** từ quản lý phòng:
1. Mỗi hạng phòng có sẵn một **gói giá mặc định "Giá tiêu chuẩn"** lấy từ `room_type_rates.daily_rate`.
2. **Số phòng để bán** mặc định = số phòng vật lý đang active (đã có sẵn qua `useRoomTypeDefaultQty`).
3. Khi user sửa `room_type_rates.daily_rate` ở trang khác (`PricingV2Page`), giá hiển thị ở lịch cũng đồng bộ (qua `plan.price` fallback) miễn là chưa có daily override.

## Thay đổi

### A. Logic nghiệp vụ
- Thêm khái niệm **"gói chuẩn" (standard plan)** — một row ảo trên client cho hạng phòng nào chưa có rate_plan thực, lấy `price = room_type_rates.daily_rate`.
- Khi user lần đầu chỉnh sửa (giá ngày cụ thể / sale / đóng bán) trên gói chuẩn → tự động **materialize** thành row thực trong `rate_plans` (`name='Giá tiêu chuẩn'`, `is_default=true`), rồi mới upsert daily price.

### B. Schema
- `ALTER TABLE rate_plans ADD COLUMN is_default boolean NOT NULL DEFAULT false`.
- Index `(tenant_id, room_type_id) WHERE is_default = true` để query nhanh.
- Migration **không seed dữ liệu** — gói chuẩn được tạo on-demand khi user tương tác (tránh polluting DB cho hạng phòng chưa dùng).

### C. Hooks / RPC
- Thêm hook `useRoomTypeRate(roomTypeId)` đọc `room_type_rates.daily_rate`.
- Thêm `useEnsureDefaultRatePlan()` mutation: gọi RPC `ensure_default_rate_plan(p_room_type_id)` → returns id; idempotent, tạo nếu chưa có với giá từ `room_type_rates`.
- Sửa `useRatePlans`: nếu list rỗng nhưng có `room_type_rates`, trả về thêm một plan ảo `{ id: '__default__', name: 'Giá tiêu chuẩn', price: daily_rate, isVirtual: true }`.
- Trong các handler (`applyPriceRange`, paste, fill, inline editor): nếu `planId === '__default__'` → gọi `ensure_default_rate_plan` trước, dùng id thật để upsert, sau đó invalidate `rate-plans`.

### D. UI
- Hiển thị badge "Mặc định" cạnh tên gói chuẩn.
- Empty state "Chưa có gói giá" thay bằng banner gợi ý "Đang dùng giá mặc định từ Giá mặc định · [link sang tab Giá mặc định]".
- Trong `RatePlanManager`: nếu chỉ có gói chuẩn ảo, prefill form với giá từ `room_type_rates` thay vì 0.
- Tooltip trên ô giá trống: "Đang dùng giá chuẩn X đ — bấm để override cho ngày này".

### E. Permission
- Không đổi. `ensure_default_rate_plan` chạy với quyền user hiện tại (RLS qua `tenant_id`).

### F. Test cases
1. Hạng phòng chưa có rate_plan → mở lịch → thấy 1 hàng "Giá tiêu chuẩn" với giá từ `room_type_rates`.
2. Sửa giá 1 ngày trên gói chuẩn → tự động tạo `rate_plans` row + `rate_plan_daily_prices` row.
3. Sửa `room_type_rates.daily_rate` ở tab Giá mặc định → gói chuẩn trên lịch reflect ngay (qua invalidate query).
4. Hạng phòng đã có rate_plan thực → không hiện gói ảo nữa.
5. Số phòng mặc định = count(rooms) khi chưa có override trong `room_type_availability`.

### G. Rollout
- Migration: thêm cột `is_default` + RPC `ensure_default_rate_plan`.
- Bump version `1.1.24`, changelog: "Lịch giá theo ngày tự động kế thừa giá và số phòng từ quản lý phòng".
- Memo `mem://features/pricing/daily-grid-v1` bổ sung mục "Standard plan auto-seed".
- **Rollback**: drop cột `is_default` + drop RPC; client code revert về flow yêu cầu tạo plan thủ công.

## File sẽ sửa / thêm
- Migration mới (cột + RPC + index).
- `src/hooks/usePricingDaily.ts` — thêm `useRoomTypeRate`, `useEnsureDefaultRatePlan`, sửa `useRatePlans` để trả gói ảo.
- `src/pages/settings/PricingDailyPage.tsx` — wire ensure + banner + badge "Mặc định".
- `src/components/pricing/RatePlanManager.tsx` — prefill từ `room_type_rates`.
- `src/components/pricing/InlineCellEditors.tsx` — tooltip "đang dùng giá chuẩn".
- `src/lib/app-version.ts`, `public/changelog.json`, `mem://features/pricing/daily-grid-v1`.
