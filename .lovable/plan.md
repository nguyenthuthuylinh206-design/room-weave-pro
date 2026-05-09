## Mục tiêu

Trang `/rooms/:id` hiện chia 2/3 + 1/3, nhưng cột trái (Room Info, Items) chiếm chiều cao lớn hơn cột phải nhiều, tạo khoảng trống dài bên dưới cột phải. Đồng thời thông tin số liệu (Sức chứa, Giường, View, Giá, Tiện nghi, Tổng/Đủ/Thiếu, Health Score) bị nén nhỏ ở góc, khó quét nhanh.

Hướng giải quyết: chuyển sang **bố cục dashboard dọc 1 cột rộng**, các block KPI/thông tin được kéo ra giữa với kích cỡ lớn, dễ nhìn. Cột phụ chỉ còn 1 panel hẹp dạng "side rail" cho khách đang ở + thao tác nhanh, hoặc thậm chí bỏ hẳn cột phụ ở các section dưới.

## Wireframe phác thảo

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← P101  [Đang ở]   Deluxe • Tầng 1 • 28m²            [Sửa] [Kiểm tra]   │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠ Banner cleaning / pending delivery (full-width, chỉ khi có)            │
└──────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════ HERO STRIP — KPI lớn, 4 ô ════════════════════════╗
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐ ║
║  │  92      │  │  24 / 26 │  │  2       │  │  Khách: Nguyễn Văn A     │ ║
║  │ Health   │  │  Đồ đủ   │  │ Đồ thiếu │  │  CI 09/05 → CO 11/05     │ ║
║  │ ▓▓▓▓▓░   │  │  (xanh)  │  │  (đỏ)    │  │  [Xem booking]           │ ║
║  └──────────┘  └──────────┘  └──────────┘  └──────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════╝

┌──────────────────── THÔNG TIN PHÒNG (full-width, grid 6 cột) ────────────┐
│  Số phòng │ Loại  │ Tầng │ Sức chứa │ Giường   │ View                    │
│   101     │ Deluxe│  1   │ 2 khách  │ Queen    │ Sea                     │
│  Diện tích│ Giá/đêm                                                      │
│   28 m²   │ 1.200.000 ₫                                                  │
│ ─────────────────────────────────────────────────────────────────────── │
│  Tiện nghi:  [Wi-Fi] [Máy lạnh] [Tủ lạnh] [Két sắt] …                   │
│  Ghi chú:    Phòng góc, view biển trực diện…                            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────── ĐỒ DÙNG TRONG PHÒNG (full-width) ────────────────────┐
│  ✔ 24 đủ    ✘ 2 thiếu              [Áp dụng tiêu chuẩn] [In danh sách]  │
│  [Tabs: Tiêu chuẩn (24)  •  Khác (3)  •  Thiếu (2)]                      │
│  RoomItemsList…                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────── 2 CỘT BẰNG NHAU (chỉ ở khu lịch sử) ─────────────────────┐
│ Lịch sử kiểm tra              │ Lịch sử giao đồ                           │
│ EnhancedCheckHistory          │ RoomDistributionHistory                   │
│ + ảnh kiểm tra gần nhất       │ (badge số đơn pending)                    │
└───────────────────────────────┴───────────────────────────────────────────┘

┌──────────────── THAO TÁC NHANH (sticky thanh dưới hoặc inline) ──────────┐
│ [Kiểm tra] [Đồng bộ tiêu chuẩn] [Yêu cầu công việc] [Reset] [In]         │
└──────────────────────────────────────────────────────────────────────────┘
```

## Thay đổi chính so với hiện tại

1. **Bỏ grid `lg:grid-cols-3`** ở cấp ngoài. Toàn trang là 1 cột rộng (`max-w-6xl mx-auto`), tận dụng full chiều ngang ~1234px.
2. **Hero KPI strip** ở đầu: 4 ô ngang bằng nhau, font số lớn (`text-3xl font-bold`), thay cho `RoomHealthScore` + ô "Tổng/Đủ/Thiếu" cũ vốn nhỏ xíu bên phải.
   - Ô 1: Health score + thanh progress mảnh.
   - Ô 2: "Đồ đủ" — số xanh.
   - Ô 3: "Đồ thiếu" — số đỏ.
   - Ô 4: `GuestInfoCard` rút gọn (tên khách + CI/CO) hoặc trạng thái "Phòng trống" khi không có khách.
3. **Thông tin phòng** dãn full-width thành grid 4–6 cột thay vì nén 2×4. Tiện nghi và ghi chú nằm dưới cùng block.
4. **Ảnh kiểm tra gần nhất**: gộp vào trong block "Lịch sử kiểm tra" (tab hoặc accordion) để không tạo card lẻ.
5. **Lịch sử kiểm tra + Lịch sử giao đồ** đặt cạnh nhau (`grid-cols-2`) — đây là chỗ duy nhất còn 2 cột vì cả hai đều là list timeline.
6. **Quick Actions** chuyển thành **thanh nút ngang** ở cuối trang (hoặc sticky footer trên màn lớn) thay vì stack dọc trong sidebar.
7. **Mobile** giữ nguyên `MobileRoomDetailPage` — không đụng.

## File sẽ sửa

- `src/pages/rooms/RoomDetailPage.tsx` — viết lại layout (chỉ phần JSX desktop, hooks giữ nguyên).
- `src/components/rooms/RoomHealthScore.tsx` — thêm variant `compact` chỉ render số + bar mảnh, không có card bao ngoài (để fit vào hero strip).
- `src/components/rooms/GuestInfoCard.tsx` — thêm variant `inline` (1 dòng tên + ngày CI/CO) cho ô KPI thứ 4. Variant đầy đủ vẫn giữ cho mobile.

Không đụng RPC, schema, permissions, hay business logic — đây là refactor UI thuần.

## Kiểm thử

- Desktop 1234px (viewport hiện tại của user): hero strip 4 ô đều, không tràn.
- Desktop 1536px: vẫn cân, max-width giới hạn tránh quá rộng.
- Tablet 1024px: hero strip wrap thành 2×2.
- Mobile: bypass — render `MobileRoomDetailPage`.
- Trạng thái phòng trống (không có khách): ô KPI thứ 4 hiển thị "Phòng trống — sẵn sàng nhận khách".
- Phòng chưa có items: block "Đồ dùng" hiển thị empty state + nút Áp dụng tiêu chuẩn.

## Rollout

Thay 1 file page + 2 component variant → low risk. Không cần migration, không feature flag.
