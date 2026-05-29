## Vấn đề hiện tại

Sheet đang trộn 6 section dọc với mật độ thông tin cao (Lưu trú, Giấy tờ, CRM, Tài chính breakdown 8 dòng, Dịch vụ, Minibar, Lịch sử), khiến lễ tân:
- Phải scroll mới thấy số tiền cần thu
- Lịch sử hiện raw `audit_log.action` (`move`, `update`) không hiểu
- Không có nút "Thu tiền QR" / "Gọi khách" trong sheet — phải mở trang booking
- Lưu trú trình bày dạng grid 3 cột vẫn rối khi nhỏ

## Tổ chức lại theo flow nghiệp vụ lễ tân

```text
┌─────────────────────────────────┐
│ HEADER (giữ nguyên)             │  Phòng · nguồn · trạng thái
│ Tên khách · 📞 · trạng thái TT  │
├─────────────────────────────────┤
│ ⚠ Cảnh báo (nếu có)             │  Bẩn / CCCD chưa scan / Còn nợ
├─────────────────────────────────┤
│ 1. TÓM TẮT NHANH                │  ← Trả lời "khách nào, phòng nào, bao nhiêu"
│   Nhận: T6 29/05 14:00          │
│   Trả:  CN 31/05 12:00 (2 đêm)  │
│   ─────────────────────         │
│   Tổng     3.842.000 ₫          │
│   Đã thu       0 ₫              │
│   Còn thu  3.842.000 ₫  (đỏ)    │  ← luôn nổi bật
├─────────────────────────────────┤
│ 2. QUICK ACTIONS (sticky-ish)   │
│   [Thu tiền QR]  [Gọi khách]    │  ← thao tác làm ngay trong sheet
│   [Nhận phòng / Trả phòng] ★    │
├─────────────────────────────────┤
│ 3. CHI TIẾT (collapse mặc định) │  ← ẩn, click mới mở
│   ▸ Chi tiết tài chính (8 dòng cũ)
│   ▸ Giấy tờ (CCCD + ảnh)
│   ▸ Hồ sơ khách (CRM)           │
│   ▸ Lịch sử thay đổi            │  ← dịch action sang VN
├─────────────────────────────────┤
│ FOOTER                          │
│ [Đóng]  [Mở phiếu booking đầy đủ]│
└─────────────────────────────────┘
```

### Nguyên tắc
- **Tóm tắt + Còn thu** luôn nhìn thấy không cần scroll (trả lời điện thoại tức thì).
- **Quick actions** đưa lên trên cùng body, không phải dưới footer:
  - `Thu tiền QR` → mở `PaymentQRDialog` ngay trong sheet (đã có sẵn ở `/bookings/:id`, reuse component).
  - `Gọi khách` → `tel:` (đã có ở header nhưng tách nút riêng).
  - CTA chính theo status: `Tiếp tục nhận phòng` / `Thu tiền & trả phòng` (như hiện tại) — vẫn navigate sang `/bookings/:id` vì cần wizard.
- **Chi tiết tài chính / Giấy tờ / CRM / Lịch sử** gộp vào `<Collapsible>` (shadcn) đóng mặc định. Lễ tân muốn xem sâu thì bấm "Mở phiếu booking" sang trang chi tiết — đúng ý user.
- **Lịch sử**: map `audit_log.action` qua `actionLabel()` (đã có) nhưng bổ sung các action thiếu: `move` → "Đổi phòng", `update` → "Cập nhật booking", `price_change` → "Sửa giá"...

## A. Kiến trúc / logic
- Không đổi schema, không đổi RPC. Chỉ refactor presentation.
- Reuse `useBookingSheetDetails` đã có.
- Reuse `PaymentQRDialog` từ trang booking detail nếu khả thi; nếu không, primary CTA "Thu tiền QR" vẫn navigate `/bookings/:id?action=pay`.

## D. UI / files
- **Sửa** `src/components/rooms/TapeChartBookingSheet.tsx`:
  - Thêm khối "Tóm tắt nhanh" (lưu trú compact 2 dòng + tổng/đã thu/còn thu nổi bật).
  - Thêm hàng Quick Actions ngay dưới tóm tắt: `[Thu tiền QR] [Gọi khách]` + CTA chính theo status.
  - Bọc 4 section chi tiết (Tài chính breakdown, Giấy tờ, CRM, Lịch sử) trong `<Collapsible>` đóng mặc định, label "Xem chi tiết".
  - Đơn giản hoá Lưu trú: 2 dòng `Nhận: ...` / `Trả: ... (N đêm · loại phòng)` thay grid 3 cột.
- **Sửa** `src/hooks/useBookingSheetDetails.ts` (function `actionLabel`): bổ sung mapping cho các action raw hiện hiển thị `move`, `update`, `price_change`, `room_change`, v.v.
- **Bump**: `src/lib/app-version.ts` → `1.0.90`, `src/components/CacheBuster.tsx` `CURRENT_VERSION`, thêm entry `public/changelog.json`.

## E. Permission
Không đổi — sheet read-only, các action vẫn đi qua các flow đã có permission check (`perform_checkin`, QR payment).

## F. Test cases
- Booking `confirmed` chưa thanh toán → CTA "Tiếp tục nhận phòng", Còn thu hiển thị đỏ.
- Booking `checked_in` đã thanh toán đủ → CTA "Trả phòng", Còn thu = 0 ẩn đỏ.
- Booking có `audit_log` action `move` → hiển thị "Đổi phòng" thay vì "move".
- Click "Xem chi tiết" → expand section, click lại → collapse.
- Mobile portrait 390px → tóm tắt + quick actions không cần scroll.

## G. Rollout
- Thay đổi UI thuần, không có migration, rollback bằng revert file.
- Bump version để PWA cache buster đẩy bản mới (theo Core memory).

## Phần KHÔNG làm (theo ý user)
- Không nhồi thêm chi tiết phòng / chỉnh sửa booking inline — những thứ này điều hướng sang `/bookings/:id` như user yêu cầu.
