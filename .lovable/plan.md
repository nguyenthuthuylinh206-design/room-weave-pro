

## Vấn đề

1. **Bottom nav chứa tab dư thừa**: `MobileBottomNav` hard-code 5 tab (Home / Tasks / Đặt phòng / Phòng / Thêm) cho mọi user. User không có quyền vẫn thấy chip — và logic hiện tại còn buộc phải có quyền `homestay` mode mới hiện tab có module → vô tình ẩn nhầm các tab bookings/rooms ở mode standard/full khi user thực ra có quyền.

2. **Nút Back cứng nhắc**: `MobileDetailHeader.handleBack` luôn dùng `navigate(-1)`. Hệ quả:
   - Mở Room Check từ thông báo / deep link → back đưa ra ngoài app.
   - Một số trang root (`/maintenance`, `/settings`) đã set `showBack={false}` nhưng nhiều trang root khác (`/laundry`, `/inventory`, `/items`, `/rooms`, `/bookings`) vẫn hiện back vô nghĩa khi đến từ bottom nav.

---

## Hướng sửa

### A. `MobileBottomNav` — chỉ hiện tab có thể thao tác

**Quy tắc filter (theo "permission thuần"):**
- Tab không có `module` (Home, More): luôn hiện.
- Tab `Tasks`: hiện nếu user có ít nhất 1 trong các quyền `housekeeping_tasks`, `room_checks`, `maintenance_requests`, `distribution_orders` (vì Tasks là view tổng hợp).
- Tab `Đặt phòng`, `Phòng`: hiện nếu user có quyền `bookings` / `rooms` tương ứng (`can_view || can_create || can_update || can_delete`).
- **Bỏ điều kiện `hasMode('homestay')` sai logic hiện tại** — không gating theo usage mode ở bottom nav.
- Owner / super_admin: luôn thấy đủ.

**Mở rộng tab pool theo permission**: Thay vì cứng 5 tab, định nghĩa `ALL_TABS` gồm: Home, Tasks, Đặt phòng, Phòng, Laundry, Bảo trì, Kho, Thêm. Filter theo permission → lấy **tối đa 4 tab module + 1 tab "Thêm"** (5 slots). Thứ tự ưu tiên: Home → Tasks → Đặt phòng → Phòng → Laundry → Bảo trì → Kho → More. Các tab bị tràn → gom vào "Thêm".

**Kết quả ví dụ:**
- Lễ tân (chỉ có bookings/rooms): `Home / Đặt phòng / Phòng / Thêm` (4 tab)
- Staff buồng phòng (housekeeping_tasks + room_checks): `Home / Tasks / Phòng / Thêm`
- Staff bảo trì: `Home / Tasks / Bảo trì / Thêm`
- Owner: `Home / Tasks / Đặt phòng / Phòng / Thêm` (đủ 5)

### B. `MobileDetailHeader` — back behavior linh hoạt

**1. Auto-hide back trên trang root tab**
Thêm prop ngầm: nếu `pathname` thuộc danh sách `ROOT_PATHS` (`/`, `/my-tasks`, `/staff/housekeeping`, `/bookings`, `/rooms`, `/laundry`, `/maintenance`, `/inventory`, `/items`, `/more`, `/settings`) → tự ẩn back, bất kể `showBack` truyền vào. Loại bỏ việc phải đi từng trang sửa `showBack={false}`.

**2. Smart back — quay về nguồn vào**
Logic mới của `handleBack`:
1. Nếu có `onBack` prop (custom) → gọi nó.
2. Nếu `window.history.state?.idx > 0` (có history trong app) → `navigate(-1)`.
3. Nếu không có history (mở từ deep link / thông báo / tab mới) → fallback về **module root** suy ra từ pathname:
   - `/rooms/...` → `/rooms`
   - `/laundry/...` → `/laundry`
   - `/bookings/...` → `/bookings`
   - `/maintenance/...` → `/maintenance`
   - `/inventory/...`, `/items/...` → `/inventory`
   - mặc định → `/`

**3. Bonus — Room Check ưu tiên về Tasks nếu mở từ task**
`/rooms/:id/check` thường mở từ task. Khi không có history → fallback về `/my-tasks` (hoặc `/staff/housekeeping` cho staff buồng phòng) thay vì `/rooms`.

### C. Memory

Cập nhật `mem://design/sidebar-navigation-architecture` (hoặc tạo mới `mem://ux/mobile-bottom-nav-and-back-behavior-v1`) để chốt 2 quy chuẩn:
- Bottom nav chỉ hiện tab user có quyền (max 5, gom vào More).
- Back tự ẩn ở root paths; smart fallback về module root khi không có history.

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/layout/MobileBottomNav.tsx` | (1) Mở rộng `ALL_TABS` (8 tab). (2) Bỏ điều kiện `hasMode('homestay')`. (3) Mở rộng `hasModuleAccess` để Tasks check tổ hợp permission. (4) Lọc + slice 4 tab module đầu tiên user có quyền + chèn cố định Home (đầu) và More (cuối) → tối đa 5 nút. |
| `src/components/layout/MobileDetailHeader.tsx` | (1) Thêm `ROOT_PATHS` const + auto-hide back nếu pathname thuộc list. (2) Viết lại `handleBack`: ưu tiên `onBack` → check `history.state.idx` → fallback module root từ pathname (Room Check → /my-tasks). |
| `mem://ux/mobile-bottom-nav-and-back-behavior-v1.md` | Tạo mới: ghi chuẩn permission-based bottom nav + smart back. |
| `mem://index.md` | Thêm reference tới memory mới. |

Không sửa hook, không migration. Không đụng các trang gọi `MobileDetailHeader` (đã có `showBack={false}` thì giữ nguyên, chỗ truyền `showBack` mặc định sẽ tự được auto-hide nếu là root path).

