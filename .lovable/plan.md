## Mục tiêu
Cho phép Super Admin quản lý nội dung các thông báo/banner hiển thị trong app (không cần deploy code), gồm 3 nhóm:

1. **Popup chương trình** (hiện đang hardcode trong `FreeTrialPopup.tsx` — "Hỗ trợ chuyển đổi số")
2. **Thông báo cập nhật phiên bản** (hiện đang đọc từ `public/changelog.json` static)
3. **Banner quảng cáo** (mới — banner trên cùng / dải dưới / popup nhẹ)

Mỗi nội dung có thể bật/tắt, đặt thời hạn, chọn đối tượng (role), xem trước, ghi audit log.

---

## A. Kiến trúc & nghiệp vụ

- Tạo bảng mới `announcements` ở `public` schema để chứa cả 3 loại + có thể mở rộng.
- Mỗi announcement có `kind` (`promo_popup` | `version_update` | `ad_banner` | `system_notice`), `placement` (`popup_center` | `top_banner` | `bottom_strip` | `inline_card`), `audience` (`all` | `tenant_owner` | `manager` | `staff` | `trial_only` | `expired_only`).
- Trạng thái xuất hiện: `is_active`, `starts_at`, `ends_at`, `priority`.
- Nội dung: `title`, `body` (markdown ngắn), `cta_label`, `cta_url`, `image_url`, `icon` (lucide name), `variant` (`info` | `success` | `warning` | `promo`).
- Dismiss tracking: bảng `announcement_dismissals (announcement_id, user_id)` để "Không hiển thị lại" lưu server-side (không chỉ localStorage), cộng fallback localStorage cho khách chưa đăng nhập.
- Phiên bản app: thêm `kind = 'version_update'` với field `version` (string) → so sánh với `APP_VERSION` để biết user đã đọc release nào.

## B. Schema / migration

```sql
create type announcement_kind as enum
  ('promo_popup','version_update','ad_banner','system_notice');
create type announcement_placement as enum
  ('popup_center','top_banner','bottom_strip','inline_card');
create type announcement_variant as enum
  ('info','success','warning','promo');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind announcement_kind not null,
  placement announcement_placement not null default 'popup_center',
  variant announcement_variant not null default 'info',
  title text not null,
  body text,
  cta_label text,
  cta_url text,
  image_url text,
  icon text,
  audience text not null default 'all',           -- all|tenant_owner|manager|staff|trial_only|expired_only
  is_active boolean not null default true,
  is_dismissible boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  version text,                                   -- chỉ dùng cho version_update
  priority int not null default 0,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.announcement_dismissals (
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid not null,
  dismissed_at timestamptz default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_dismissals enable row level security;
```

RLS:
- `announcements SELECT`: mọi `authenticated` đọc được khi `is_active = true` và đang trong cửa sổ thời gian (logic detail ở client/RPC `get_active_announcements`).
- `announcements INSERT/UPDATE/DELETE`: chỉ `super_admin` (qua `has_role`).
- `announcement_dismissals`: user chỉ thao tác bản ghi của mình (`auth.uid() = user_id`).

RPC `public.get_active_announcements()` trả về danh sách announcement còn hiệu lực, đã loại các bản đã dismiss bởi user hiện tại, lọc theo `audience` so với role + subscription_status.

Audit: trigger ghi vào `super_admin_activity_log` mỗi khi insert/update/delete `announcements`.

## C. UI — Super Admin

Thêm route `/super-admin/announcements` (nav item "Thông báo & Banner", icon Megaphone), gồm:

- **List**: bảng announcement (kind, title, audience, placement, status badge "Đang hiển thị / Hết hạn / Tắt", priority, action sửa/xoá/sao chép).
- **Filter tab theo `kind`**: Popup chương trình | Cập nhật phiên bản | Banner quảng cáo | Thông báo hệ thống.
- **Form tạo/sửa** (single page Zod): chọn kind → form đổi field tương ứng, có **Preview pane** mô phỏng popup/banner thật bằng cùng component runtime.
- **Lịch chạy**: pick `starts_at`, `ends_at`, toggle `is_active`, slider `priority`.
- **Targeting**: select `audience` + checkbox role.
- Upload ảnh banner dùng bucket `email-assets` (đã có) hoặc bucket mới `announcement-assets` (public read).

