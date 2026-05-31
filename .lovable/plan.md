## Mục tiêu

Hợp nhất 4 mảnh đang rời rạc thành **một đường ống giá thống nhất**:

```
Danh sách phòng (rooms.room_type)
        │ sync
        ▼
   room_types (UUID, single source of truth)
        │
        ▼
Giá mặc định (room_type_rates.daily_rate)  ◄── basePrice
        │
        ▼
Quy tắc mùa (seasonal_rate_overrides) ──► overlay theo ngày
        │
        ▼
Override ngày cụ thể (rate_plan_daily_prices)
        │
        ▼
  resolve_daily_price(date, room_type_id) → giá cuối
        │
        ▼
   Booking engine + Lịch giá grid (cùng 1 nguồn)
```

Hiện tại 4 mảnh đứng độc lập: Lịch giá grid chỉ hiện `basePrice` + override, **không thấy** ảnh hưởng của quy tắc mùa; booking engine cũng chưa wire seasonal rules.

## Khoảng trống đang có


| #   | Vấn đề                                                                              | Hậu quả                                                    |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | `rooms.room_type` (text) vs `room_types` (UUID) — chỉ sync 1 chiều, không có FK     | Đổi tên/xóa hạng phòng ở Rooms không cascade sang pricing  |
| 2   | Lịch giá theo ngày **không preview** seasonal rule đang áp dụng                     | User không biết tại sao 1 ngày Tết lại có giá khác kỳ vọng |
| 3   | Không có resolver chung — mỗi nơi (grid, booking, report) tự tính giá               | Nguy cơ lệch số liệu giữa các module                       |
| 4   | Giá mặc định = 0 vẫn tạo được rate_plan, ngày trên grid hiện "0₫" mà không cảnh báo | Dễ bán nhầm giá 0                                          |
| 5   | 3 tab giá hoàn toàn độc lập, không có link/CTA chéo                                 | User phải đoán quy trình                                   |
| 6   | Không có dialog "Hạng phòng X chưa có giá mặc định" khi mở grid                     | UX khó hiểu                                                |


## Phạm vi triển khai

### A. Kiến trúc nghiệp vụ

**Đường ống giá cuối cùng cho 1 (ngày, room_type, apply_to)**:

1. `override` = `rate_plan_daily_prices` của default plan cho ngày đó. Nếu có → dùng.
2. Ngược lại: `base` = `room_type_rates.<apply_to>_rate` của hạng phòng.
3. Áp tất cả `seasonal_rate_overrides` active match ngày + apply_to + room_type:
  - Sắp theo `priority` ASC.
  - Mode `overwrite` → dùng quy tắc priority thấp nhất, dừng.
  - Mode `add_on` → stack `percent` rồi `fixed_amount`.
4. Nếu `is_closed = true` ở override hoặc seasonal có flag close → trả `{closed: true}`.

### B. Schema / Migration

- Thêm RPC `resolve_daily_price(p_room_type_id, p_date, p_apply_to)` returns `{price, source, applied_rules[]}`.
- Thêm RPC `resolve_daily_prices_bulk(p_room_type_id, p_from, p_to, p_apply_to)` cho grid (1 lần load nguyên tháng).
- Trigger trên `room_types` DELETE → soft-delete (set `status='archived'`), không hard delete để giữ FK pricing.
- Trigger trên `rooms` AFTER INSERT/UPDATE OF room_type → gọi `sync_room_types_from_rooms` cho hotel đó.
- Thêm cột `room_types.linked_rooms_count` (computed via trigger) để UI hiển thị "Đang dùng cho N phòng".

### C. Hooks / API mới

- `useResolvedDailyPrices(roomTypeId, from, to, applyTo)` — gọi `resolve_daily_prices_bulk`, return `{date → {finalPrice, basePrice, override, seasonals[]}}`.
- `usePricingHealth(hotelId)` — đếm room_types thiếu default rate, rate_plans mồ côi, seasonal rules conflict (overlap ngày + cùng priority).
- Refactor `usePricingDaily` để dùng resolver, không tự tính.

### D. UI screens / components

**1. Lịch giá theo ngày — overlay seasonal**

