
# Sprint 1 — Pháp lý & Pricing v2

Mục tiêu: trước 5/2026 phải đáp ứng yêu cầu khai báo lưu trú trực tuyến của Bộ Công an, đồng thời chuẩn hoá hệ giá theo mô hình thực tế KS Việt Nam (Skyhotel-style 7 trục: ngày / qua đêm / giờ / tháng + 4 phụ thu).

## A. Kiến trúc & logic nghiệp vụ

### A1. tbltkbtt — Khai báo lưu trú
- Mở rộng bảng `guests` với các trường BCA bắt buộc.
- Tạo bảng `guest_stay_registrations` ghi nhận từng lần lưu trú (1 booking → N guest stay records).
- Edge Function `tbltkbtt-submit` đẩy XML/JSON sang cổng `https://tbltkbtt.gov.vn` (theo spec PA08 mỗi tỉnh có endpoint riêng). MVP: lưu kèm `payload_xml`, trạng thái `pending/submitted/failed/acked`, có nút "Gửi lại".
- Trigger sau `perform_checkin`: tự sinh bản ghi `guest_stay_registrations` cho tất cả khách trong booking. Đẩy lên cổng async (worker mỗi 2 phút) để không chặn check-in.
- Cấu hình per-hotel: account, mật khẩu mã hoá Vault, mã tỉnh, mã cơ sở lưu trú.

### A2. Pricing v2 — 7 trục giá
Hiện trạng: `room_bookings.booking_type` đã có (`daily|hourly|monthly`), `room_types.base_price` 1 giá, `room_pricing_rules` đã có early/late surcharge. Thiếu:
- Giá **qua đêm** (overnight, ngắn hơn 1 đêm chuẩn, ví dụ 22:00–09:00).
- Bảng giá chi tiết theo từng loại phòng × từng loại (ngày/qua đêm/giờ/tháng).
- Phụ thu early check-in / late check-out tham chiếu đến rule chứ không hardcode trong booking.
- Mùa cao điểm overlay (add-on vs overwrite).

Giải pháp:
- `room_type_rates` (chuẩn 4 bucket × loại phòng): `daily_rate`, `overnight_rate`, `hourly_rate`, `monthly_rate`, `overnight_start_time`, `overnight_end_time`, `weekday_multiplier jsonb` (T2…CN).
- `seasonal_rate_overrides`: theo khoảng `from_date`–`to_date`, áp dụng cho tập `room_type_ids[]`, kiểu `add_on` (cộng %/VND) hoặc `overwrite` (ghi đè), ưu tiên `priority int`.
- Thêm `room_bookings.overnight_rate`, `overnight_start_time`, `overnight_end_time`. Đổi `booking_type` enum thêm `overnight`.
- RPC `calculate_booking_price(room_type_id, booking_type, from_ts, to_ts, hotel_id, weekday)` trả về `{base, surcharge_breakdown[], seasonal_adjust, total}` — UI gọi khi tạo booking & khi check-out để recompute (đã có check-in surcharge logic, mở rộng).

### A3. Sao chép loại phòng
- RPC `duplicate_room_type(source_id, new_name, new_code, copy_rates bool, copy_default_items bool)` atomic: clone `room_types` + `room_type_rates` + `default_items`. Yêu cầu Skyhotel: KS thường có 5–10 hạng phòng gần giống nhau, copy nhanh giảm 10–15 phút setup/lượt.

## B. Schema / migration

