## Bối cảnh

Tab "Giá mặc định" và "Lịch giá theo ngày" đang lệch nhau vì dữ liệu `room_types` bị nhân bản nghiêm trọng:

- **DLX**: 6 bản room_type, mỗi bản 1 giá (20tr / 3.5tr / 1tr / 800k / 560k / 1tr) — 4 bản tạo cùng lúc `2026-05-31 13:48:08` do trigger auto-sync chạy lặp
- **STD**: 9 bản (giá từ 33.330đ đến 30.000.000đ — có dòng nhập sai 3 chữ số 0)
- **SUI**: 3 bản · **SUP**: 2 bản · **VIP**: 1 bản
- Chỉ 1 room_type (Deluxe bản mới nhất) có `rate_plan` → 4 hạng còn lại trống ở Lịch giá
- `room_types.hotel_id = NULL` cho TẤT CẢ → không có scope theo khách sạn, cũng không có unique constraint chống trùng
- `rooms` link với `room_types` qua text key (`room_type='deluxe'`) chứ không qua FK, nên rooms không "giữ" được room_type nào → khi dedupe có thể xoá thoải mái bản dư

## Hướng giải quyết (theo lựa chọn của anh)

**Nguồn truth = `rate_plans` "Giá tiêu chuẩn"** (1 plan default / room_type). `room_type_rates.daily_rate` chỉ là **shortcut** — khi sửa, tự đồng bộ về plan default.

---

## A. Logic / Kiến trúc

1. **1 room_type / (hotel_id, code)**: thêm UNIQUE constraint, hết trùng.
2. **Mỗi room_type có đúng 1 rate_plan default** "Giá tiêu chuẩn", chứa giá đêm chuẩn.
3. **room_type_rates** giữ nguyên cho 3 trục giá (đêm/giờ/tháng) nhưng `daily_rate` được **đồng bộ 2 chiều** với `rate_plans.price` (plan `is_default=true`) qua trigger.
4. Auto-sync `rooms → room_types` dùng `ON CONFLICT DO NOTHING` để không insert trùng nữa.

## B. Schema / Migration

```sql
-- 1. Bổ sung hotel_id cho room_types (nullable cho bản global, có cho bản theo hotel)
-- (đã có cột hotel_id, kiểm tra lại)

-- 2. Dedupe room_types: với mỗi (code), giữ bản có rate_plan,
--    nếu không có thì giữ bản mới nhất. Xoá các bản còn lại
--    cùng room_type_rates của chúng (chỉ giữ rate của bản giữ lại,
--    với daily_rate = rate_plans.price nếu có).

-- 3. UNIQUE (hotel_id, code) — partial index để cho phép nhiều NULL
CREATE UNIQUE INDEX room_types_hotel_code_uniq
  ON public.room_types (COALESCE(hotel_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

-- 4. Bù rate_plan default cho 4 hạng còn thiếu (STD/SUI/SUP/VIP)
--    INSERT rate_plans (room_type_id, name='Giá tiêu chuẩn', is_default=true,
--      price = room_type_rates.daily_rate)

-- 5. Trigger 2 chiều sync room_type_rates.daily_rate ↔ rate_plans.price (default plan)
--    - AFTER UPDATE OF daily_rate ON room_type_rates → update plan.price
--    - AFTER UPDATE OF price ON rate_plans WHERE is_default → update room_type_rates.daily_rate

-- 6. Sửa trigger auto_sync_room_types: INSERT ... ON CONFLICT (hotel_id, code) DO NOTHING
```

**Số liệu dự kiến sau dedupe** (sẽ in ra trong migration để anh review trước khi commit):

| Code | Hiện tại | Sau | Giá giữ lại |
|---|:-:|:-:|---|
| DLX | 6 | 1 | từ rate_plan = **2.066.666đ** (anh có thể sửa lại sau) |
| STD | 9 | 1 | giá hợp lý nhất, em đề xuất **500.000đ** (loại các bản 33k và 30tr) |
| SUI | 3 | 1 | **1.500.000đ** (cả 3 bản giống nhau) |
| SUP | 2 | 1 | **700.000đ** (cả 2 bản giống nhau) |
| VIP | 1 | 1 | **2.500.000đ** (giữ nguyên) |

> Em sẽ in `RAISE NOTICE` từng bản bị xoá để có audit, KHÔNG xoá rate_plan / rate đã link với booking.

## C. API / RPC

- Không thêm RPC mới. Trigger sync 2 chiều là đủ.
- `useRoomTypeRates` và `useRatePlans` tự được lợi vì dữ liệu sạch.

## D. UI

- `PricingV2Page` (tab Giá mặc định): thêm chú thích nhỏ dưới input `Giá đêm`: "_Tự đồng bộ với Rate Plan 'Giá tiêu chuẩn'_".
- `PricingHubPage`: banner cảnh báo "X hạng phòng chưa có giá mặc định" tự biến mất sau migration.
- Không đổi layout, không đổi component lớn.

## E. Permission

- Migration chạy ở quyền `service_role`, không ảnh hưởng RLS hiện hữu.
- Trigger sync chạy `SECURITY DEFINER` với search_path cố định.

## F. Test

- `supabase/tests/pricing_dedupe.sql`:
  - Sau migration, `SELECT count(*) FROM room_types WHERE code='DLX'` = 1
  - Mọi room_type có đúng 1 `rate_plans` với `is_default=true`
  - Update `room_type_rates.daily_rate = 1800000` → `rate_plans.price = 1800000`
  - Update `rate_plans.price = 1900000` → `room_type_rates.daily_rate = 1900000`
  - Insert duplicate `room_types (hotel_id, code)` → bị reject

## G. Rollout

1. Tạo migration (dedupe + unique index + trigger sync + sửa auto-sync).
2. Anh review danh sách bản giữ lại trong description trước khi approve.
3. Sau khi chạy: vào `/settings/pricing` tab "Giá mặc định" → chỉ còn 5 dòng, mỗi hạng 1 giá; tab "Lịch giá" hiển thị đầy đủ 5 hạng với cùng giá chuẩn.
4. Anh có thể chỉnh từng giá → tự đồng bộ sang Rate Plan và Lịch giá.
5. Bump `APP_VERSION` + `changelog.json` theo Release Convention.

**Rollback**: migration có `BEGIN/COMMIT` rõ ràng; mọi bản room_type bị xoá được log qua `RAISE NOTICE`. Nếu cần khôi phục, em có thể viết migration ngược tạo lại bản đó (nhưng các bản này hiện không có rooms tham chiếu nên không gây mất dữ liệu nghiệp vụ).

## Phần còn thiếu (sẽ làm sau, không nằm trong plan này)

- Refactor `rooms.room_type` (text) → `rooms.room_type_id` (FK) để chuẩn hoá hoàn toàn. Đây là phase riêng vì ảnh hưởng booking, availability, pricing pipeline.
- Cho phép room_type theo từng hotel (hiện tại tất cả `hotel_id = NULL` = global). Nếu anh chuỗi 3–4 KS muốn giá khác nhau / hạng, cần thêm bước migrate sang bản theo hotel.
