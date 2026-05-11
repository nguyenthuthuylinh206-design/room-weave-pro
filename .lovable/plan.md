# Nâng cấp Popup thông báo theo mẫu "Chương trình hỗ trợ chuyển đổi số"

## A. Hiện trạng & lỗi

- `AnnouncementPopup` hiện chỉ render: icon tròn → tiêu đề → body (text thuần) → ảnh → CTA. Không có khối "highlights" gạch đầu dòng có icon (✓ Miễn phí 5 tháng…) và khối "Liên hệ hỗ trợ" như mẫu.
- `FreeTrialPopup` (hardcode) đã có sẵn layout đẹp đúng như ảnh — ta sẽ port style đó vào `AnnouncementPopup` để mọi popup do Super Admin tạo đều dùng được.
- Lỗi runtime `Failed to fetch dynamically imported module RootRoute.tsx`: file vẫn tồn tại, đây là lỗi Vite HMR tạm thời sau khi bump phiên bản — thường tự hết khi reload. Nếu còn, sẽ thêm reload-on-chunk-error guard. Sẽ kiểm tra lại sau khi build.

## B. Schema / migration

Thêm cột `content jsonb` (nullable, default `null`) vào bảng `announcements`:

```json
{
  "highlights": [
    { "icon": "CheckCircle2", "color": "green", "title": "Miễn phí 5 tháng", "subtitle": "Toàn bộ tính năng" }
  ],
  "contacts": [
    { "type": "phone", "value": "0828686866" },
    { "type": "email", "value": "roomqc@gmail.com" }
  ],
  "contact_label": "Liên hệ hỗ trợ:"
}
```

Không phá dữ liệu cũ — popup không có `content` vẫn render kiểu đơn giản như hiện tại.

## C. Frontend

1. **`AnnouncementPopup.tsx`** — render thêm:
   - Khối highlights: `bg-muted/50 rounded-lg p-3 sm:p-4 space-y-3`, mỗi item là icon (lookup `lucide-react`) + title + subtitle. Màu icon theo `color` (`green`, `primary`, `amber`, `red`).
   - Khối contacts: `border-t pt-3`, label nhỏ + danh sách phone/email với icon Phone/Mail.
   - Giữ nguyên fallback cho popup không có `content`.

2. **`AnnouncementFormDialog.tsx`** — thêm tab/section "Nội dung chi tiết (popup)":
   - Repeater "Điểm nổi bật" (thêm/xoá dòng): chọn icon (preset 6 icon: CheckCircle2, Calendar, Gift, Sparkles, Star, Clock) + chọn màu (4 màu) + title + subtitle.
   - Repeater "Liên hệ": loại (phone/email) + giá trị + 1 ô label chung.
   - Chỉ hiển thị khi `placement = popup_center`.
   - Lưu vào `content` JSONB.

3. **`AnnouncementLivePreview.tsx`** — preview popup dùng đúng layout mới khi có `content`.

4. **`useEnsureVersionDraft.ts`** — khi seed draft `version_update`, tự build `content.highlights` từ `changelog.json[version].changes` (mỗi change → 1 highlight `CheckCircle2 / green`), thêm liên hệ mặc định (phone + email từ platform_settings nếu có, fallback hardcode `0828686866` / `roomqc@gmail.com`).

5. **Cleanup**: `FreeTrialPopup` giữ làm fallback (đã có guard `hasDbPromo`), không sửa.

## D. Types

`src/types/announcement.types.ts`: thêm

```ts
export interface AnnouncementContent {
  highlights?: { icon?: string; color?: 'green'|'primary'|'amber'|'red'; title: string; subtitle?: string }[];
  contacts?: { type: 'phone'|'email'; value: string }[];
  contact_label?: string;
}
```

`Announcement` thêm `content: AnnouncementContent | null`.

## E. Permission

Không đổi — vẫn `super_admin` only cho ghi, đọc theo audience.

## F. Test cases

- Popup không `content` → render như cũ (snapshot existing behavior).
- Popup có `content.highlights` → render đúng số dòng + icon + màu.
- Popup có `contacts` → render phone/email với icon.
- Form: thêm/xoá highlight & contact, submit, reload → dữ liệu giữ nguyên.
- `useEnsureVersionDraft`: với `changelog.json` có 3 changes → draft sinh ra có 3 highlights.

## G. Rollout

- Migration thêm cột nullable, không cần backfill.
- Sau migrate, mở popup hiện tại trong DB → vẫn chạy bình thường (content = null).
- Super Admin vào "Chỉnh sửa & bật" cho version draft, kiểm tra preview, bật `is_active`.
- QA trên iPhone SE (375px), kiểm tra scroll trong `max-h-[90dvh]`.

## Phần còn thiếu sau plan này

- Chưa làm i18n cho EN (UI Việt-first theo memory).
- Chưa thêm template "Mời upgrade", "Bảo trì hệ thống" — có thể bổ sung sau dưới dạng preset trong form.