## D. UI — Runtime (frontend user)

- Tạo hook `useActiveAnnouncements(placement)` query RPC + realtime subscribe table `announcements`.
- `<AnnouncementHost />` đặt trong `MainLayout`:
  - `placement = 'top_banner'` → render `TopAnnouncementBanner` (slot trên Header, dismiss → gọi RPC `dismiss_announcement`).
  - `placement = 'popup_center'` → render `AnnouncementPopup` (thay thế `FreeTrialPopup` cũ, fallback hardcode khi DB rỗng để không mất chương trình hiện tại).
  - `placement = 'bottom_strip'` → strip nhỏ dưới cùng mobile.
  - `placement = 'inline_card'` → expose qua slot ở Dashboard.
- `version_update` → so `version` với `APP_VERSION`, hiện popup "Có gì mới" + nút "Xem chi tiết" (giữ link tới changelog page hiện có).
- `FreeTrialPopup` cũ → giữ làm fallback khi không có announcement `promo_popup` nào active (memory `digital-transformation-support-v1` vẫn còn nhưng nội dung giờ có thể override từ DB).

## E. Permission

- `super_admin`: full CRUD + xem analytics dismissal.
- Các role khác: chỉ đọc qua RPC, ghi `announcement_dismissals` của chính mình.

## F. Test

- Migration test: insert 1 record mỗi `kind`, RPC trả đúng theo audience + thời gian + dismissal.
- Unit test `useActiveAnnouncements` (mock supabase): filter theo placement, audience.
- Integration: super admin tạo banner → user thường thấy realtime → dismiss → reload không thấy lại.
- E2E (manual checklist): popup chỉ hiện 1 lần, banner ẩn khi `ends_at` đã qua, version_update không hiện nếu `version <= APP_VERSION` đã đọc.

## G. Rollout

1. Migration tạo bảng + RPC + RLS (rollback: `drop table announcements, announcement_dismissals; drop type ...`).
2. Seed 1 record `promo_popup` với nội dung "Chương trình hỗ trợ chuyển đổi số" hiện tại để giữ continuity.
3. Deploy UI super admin trước (chỉ super_admin thấy).
4. Deploy `<AnnouncementHost />` ở MainLayout, `FreeTrialPopup` chuyển sang fallback-only.
5. Sau 1 tuần ổn định → xoá hardcode cũ.

---

## File dự kiến tạo/sửa

**Tạo mới**
- `supabase/migrations/<ts>_announcements.sql`
- `src/types/announcement.types.ts`
- `src/hooks/announcements/useAnnouncements.ts` (admin CRUD)
- `src/hooks/announcements/useActiveAnnouncements.ts` (runtime)
- `src/components/super-admin/announcements/AnnouncementsPage.tsx`
- `src/components/super-admin/announcements/AnnouncementForm.tsx`
- `src/components/super-admin/announcements/AnnouncementPreview.tsx`
- `src/components/announcements/AnnouncementHost.tsx`
- `src/components/announcements/AnnouncementPopup.tsx`
- `src/components/announcements/TopAnnouncementBanner.tsx`
- `src/components/announcements/BottomAnnouncementStrip.tsx`
- `src/pages/admin/AnnouncementsPage.tsx`

**Sửa**
- `src/App.tsx` — route `/super-admin/announcements`
- `src/components/super-admin/SuperAdminLayout.tsx` — nav item "Thông báo & Banner"
- `src/components/layout/MainLayout.tsx` — gắn `<AnnouncementHost />`
- `src/components/promotions/FreeTrialPopup.tsx` — chuyển thành fallback khi DB rỗng
- `src/i18n/locales/vi/superAdmin.json` (nếu có) — labels mới

Xác nhận để tôi triển khai theo plan này?
