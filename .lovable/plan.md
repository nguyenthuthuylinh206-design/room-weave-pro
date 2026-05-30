## Đồng bộ toàn bộ màu hardcoded với bộ Slate Professional

### Vấn đề

Có **2.659 lần** dùng class màu hardcoded (`text-green-600`, `bg-amber-50`, `text-blue-600`...) rải rác **459 file**. Đây là convention ghi trong project-knowledge (`text-green-600` = OK, `text-red-600` = lỗi, `text-amber-600` = cảnh báo) — không thể xoá, mà cần **chỉnh tông màu Tailwind palette mặc định** cho khớp bộ Slate Professional mới.

### Giải pháp: Override palette Tailwind tại `tailwind.config.ts`

Thay vì sửa 459 file (rủi ro cao, dễ vỡ), override các tông màu hay dùng tại 1 nơi duy nhất. Mọi `text-green-600`, `bg-red-50`, `border-amber-200`... toàn dự án sẽ tự động dùng palette mới mà không cần đụng vào component nào.

#### File sửa: `tailwind.config.ts` — thêm trong `extend.colors`

Map lại 5 thang màu chính dùng nhiều nhất, đồng bộ với token semantic mới:

```ts
// Trục xanh dương (info / primary) — khớp #2563EB
blue: {
  50:'#EFF6FF', 100:'#DBEAFE', 200:'#BFDBFE', 300:'#93C5FD',
  400:'#60A5FA', 500:'#3B82F6', 600:'#2563EB', 700:'#1D4ED8',
  800:'#1E40AF', 900:'#1E3A8A', 950:'#172554',
},
// Trục xanh lá (success) — khớp #15803D
green: {
  50:'#F0FDF4', 100:'#DCFCE7', 200:'#BBF7D0', 300:'#86EFAC',
  400:'#4ADE80', 500:'#22C55E', 600:'#16A34A', 700:'#15803D',
  800:'#166534', 900:'#14532D', 950:'#052E16',
},
emerald: { /* alias = green để tránh tông cyan-emerald lệch */ ... },
// Trục cam-nâu (warning) — khớp #B45309, bỏ vàng chói
amber: {
  50:'#FFFBEB', 100:'#FEF3C7', 200:'#FDE68A', 300:'#FCD34D',
  400:'#FBBF24', 500:'#F59E0B', 600:'#D97706', 700:'#B45309',
  800:'#92400E', 900:'#78350F', 950:'#451A03',
},
orange: { /* dùng cùng scale amber để tránh lệch tông */ ... },
yellow: { /* dùng cùng scale amber */ ... },
// Trục đỏ (destructive) — khớp #DC2626
red: {
  50:'#FEF2F2', 100:'#FEE2E2', 200:'#FECACA', 300:'#FCA5A5',
  400:'#F87171', 500:'#EF4444', 600:'#DC2626', 700:'#B91C1C',
  800:'#991B1B', 900:'#7F1D1D', 950:'#450A0A',
},
// Trục xám (neutral) — khớp foreground / muted Slate
slate: {
  50:'#F8FAFC', 100:'#F1F5F9', 200:'#E2E8F0', 300:'#CBD5E1',
  400:'#94A3B8', 500:'#64748B', 600:'#475569', 700:'#334155',
  800:'#1E293B', 900:'#0F172A', 950:'#020617',
},
gray: { /* alias = slate */ ... },
zinc: { /* alias = slate */ ... },
neutral: { /* alias = slate */ ... },
stone: { /* alias = slate */ ... },
// Bỏ tông cyan/sky/teal/indigo/violet/purple/pink/rose/fuchsia/lime
// → map về blue hoặc slate gần nhất để không còn màu "lạc tông"
sky: { 50:'#EFF6FF', ..., 600:'#2563EB', ... },   // = blue
cyan: { ..., 600:'#2563EB', ... },                // = blue
teal: { ..., 600:'#15803D', ... },                // = green
indigo: { ..., 600:'#2563EB', ... },              // = blue
violet/purple/fuchsia/pink/rose: { 600:'#DC2626', ... }, // = red (hiếm dùng)
```

> **Lưu ý**: Chỉ thực sự cần map 5 trục `blue`, `green`, `amber`, `red`, `slate` + 4 alias xám (`gray/zinc/neutral/stone`). Các trục `sky/cyan/teal/indigo/violet/purple/pink/rose/fuchsia/lime/emerald/orange/yellow` chỉ map khi `rg` xác nhận có sử dụng — quét lại trước khi viết để giữ config gọn.

### Bước thực hiện

1. **Quét chính xác** trục màu nào đang được dùng (`rg -o "(slate|gray|zinc|...|rose)-[0-9]{2,3}" src | sort -u`) → chỉ override những trục đó.
2. **Sửa `tailwind.config.ts`** một lần — thêm `colors.<scale>` trong `extend`.
3. **Loại bỏ trường hợp `sidebar-foreground` đè text trắng**: kiểm tra component nào hardcode `text-white` trên nền `bg-white` cũ — không có vì sidebar dùng `bg-sidebar`.
4. **Bump version** `1.1.3 → 1.1.4` + entry changelog: "Đồng bộ palette: mọi tông xanh/đỏ/vàng/xám trùng bộ Slate Professional".
5. **QA visual**: chụp 5 trang đại diện (`/dashboard`, `/rooms`, `/bookings`, `/reports/operations`, `/inventory`) — xác nhận không còn tông cyan chói, vàng chanh, tím lạc.

### Rủi ro

- **Thấp**: Tailwind chỉ generate CSS theo class được dùng, override không ảnh hưởng component không liên quan.
- **Cảnh báo**: Một số UI có thể trông "tối hơn" do tông warning chuyển từ vàng `#F59E0B` sang cam-nâu `#B45309` — đây chính là yêu cầu của user về tăng tương phản.
- Nếu sau khi build user phát hiện 1 trang cụ thể vẫn lạc tông, fix nhanh bằng cách bổ sung scale còn thiếu trong cùng config — không cần rollback.

### Rollback

Revert `tailwind.config.ts` về bản trước → toàn bộ palette quay lại Tailwind default. Không có migration DB.
