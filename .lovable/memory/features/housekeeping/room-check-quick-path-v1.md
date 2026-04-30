---
name: RoomCheck Quick Path & Phase 2 polish
description: Phase 1 (Quick Path 1-tap + Context Card + photo_evidence_mode) + Phase 2 (photo enforcement trong ReportIssueSheet, DraftResumeBanner, audit ngôn từ Việt CheckTypeStep). Wizard giữ 6 bước nhưng 80% case daily đi qua chỉ 3 bước thực tế.
type: feature
---

# RoomCheck — Quick Path + Phase 2

## Phase 1 (đã chạy)
- **RPC `perform_quick_room_check`**: atomic 1-tap "Phòng OK hoàn toàn" cho daily/checkin/checkout. Tenant guard, audit log, set cleanliness=5/5, items_complete=true, transition state.
- **RPC `get_last_room_check`**: trả lần kiểm gần nhất + tên người kiểm + qc_status → Context Card.
- **`hotels.photo_evidence_mode`** ENUM `none|on_issue|always` (default `none`). Server enforce ở RPC quick path khi mode=`always`.
- **`QuickOkButton`** + **`LastCheckContextCard`** render trong `CheckTypeStep` khi check_type ∈ {daily, checkin, checkout}.

## Phase 2 (đã chạy)
### Photo enforcement client-side (ReportIssueSheet)
- Đọc `useHotelPhotoMode(selectedHotel.id)`.
- `mode='always'` → mọi tình trạng cần ≥1 ảnh.
- `mode='on_issue'` → chỉ enforce cho `damaged | lost | missing` (PHOTO_REQUIRED_TYPES).
- Block nút "Lưu" + cảnh báo text khi thiếu ảnh.
- Photos lưu vào `IssueAction.photos` optional, consumer (`DefaultOkItemsCheck`) tự forward vào payload room_check.

### DraftResumeBanner
- Reusable component đặt trên đầu `CheckTypeStep` (chỉ render khi có session active từ `useRoomCheckSession`).
- Phân biệt phiên của mình (cho Tiếp tục/Bỏ) vs phiên người khác (manager `canTakeOver` → Tiếp quản, dùng `takeOverSession` xoá session cũ + tạo mới).
- Stale > 60 phút → đổi màu border-amber để cảnh báo.
- Format thời lượng qua `formatSessionDuration` từ hook.

### Audit ngôn từ Việt + bỏ icons (CheckTypeStep)
- Bỏ tất cả `lucide-react` icons (Calendar/LogIn/...) — theo memory `room-check-default-ok-ux-v1` "không icon trang trí".
- "Chế độ nhanh" / Bật-Tắt → "Kiểm nhanh tổng quan" / "Đang bật"-"Tắt".
- Label "Chọn loại kiểm tra" → uppercase tracking-wider `Loại kiểm tra` thống nhất với ReportIssueSheet.
- Buttons không còn flex-col/icon, chỉ text — h-12 thumb-zone friendly.

## Files
- `src/components/rooms/check-steps/QuickOkButton.tsx` (Phase 1)
- `src/components/rooms/check-steps/LastCheckContextCard.tsx` (Phase 1)
- `src/components/rooms/check-steps/DraftResumeBanner.tsx` (Phase 2 - mới)
- `src/components/rooms/check-steps/ReportIssueSheet.tsx` (Phase 2 - photos)
- `src/components/rooms/check-steps/CheckTypeStep.tsx` (Phase 2 - audit Việt)
- `src/hooks/useQuickRoomCheck.ts`, `src/hooks/useHotelPhotoMode.ts`
- `src/components/settings/HotelPhotoEvidenceSettings.tsx`

## Còn debt
- Wizard 6→3 bước cứng: hoãn vô thời hạn vì routing hiện tại đã skip steps thông minh, full rewrite rủi ro vỡ checkout 2-phase.
- Server enforce photos ở `room_checks` insert (full path) — hiện chỉ enforce client-side cho ReportIssueSheet và server-side cho RPC quick path.
- Auto-save draft cho ItemsCheckStep (hiện draft chỉ là session marker, không lưu state form).
