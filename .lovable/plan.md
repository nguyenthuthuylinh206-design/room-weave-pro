## Mục tiêu
Khi truy cập `roomqc.com/` (chưa đăng nhập) → hiển thị trang Landing hiện có. Bấm "Đăng nhập" → vào `/auth/login` → sau đăng nhập vào thẳng dashboard như hiện tại. Toàn bộ 140 route nội bộ (`/rooms`, `/inventory`, …) giữ nguyên đường dẫn để không phá link, bookmark, PWA cache.

## Cách tiếp cận (ít rủi ro nhất)
Giữ nguyên cây route `/` đang bọc bởi `AuthGuard + OnboardingGuard + MainLayout`. Chỉ thay đổi hành vi tại **đúng path `/`** khi user **chưa đăng nhập**:

- Nếu chưa đăng nhập **và** đang ở chính xác `/` → render `<LandingPage />` (không bọc MainLayout).
- Nếu chưa đăng nhập **và** ở route con khác (`/rooms`, …) → giữ nguyên: `AuthGuard` redirect sang `/auth/login` (hành vi hiện tại).
- Nếu đã đăng nhập → giữ nguyên: vào `MainLayout` → `Dashboard` ở index như cũ.

Nhờ đó:
- Không phải đổi `navigate('/')`, sidebar links, AuthCallback, Login redirect… ở bất kỳ đâu.
- `/landing` cũ vẫn giữ làm alias (hoặc redirect 301 sang `/`).

## Thay đổi cụ thể

### 1. `src/App.tsx`
Tách route `/` thành 2 nhánh:

```text
{
  path: "/",
  element: <RootRoute />,   // wrapper mới
  children: [...giữ nguyên toàn bộ children hiện tại...]
}
```

`RootRoute` (component mới, đặt trong `src/components/layout/RootRoute.tsx`):
- Dùng `useAuth()` + `useLocation()`.
- Nếu `loading` → `LoadingSpinner`.
- Nếu **chưa auth** và `pathname === '/'` → `<LandingPage />` (return sớm, không render `<Outlet/>`).
- Ngược lại → `<AuthGuard><OnboardingGuard><MainLayout/></OnboardingGuard></AuthGuard>` (giữ nguyên bọc cũ, `MainLayout` đã có `<Outlet/>`).

Route `/landing` vẫn giữ (hoặc đổi thành redirect `<Navigate to="/" replace />`) để link cũ không 404.

### 2. `src/pages/LandingPage.tsx`
Hiện tại đang `navigate('/', { replace: true })` khi đã đăng nhập → sẽ gây loop nếu render tại `/`. Đổi đích redirect:
- Nếu user đã đăng nhập và truy cập `/` → cho phép `RootRoute` tự render `MainLayout/Dashboard` (không cần redirect trong `LandingPage`).
- Vì `RootRoute` đã chặn render `LandingPage` khi `isAuthenticated`, có thể bỏ luôn block `useEffect` redirect trong `LandingPage`, hoặc đổi đích sang `/dashboard`-equivalent. Đề xuất: **bỏ useEffect redirect**, để `RootRoute` quyết định.

### 3. Nút "Đăng nhập" / "Đăng ký"
`LandingNavbar` đã trỏ `/auth/login` và `/auth/register` — không cần sửa.

### 4. SEO & meta
- `index.html` đã có title "RoomQc - Quản lý khách sạn" — phù hợp cho landing.
- Thêm `<link rel="canonical" href="https://roomqc.com/" />` (nếu chưa có) trong `index.html`.

### 5. Edge case
- PWA standalone (đã cài app): khi mở app từ icon, user thường đã đăng nhập → vẫn vào Dashboard như cũ. Nếu chưa đăng nhập, sẽ thấy Landing — chấp nhận được, có nút Đăng nhập rõ ràng.
- `OnboardingGuard` chỉ chạy khi đã auth (vì nằm sau `AuthGuard`) → không ảnh hưởng landing.
- `/auth/callback` sau login redirect về `/` → `RootRoute` thấy đã auth → render MainLayout → index = Dashboard. ✅

## File sẽ sửa / tạo
- **Tạo**: `src/components/layout/RootRoute.tsx`
- **Sửa**: `src/App.tsx` (đổi `element` của route `/`, giữ children), `src/pages/LandingPage.tsx` (bỏ useEffect redirect), `index.html` (thêm canonical — optional).

## QA checklist
1. Mở `/` ở chế độ ẩn danh → thấy Landing, nút Đăng nhập hoạt động.
2. Mở `/rooms` ẩn danh → vẫn redirect `/auth/login` (không hiện landing).
3. Đăng nhập từ `/auth/login` → callback về `/` → vào Dashboard (không thấy Landing flash).
4. Đang đăng nhập, gõ `/` thủ công → vào Dashboard.
5. Mở `/landing` cũ → vẫn xem được (hoặc redirect `/`).
6. PWA standalone: mở app → hành vi như #3/#4.
7. Sidebar, MobileBottomNav, các `navigate('/')` nội bộ: hoạt động bình thường.

## Rollout
- Thay đổi chỉ ở frontend, không migration DB, không edge function.
- Rollback: revert 3 file trên.