```sql
-- B1. Guests: bổ sung trường BCA
ALTER TABLE public.guests
  ADD COLUMN id_issue_date date,
  ADD COLUMN id_issue_place text,
  ADD COLUMN id_expiry_date date,
  ADD COLUMN ethnicity text,
  ADD COLUMN religion text,
  ADD COLUMN occupation text,
  ADD COLUMN permanent_address text,
  ADD COLUMN visa_number text,        -- khách nước ngoài
  ADD COLUMN visa_expiry date,
  ADD COLUMN entry_date date,
  ADD COLUMN entry_port text;

-- B2. guest_stay_registrations (tbltkbtt log)
CREATE TABLE public.guest_stay_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES room_bookings(id) ON DELETE SET NULL,
  guest_id uuid NOT NULL REFERENCES guests(id),
  room_number text NOT NULL,
  check_in_at timestamptz NOT NULL,
  check_out_at timestamptz,
  purpose text,             -- du lịch / công tác / khác
  status text NOT NULL DEFAULT 'pending',
  -- pending | submitting | submitted | acked | failed | manual
  payload jsonb,
  response jsonb,
  external_ref text,        -- mã ack từ BCA
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.guest_stay_registrations TO authenticated;
GRANT ALL ON public.guest_stay_registrations TO service_role;
ALTER TABLE public.guest_stay_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.guest_stay_registrations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- B3. hotels.tbltkbtt_config jsonb (account, prov_code, facility_code, vault_secret_key)

-- B4. room_type_rates
CREATE TABLE public.room_type_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  overnight_rate numeric(12,2),
  hourly_rate numeric(12,2),
  hourly_first_block_hours int DEFAULT 2,
  hourly_first_block_price numeric(12,2),
  monthly_rate numeric(12,2),
  overnight_start_time time DEFAULT '22:00',
  overnight_end_time time DEFAULT '09:00',
  weekday_multiplier jsonb DEFAULT '{}'::jsonb, -- {"sat":1.15,"sun":1.15}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_type_rates TO authenticated;
ALTER TABLE public.room_type_rates ENABLE ROW LEVEL SECURITY;
-- policies tenant_id IN (...)

-- B5. seasonal_rate_overrides
CREATE TABLE public.seasonal_rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  hotel_id uuid,
  name text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  room_type_ids uuid[] NOT NULL DEFAULT '{}',
  apply_to text[] NOT NULL DEFAULT '{daily,overnight}', -- bucket nào
  mode text NOT NULL CHECK (mode IN ('add_on','overwrite')),
  adjust_type text NOT NULL CHECK (adjust_type IN ('percent','vnd')),
  adjust_value numeric(12,2) NOT NULL,
  priority int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- + GRANTs, RLS, policies

-- B6. room_bookings mở rộng
ALTER TABLE public.room_bookings
  ADD COLUMN overnight_rate numeric(12,2),
  ADD COLUMN overnight_start_time timestamptz,
  ADD COLUMN overnight_end_time timestamptz,
  ADD COLUMN price_breakdown jsonb;
-- enum booking_type không phải enum DB (text), chỉ cần update CHECK nếu có

-- B7. Backfill room_type_rates từ room_types.base_price
INSERT INTO room_type_rates(tenant_id,hotel_id,room_type_id,daily_rate)
SELECT tenant_id,hotel_id,id,COALESCE(base_price,0) FROM room_types
ON CONFLICT DO NOTHING;
```

## C. API / RPC / Edge functions

| Tên | Loại | Mục đích |
|---|---|---|
| `duplicate_room_type` | RPC SECURITY DEFINER | Clone loại phòng + rates + default_items |
| `calculate_booking_price` | RPC | Tính giá theo 4 bucket + surcharge + season, trả `price_breakdown` JSON |
| `get_room_type_rate_matrix(hotel_id)` | RPC | Trả ma trận để UI cài đặt giá hiển thị dạng bảng |
| `enqueue_stay_registration(booking_id)` | RPC trigger sau check-in | Tạo bản ghi `guest_stay_registrations` |
| `retry_stay_registration(id)` | RPC | Manager bấm gửi lại |
| `tbltkbtt-submit` (Edge Fn) | cron mỗi 2 phút | Lấy `pending`, build payload, POST cổng BCA, update status |
| `tbltkbtt-test-credentials` (Edge Fn) | manual | Kiểm tra account hotel có hợp lệ |

## D. UI screens / components

1. **Cài đặt → Pháp lý → Khai báo lưu trú** (`/settings/legal/stay-registration`)
   - Form per-hotel: tài khoản BCA, mã tỉnh, mã cơ sở, "Test kết nối", bật/tắt tự động gửi.
2. **Lễ tân → Khai báo lưu trú** (`/legal/stay-registrations`) — danh sách, filter status, retry, export CSV.
3. **Form khách (GuestForm)** mở rộng: tab "Giấy tờ" gồm ngày cấp, nơi cấp, dân tộc, tôn giáo, nghề nghiệp, địa chỉ thường trú, visa (nếu nước ngoài). Tích hợp OCR Gemini sẵn có để autofill các trường mới.
4. **Cài đặt → Giá phòng v2** (`/settings/pricing`)
   - Tab "Bảng giá loại phòng": grid 4 cột (Ngày / Qua đêm / Giờ / Tháng) cho từng loại phòng, edit inline.
   - Tab "Giờ qua đêm chuẩn": chỉnh start/end.
   - Tab "Hệ số cuối tuần": jsonb editor đơn giản (slider/percent).
   - Tab "Phụ thu sớm/muộn": tái dùng UI `room_pricing_rules` hiện có.
   - Tab "Mùa cao điểm": CRUD `seasonal_rate_overrides` với date range picker.
