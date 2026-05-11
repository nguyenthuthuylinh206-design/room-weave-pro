
# Trang lịch sử phiên bản & luồng thông báo cập nhật

## Mục tiêu
- Có 1 trang **`/whats-new`** trong app cho user xem toàn bộ lịch sử thay đổi theo phiên bản.
- Giữ nguyên luồng đã có: mỗi lần publish → AI bump version + thêm entry changelog → auto-tạo announcement `version_update` trạng thái **chờ bật** → admin chỉnh & bật → user thấy popup "Cập nhật phiên bản mới" với CTA reload + clear cache.
- Popup có link phụ "Xem tất cả thay đổi" mở `/whats-new`.

## A. Kiến trúc
```
public/changelog.json (mảng versions)
        │
        ├─► useChangelogList() ──► /whats-new (timeline UI)
        │
        └─► useEnsureVersionDraft (lấy entry version hiện tại)
                 │
                 └─► tạo announcement version_update (is_active=false)
                           │
                           └─► Admin bật ──► AnnouncementPopup hiển thị
                                                  │
                                                  ├─ CTA "Cập nhật ngay" → clear cache + reload
                                                  └─ link "Xem tất cả thay đổi" → /whats-new
```

## B. Schema / Data
**Đổi `public/changelog.json` từ object đơn → object có `versions` array:**
```json
{
  "current": "1.0.7",
  "versions": [
    {
      "version": "1.0.7",
      "releaseDate": "2026-05-11",
      "title": "Thông báo phiên bản giàu nội dung",
      "changes": [
        { "type": "new", "text": "..." },
        { "type": "improved", "text": "..." },
        { "type": "fixed", "text": "..." }
      ]
    },
    { "version": "1.0.6", ... }
  ]
}
```
- Không cần migration DB — vẫn dùng bảng `announcements` hiện có.
- `useChangelog` (đang dùng cho PWA update toast) cập nhật để đọc `versions.find(v => v.version === current)` — giữ tương thích ngược.
- `useEnsureVersionDraft` đọc entry theo `APP_VERSION` từ mảng.

## C. Files mới / sửa
**Mới:**
- `src/types/changelog.ts` — bổ sung `ChangelogFile = { current: string; versions: ChangelogEntry[] }`
- `src/hooks/useChangelogList.ts` — fetch toàn bộ `versions[]`, sort desc
- `src/pages/WhatsNewPage.tsx` — Timeline: mỗi version 1 card (`border rounded-lg p-4`):
  - Header: `v1.0.7` (font-mono) + badge "Mới nhất" (green) cho version đầu + date format `dd/MM/yyyy`
  - Title bold
  - List `changes`: icon nhỏ theo `type` (new=Sparkles green, improved=ArrowUpCircle primary, fixed=Wrench amber, removed=Trash red) + text
  - Sticky filter chip lọc theo type ở đầu trang
- Route trong `App.tsx`: `<Route path="/whats-new" element={<WhatsNewPage />} />` (auth required, không cần permission)

**Sửa:**
- `public/changelog.json` — chuyển sang format mảng (giữ 1.0.6 + 1.0.7)
- `src/hooks/useChangelog.ts` — adapt format mới, return entry của `current`
- `src/hooks/announcements/useEnsureVersionDraft.ts` — đọc `data.versions.find(v => v.version === APP_VERSION)`
- `src/components/announcements/AnnouncementPopup.tsx` — nếu `kind === 'version_update'`: thêm link nhỏ "Xem tất cả thay đổi →" dưới CTA, navigate `/whats-new`
- `src/pages/profile/ProfilePage.tsx` (hoặc menu More mobile) — thêm mục "Lịch sử phiên bản" link `/whats-new` + hiển thị `v{APP_VERSION}` cạnh
- `.lovable/memory/preferences/release-version-bump-convention.md` — cập nhật: format changelog.json mới (push entry vào đầu `versions[]` + cập nhật `current`)
- `.lovable/memory/features/super-admin/version-update-auto-draft-v1.md` — bổ sung mục `/whats-new`

## D. UI /whats-new (desktop & mobile portrait)
```
┌─ Lịch sử phiên bản ──────────────────────┐
│ Phiên bản hiện tại: v1.0.7               │
│ [Tất cả] [Mới] [Cải tiến] [Sửa lỗi]      │ ← filter chips
├──────────────────────────────────────────┤
│ ┌─ v1.0.7  Mới nhất    11/05/2026 ─────┐ │
│ │ Thông báo phiên bản giàu nội dung    │ │
│ │ ✨ Popup highlight + contacts        │ │
│ │ 🔧 Sửa lỗi version cũ                │ │
│ └──────────────────────────────────────┘ │
│ ┌─ v1.0.6              10/05/2026 ─────┐ │
│ │ ...                                  │ │
└──────────────────────────────────────────┘
```

## E. Permission
- `/whats-new`: bất kỳ user đã đăng nhập (không gắn module permission).
- Admin bật/tắt announcement vẫn qua super-admin RLS hiện có.

## F. Test cases
1. Mở `/whats-new` → list 2 version, v1.0.7 ở đầu có badge "Mới nhất"
2. Filter chip "Sửa lỗi" → chỉ hiển thị changes type=fixed
3. Popup version_update bật → click "Xem tất cả thay đổi" → vào `/whats-new` đúng
4. CTA "Cập nhật ngay" trong popup vẫn clear cache + reload (giữ nguyên)
5. `useEnsureVersionDraft` với format mới → tạo draft với highlights = changes của 1.0.7
6. Profile có link "Lịch sử phiên bản v1.0.7"

## G. Rollout & Rủi ro
- **Backward compat**: `useChangelog` hỗ trợ cả 2 format (legacy object đơn + mới có `versions`) để tránh vỡ nếu cache cũ load file cũ.
- **Cache**: file changelog.json được fetch với `?t=Date.now()` — không bị PWA cache.
- **Không có DB change** → không cần rollback migration.
- Bump APP_VERSION → 1.0.8, thêm entry mới với change "Trang lịch sử phiên bản /whats-new".
