## Kết quả rà soát logic giá hiện tại

### 1) Luồng giá đang tồn tại

```text
Giá mặc định
room_type_rates.daily_rate
        ↓
Gói giá tiêu chuẩn
rate_plans.price
        ↓
Lịch giá theo ngày
rate_plan_daily_prices.price / sale_price / is_closed
        ↓
Quy tắc mùa
seasonal_rate_overrides
        ↓
RPC tính giá cuối
resolve_daily_prices_bulk / resolve_today_prices_for_hotel
        ↓
UI hiển thị
Lịch giá theo ngày / Danh sách phòng / Sơ đồ phòng / Dialog lễ tân
```

### 2) Những phần đang khớp

- Tab **Giá mặc định** đang lưu vào `room_type_rates` theo từng hạng phòng.
- Tab **Lịch giá theo ngày** đã gọi `resolve_daily_prices_bulk` và hiện đúng giá cuối trong grid.
- Health banner đang báo đúng: khách sạn đang xem có **2/2 hạng phòng đã có giá mặc định**.
- Dữ liệu network cho `/settings/pricing?tab=daily` cho thấy RPC `resolve_daily_prices_bulk` trả giá hợp lệ:
  - Base: `2.066.666,64đ`
  - Ngày 01/06 có override: `2.500.000đ`

### 3) Lỗi chính đang làm “hiển thị giá không khớp / không thấy giá”

#### Lỗi A — RPC `resolve_today_prices_for_hotel` đang hỏng thật

Khi gọi trực tiếp RPC hiện tại, database trả lỗi:

```text
column notation .base_price applied to type jsonb, which is not a composite type
```

Nguyên nhân:
- Migration gần nhất đổi `resolve_today_prices_for_hotel` dùng `to_jsonb(x) AS row`.
- Sau đó lại đọc `(r.row).base_price`, `(r.row).final_price` như kiểu composite.
- `r.row` thực tế là `jsonb`, nên cú pháp đó sai.

Ảnh hưởng:
- `useTodayPricesByHotel()` gọi RPC này sẽ fail.
- Vì hook fail nên `todayPrices` không có dữ liệu.
- **Danh sách phòng** và **Sơ đồ phòng** không thể hiện “Giá hôm nay”.
- Đây là lý do người dùng “chưa thấy gì cả” ở các màn phòng.

#### Lỗi B — Mapping hạng phòng vẫn chưa đủ chắc

Dữ liệu thực tế:

```text
rooms.room_type = deluxe / standard
room_types.name = Phòng Deluxe / Phòng Standard
room_types.code = DLX / STD
```

Hook đã map theo:
- tên gốc: `phòng deluxe`
- bỏ tiền tố: `deluxe`
- code: `dlx`

Nhưng phần lọc và một số hiển thị vẫn dùng `room.room_type` trực tiếp. Cần gom thành 1 helper chuẩn dùng chung để tránh chỗ này sửa rồi chỗ khác vẫn lệch.

#### Lỗi C — Giá mặc định và giá trên từng phòng đang là 2 hệ khác nhau

Dữ liệu thực tế đang lệch:

```text
room_type_rates:
- Phòng Deluxe: 2.066.666,64đ
- Phòng Standard: 4.070.731,71đ

rooms.base_price:
- deluxe: 333.333đ → 2.000.000đ tùy phòng
- standard: 1.100.000đ → 2.300.000đ tùy phòng
```

Nghĩa là:
- Tab **Giá mặc định** lấy `room_type_rates`.
- Cột giá cũ trong **Danh sách phòng** vẫn lấy `rooms.base_price` từng phòng.
- Hai nguồn này chắc chắn không khớp.

Ảnh hưởng:
- Người dùng nhìn “Giá” và “Giá hôm nay” sẽ thấy khác nhau, dễ hiểu nhầm.
- Nếu muốn hệ giá mới là chuẩn, cần ghi rõ hoặc thay cột giá cũ bằng “Giá phòng cũ / tham chiếu”, còn giá bán phải lấy từ resolver.

#### Lỗi D — Tab Lịch giá chỉ hiện giá mùa khi không có override, nhưng chưa thống nhất nhãn nguồn

Trong `PricingDailyPage.tsx`:
- Cell dùng `getEffectivePriceForDate(plan, dailyPrices, d)` để lấy giá gói.
- Nếu có seasonal thì mới lấy `resolvedDay.final_price`.
- Logic ưu tiên hiện tại là: override theo ngày thắng seasonal.