- Mỗi ô ngày: hiện `finalPrice`. Khi có seasonal áp → badge nhỏ góc trên-phải (chấm màu + tooltip "Tết 2026 +20%").
- Header grid thêm strip "Đang áp 2 quy tắc mùa trong khoảng này" + nút "Xem chi tiết" mở Sheet liệt kê.
- Popover sửa giá: thêm dòng "Giá nền: X · Mùa: +20% · Cuối cùng: Y" để user hiểu họ đang ghi đè cái gì.

**2. Giá mặc định — link sang Lịch + Mùa**

- Mỗi hàng room type thêm 2 link nhỏ: "Xem lịch 30 ngày →" và "Quy tắc mùa đang áp →" (filter trước trong tab tương ứng).
- Empty state khi chưa có rate: CTA "Áp giá mẫu" (clone từ hạng phòng khác).

**3. Quy tắc mùa — preview ảnh hưởng**

- Form thêm khối "Xem trước": chọn 1 room_type + 1 ngày trong khoảng → hiện "Base 500.000 → Sau quy tắc 600.000".
- Cảnh báo conflict: list quy tắc khác overlap ngày + cùng priority.
- Filter theo room type ở list view.

**4. Quản lý phòng (Rooms) — hiển thị giá**

- Bảng phòng thêm cột "Giá ngày hôm nay" (resolve từ pipeline), click → mở Lịch giá tab tương ứng.
- Khi tạo/sửa phòng chọn `room_type` text → nếu room_type này chưa có row trong `room_types` → tự tạo + nhắc "Hãy cài giá mặc định".

**5. PricingHub — thanh điều hướng chéo**

- Mỗi tab header thêm breadcrumb-style: `Phòng (12) · Giá mặc định (3/4 hạng đã set) · Mùa (2 active)`.
- Banner cảnh báo health: "2 hạng phòng chưa có giá mặc định" → click sang tab "Giá mặc định" pre-filter.

### E. Permission / role

- Giữ nguyên: chỉ Owner + Manager có `manage_pricing` mới sửa được. Staff read-only.

### F. Test cases

1. Tạo hạng phòng mới ở Rooms → xuất hiện ngay trong tab Giá mặc định và dropdown Lịch giá.
2. Xóa room_type còn liên kết → bị chặn, gợi ý "Archive thay vì xóa".
3. Tạo seasonal +20% cho Tết → mở Lịch giá ngày Tết → ô hiện giá đã +20% + badge.
4. Override ngày cụ thể → seasonal bị bỏ qua cho ngày đó, badge hiện "Đã ghi đè thủ công".
5. 2 seasonal rules cùng priority overlap → cảnh báo conflict trong form.
6. Giá mặc định = 0 → Lịch giá hiện cảnh báo đỏ ô đó.
7. Resolver bulk: load grid 60 ngày × 5 hạng < 500ms p95.
8. Đổi tên `room_type` "Standard" → "Tiêu chuẩn" trong Rooms → trigger sync cập nhật `room_types.name`, mọi nơi đổi theo.

### G. Rollout

- **Phase 1** (migration): RPC resolver + bulk + triggers. Không đụng UI.
- **Phase 2** (hooks): `useResolvedDailyPrices`, `usePricingHealth`. Wire vào grid (overlay seasonal).
- **Phase 3** (UI cross-links): badges, breadcrumb, link CTAs, health banner.
- **Phase 4** (Rooms integration): cột "Giá hôm nay" + auto-create room_type khi tạo phòng.
- Feature flag `pricing.unified_pipeline` (default ON cho tenant mới, opt-in cho tenant cũ).
- Rollback: tắt flag → grid quay về dùng `basePrice + override` cũ; RPC vẫn còn nhưng không gọi.

### Câu hỏi cần xác nhận trước khi build

1. **Khi xóa hạng phòng còn phòng đang dùng** → bạn muốn (a) chặn hoàn toàn
2. **Phòng tạo trong Rooms với room_type text mới** → có muốn tự động tạo row `room_types` 
3. **Seasonal rules** áp dụng cho **booking engine ngay phase này**