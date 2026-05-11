## Mục tiêu

Mỗi khi `APP_VERSION` thay đổi (publish phiên bản mới), hệ thống tự sinh **một thông báo "Cập nhật phiên bản"** ở trạng thái **chờ bật** (`is_active = false`). Super Admin chỉ cần mở module Thông báo, chỉnh nội dung và bật lên.

## Cơ chế phát hiện phiên bản mới

Dùng nguồn duy nhất là `src/lib/app-version.ts` (`APP_VERSION` + `APP_VERSION_DATE`). Mỗi lần build mới được publish, file này thay đổi → client load bản mới sẽ thấy version khác và kích hoạt seed.

Logic seed:
1. Khi Super Admin truy cập trang `/super-admin/announcements`, hook `useEnsureVersionDraft` query:
   ```
   announcements where kind='version_update' AND version = APP_VERSION
   ```
2. Nếu **chưa tồn tại** → insert 1 bản ghi draft với:
   - `kind='version_update'`, `placement='popup_center'`, `variant='info'`
   - `version = APP_VERSION`
   - `title = "Phiên bản mới {APP_VERSION}"`
   - `body` = nội dung mặc định lấy từ `public/changelog.json` (nếu version trong changelog khớp); nếu không khớp → để body gợi ý "Hãy cập nhật mô tả thay đổi phiên bản này"
   - `is_active = false` (chờ bật)
   - `is_dismissible = true`, `audience='all'`, `priority=100`
   - `cta_label='Xem chi tiết'`, `cta_url=''`
3. Nếu đã tồn tại → không làm gì (tránh đè lên bản admin đã chỉnh sửa).

Toàn bộ chạy 1 lần / tab nhờ `useQuery` cache. Không động đến phiên bản cũ.

## UI bổ sung trong `/super-admin/announcements`

1. **Banner trên cùng** "Phiên bản hệ thống hiện tại: 1.0.7" + badge trạng thái:
   - `Đang chờ bật` (vàng) nếu draft của version hiện tại tồn tại và `is_active=false`
   - `Đang phát` (xanh) nếu đã bật
   - Kèm nút **"Chỉnh sửa & bật"** mở thẳng `AnnouncementFormDialog` với draft đó.
2. Trong tab "Cập nhật phiên bản", các bản ghi sắp xếp version mới → cũ.
3. Khi mở form ở chế độ edit cho `version_update`, trường **Phiên bản** auto-fill và **read-only** (vì gắn với version build).

## Audience & cơ chế hiển thị (giữ nguyên)

- Khi admin bật `is_active=true`, hook `useActiveAnnouncements` đã có sẵn lọc theo `audience` + dismissal.
- Cơ chế "user chỉ thấy 1 lần" cho version update vẫn dùng key `announcement_version_seen_v1` đã có trong memory (chỉ thay key thành theo `version` cụ thể).

## Files dự kiến

- **Sửa**: `src/components/super-admin/announcements/AnnouncementsManagement.tsx` — thêm banner version + nút "Chỉnh sửa & bật".
- **Sửa**: `src/components/super-admin/announcements/AnnouncementFormDialog.tsx` — `version` read-only khi edit và là `version_update`.
- **Mới**: `src/hooks/announcements/useEnsureVersionDraft.ts` — query + insert draft khi thiếu.
- **Mới (tuỳ chọn)**: `src/hooks/announcements/useChangelogForVersion.ts` — fetch `public/changelog.json` để lấy body mặc định.

## Không thay đổi

- Không thêm migration / RPC mới (dùng bảng `announcements` hiện có).
- Không thay đổi luồng publish của Lovable; chỉ dựa vào `APP_VERSION` constant.
- Không tự động bật thông báo — admin luôn là người bật cuối cùng.

## QA nhanh

1. Bump `APP_VERSION` từ `1.0.7` → `1.0.8` → vào trang quản lý → thấy banner "Đang chờ bật" + 1 record mới `is_active=false`.
2. Bấm "Chỉnh sửa & bật" → sửa nội dung → bật → user thường refresh thấy popup version 1.0.8.
3. Reload trang admin lần 2 với cùng version → không sinh thêm record trùng.
4. Hạ `APP_VERSION` về 1.0.7 (giả lập) → record 1.0.8 không bị tác động.