Điều này đúng với ý tưởng “Ngày > Mùa > Mặc định”, nhưng UI cần hiện rõ nguồn:
- Giá mặc định
- Điều chỉnh mùa
- Tùy chỉnh theo ngày
- Đóng bán

Hiện tại có chấm màu nhưng chưa đủ rõ, đặc biệt khi giá hiển thị bằng dạng rút gọn `2.1tr`.

#### Lỗi E — Dialog lễ tân vẫn hiển thị giá cũ

`ReceptionQuickDialog.tsx` phần phòng trống đang hiển thị:

```text
r?.base_price
r?.hourly_price
r?.monthly_price
```

Các trường này lấy từ chi tiết phòng / legacy, không đi qua pipeline giá mới.

Ảnh hưởng:
- Sơ đồ phòng có thể sửa để hiện giá hôm nay, nhưng khi click vào phòng, dialog lại hiện giá khác hoặc trống.

#### Lỗi F — Gói giá tiêu chuẩn chỉ có cho Deluxe, Standard chưa có `rate_plans`

Dữ liệu hiện tại:

```text
rate_plans chỉ có 1 row:
- Phòng Deluxe / Giá tiêu chuẩn / 2.066.666,64đ
```

Standard chưa có `rate_plans`, dù `room_type_rates` đã có giá.

Hiện tại `useRatePlans()` tạo gói ảo trên client khi chưa có gói thật, nên tab Lịch giá vẫn có thể hoạt động. Nhưng các phần đọc `rate_plans` trực tiếp hoặc daily override theo plan sẽ thiếu ổn định.

### 4) Kết luận dễ hiểu

Hiện app có **2 vấn đề lớn**:

1. **Hàm lấy “Giá hôm nay” cho các màn phòng đang lỗi SQL**, nên UI không có dữ liệu để hiển thị.
2. **Nguồn giá chưa thống nhất**: một số màn lấy giá mới từ `room_type_rates/rate_plans`, một số màn vẫn lấy `rooms.base_price` cũ.

Do đó điều chỉnh ở tab giá có thể đúng, nhưng khi sang danh sách phòng / sơ đồ phòng / popup lễ tân thì không khớp hoặc không hiện.

---

## Kế hoạch sửa đề xuất

### A. Kiến trúc / logic nghiệp vụ

Chuẩn hóa pipeline giá thành 1 nguồn chính:

```text
Giá bán cuối = Giá mặc định theo hạng phòng
             → áp Quy tắc mùa nếu có
             → bị ghi đè bởi Giá theo ngày nếu có
             → bị Đóng bán nếu availability hoặc daily override đóng
```

Quy ước hiển thị:
- **Giá hôm nay** = giá bán cuối từ resolver.
- **Giá mặc định** = giá nền từ `room_type_rates`.
- **Giá phòng cũ / base_price trên rooms** chỉ là dữ liệu legacy, không dùng làm giá bán chính.

### B. Schema / migration

Thêm migration sửa `resolve_today_prices_for_hotel`:
- Không dùng `to_jsonb` sai kiểu nữa.
- Join trực tiếp `resolve_daily_prices_bulk(...) AS x` và đọc `x.base_price`, `x.final_price`, `x.seasonals`.
- Trả đủ:
  - `room_type_id`
  - `room_type_name`
  - `room_type_code`
  - `base_price`
  - `final_price`
  - `has_seasonal`
  - `has_override`
  - `is_closed`
- Thêm kiểm tra tenant/hotel an toàn.

Không tạo bảng mới.

### C. API / RPC / server actions

Sửa / củng cố:
- `resolve_today_prices_for_hotel`: dùng được cho Danh sách phòng, Sơ đồ phòng, dialog lễ tân.
- `resolve_daily_prices_bulk`: giữ làm nguồn chuẩn cho lịch ngày.
- Cân nhắc bổ sung sau: RPC `resolve_room_price_for_date(room_id, date, booking_type)` để đặt phòng dùng đúng giá theo từng ngày.

### D. UI screens / components

Sửa các màn sau:

1. **Danh sách phòng**
   - Cột `Giá` hiện tại lấy `rooms.base_price`: đổi nhãn thành `Giá cũ` hoặc ẩn bớt.
   - Cột `Giá hôm nay` lấy resolver; nếu lỗi hoặc chưa có giá thì hiện trạng thái rõ: `Chưa cấu hình` thay vì `-`.
   - Hiện nguồn giá: `Mặc định`, `Mùa`, `Ngày`, `Đóng bán`.