5. **Loại phòng (`/rooms/types`)** — thêm nút "Sao chép" mỗi row → dialog (tên mới, mã mới, checkbox copy bảng giá, checkbox copy default items).
6. **BookingForm** — khi chọn `booking_type=overnight` hiển thị field giờ qua đêm; gọi `calculate_booking_price` realtime, hiển thị `price_breakdown` (base / weekend / season / surcharge) collapsible.
7. **CheckoutDialog** — hiển thị breakdown 4 dòng (giá phòng, phụ thu sớm, phụ thu muộn, phụ thu mùa) thay vì gộp.

## E. Permission / role rules

- `manage_pricing` (mới) — Owner/Manager: cài giá, mùa cao điểm, sao chép loại phòng.
- `view_pricing` — Staff: chỉ xem trên booking form, không sửa.
- `manage_stay_registration` — Owner/Manager: cấu hình tbltkbtt + retry.
- `view_stay_registration` — Lễ tân: xem danh sách, không sửa cấu hình.
- Map vào `flexible-module-action-system-v1`: thêm module `pricing` và `stay_registration` (8 action chuẩn, dùng `view` + `manage`).

## F. Test cases

DB / RPC:
- `duplicate_room_type` copy đúng rates + items, mã trùng → trả lỗi VI hoá.
- `calculate_booking_price`:
  - Ngày thường vs cuối tuần (multiplier).
  - Qua đêm vắt qua nửa đêm 22:00→09:00 → tính đúng overnight_rate.
  - Mùa cao điểm `add_on 15%` + weekend 15% (không double-apply).
  - Early 04:00 + late 16:00 → cộng đủ 2 surcharge.
- `enqueue_stay_registration` tạo N bản ghi khi booking N khách.
- RLS: user tenant A không đọc được rates/overrides tenant B.

Edge Fn `tbltkbtt-submit`:
- Mock cổng trả 200 → status `acked`, external_ref set.
- Mock 500 → status `failed`, `attempt_count++`, retry tối đa 5.
- Hotel chưa cấu hình → status `manual`, không retry.

UI:
- BookingForm qua đêm: tổng tiền realtime, breakdown hiện đủ.
- Pricing matrix lưu rồi reload không mất giá trị.
- Stay registrations: filter `failed` + bấm "Gửi lại" → status chuyển `pending`.

Mục tiêu coverage logic giá ≥ 85%.

## G. Rollout notes

Tuần 1:
- Day 1–2: migration B1–B7 + backfill, deploy staging, verify với 1 hotel pilot.
- Day 3–4: RPC + Edge Fn + cron tbltkbtt (chạy dry-run, log only, KHÔNG POST thật).
- Day 5: UI cài đặt giá + sao chép loại phòng.

Tuần 2:
- Day 6–7: UI BookingForm + Checkout breakdown (feature flag `pricing_v2_enabled` per-tenant, default off).
- Day 8: UI khai báo lưu trú + form khách mở rộng.
- Day 9: QA + test cases + fix.
- Day 10: Bật `pricing_v2_enabled` cho 3 hotel pilot, theo dõi 48h. Bật tbltkbtt POST thật cho 1 hotel có sẵn account BCA.

Rollback:
- Feature flag tắt → BookingForm fallback dùng `room_types.base_price` + booking columns cũ.
- Migration B6 dùng cột mới, không drop cột cũ → revert chỉ cần tắt flag.
- tbltkbtt dry-run mode (`hotels.tbltkbtt_config.dry_run=true`) — chỉ ghi DB, không POST.

Giả định:
- Endpoint BCA mỗi tỉnh khác nhau → MVP làm 1 adapter chung + cấu hình URL trong `tbltkbtt_config.endpoint_url`. Tỉnh nào cần XML đặc thù sẽ thêm adapter sau.
- Chỉ 1 `room_type_rates` per `room_type` (unique). Trường hợp cùng loại phòng nhưng giá khác theo chi nhánh: hiện `room_types` đã có `hotel_id` nên đủ tách.
- "Qua đêm" mặc định 22:00–09:00, mỗi hotel chỉnh được.

Phần KHÔNG nằm trong Sprint 1 (để sprint sau): split-invoice transfer, cash drawer ca, booking engine SePay auto-confirm, retail service sales, e-invoice — đã lưu trong roadmap 6-sprint.