2. **Sơ đồ phòng**
   - Sau khi sửa RPC, giá sẽ hiện lại.
   - Dùng helper match hạng phòng chung để không lệch `deluxe` / `DLX` / `Phòng Deluxe`.
   - Với phòng bán được: hiện giá hôm nay nổi bật hơn dòng `Sẵn sàng bán`.

3. **ReceptionQuickDialog**
   - Thay giá legacy bằng giá từ pipeline:
     - Theo ngày: resolver hôm nay.
     - Theo giờ / tháng: lấy từ `room_type_rates` nếu có.
   - Nếu đóng bán: hiện `Đóng bán hôm nay`.

4. **Tab Lịch giá theo ngày**
   - Giữ logic hiện tại nhưng làm nhãn nguồn rõ hơn:
     - `Mặc định`
     - `Mùa`
     - `Tùy chỉnh ngày`
   - Đảm bảo giá hiển thị full trong tooltip và rút gọn trong ô.

5. **Tab Giá mặc định**
   - Sau lưu, invalidate thêm:
     - `today-prices-by-hotel`
     - `resolved-daily-prices`
     - `rate-plans`
     - `pricing-health`
   - Như vậy các màn đang mở cập nhật lại ngay.

### E. Permission / role rules

Không đổi quyền trong lượt này.

Giữ nguyên:
- Người có quyền vào phần thiết lập giá mới chỉnh giá.
- Danh sách phòng / sơ đồ phòng chỉ đọc giá theo quyền hiện có.

### F. Test cases cần kiểm tra

1. **RPC giá hôm nay**
   - Gọi `resolve_today_prices_for_hotel(hotel_id, 'daily')` không lỗi.
   - Trả đủ Deluxe và Standard.
   - `final_price` khớp với `resolve_daily_prices_bulk` cho ngày hiện tại.

2. **Giá mặc định**
   - Sửa giá ở tab Giá mặc định.
   - Lịch giá theo ngày đổi base price.
   - Danh sách phòng / Sơ đồ phòng cập nhật `Giá hôm nay`.

3. **Giá theo ngày**
   - Set giá ngày 01/06 = 2.500.000đ.
   - Cell ngày đó hiện `2.5tr` và nguồn `Ngày`.
   - Resolver trả `override_price = 2.500.000`.

4. **Quy tắc mùa**
   - Tạo rule +10% cho Deluxe.
   - Ngày trong rule hiện giá tăng và nguồn `Mùa`.
   - Tắt rule thì giá quay về mặc định.

5. **Đóng bán**
   - Đóng bán 1 ngày.
   - Lịch giá, danh sách phòng, sơ đồ phòng cùng hiện `Đóng bán`.

### G. Rollout notes

- Không xóa `rooms.base_price` ngay vì đang là dữ liệu legacy và có thể còn dùng trong import / báo cáo cũ.
- Chỉ chuyển UI vận hành sang đọc giá mới để tránh sai lệch.
- Nếu sau này muốn dọn sạch, cần migration riêng để đồng bộ hoặc bỏ dần `rooms.base_price`.

---

## File dự kiến sửa

- `supabase/migrations/...fix_resolve_today_prices_for_hotel.sql`
- `src/hooks/usePricingDaily.ts`
- `src/hooks/useRoomTypeRates.ts` hoặc hook/helper mới cho lookup giá theo room type
- `src/components/rooms/RoomTable.tsx`
- `src/components/rooms/RoomFloorMapView.tsx`
- `src/components/rooms/ReceptionQuickDialog.tsx`
- `src/pages/settings/PricingV2Page.tsx`
- `public/changelog.json`
- `src/lib/app-version.ts`

## Migration đã xác định cần thêm

- Sửa RPC `resolve_today_prices_for_hotel` do hiện đang lỗi SQL khi đọc jsonb.

## Test sẽ viết / chạy

- Ưu tiên kiểm tra bằng database read query cho RPC.
- Kiểm tra UI qua network/preview sau khi sửa.
- Nếu codebase có test sẵn cho pricing, bổ sung test helper mapping hạng phòng.

## Phần còn thiếu sau lượt sửa này

- Booking engine quote theo từng đêm vẫn cần một lượt riêng để dùng `resolve_daily_prices_bulk` khi tạo booking mới.
- Cần quyết định lâu dài với `rooms.base_price`: giữ làm tham chiếu hay migration sang hệ giá mới.