

## Thiết kế lại Housekeeping Staff Dashboard

### Mục tiêu
Tạo trang dashboard chuyên dụng cho nhân viên buồng phòng — mở lên là thấy ngay việc cần làm, không cần suy nghĩ. Tối giản, font lớn, phân biệt bằng màu sắc.

### Thay đổi hiện trạng
Hiện tại trang `/my-tasks` dùng `MyTasksPage` → `StaffTasksTab` với giao diện card khá nhiều thông tin. Chưa có lọc theo tầng, chưa tối ưu cho nhân viên buồng phòng chuyên dụng.

---

### Thiết kế mới: `HousekeepingStaffDashboard`

**Layout tổng thể (mobile-first, 390px):**

```text
┌─────────────────────────────┐
│  🟢 3 việc cần làm          │  ← Header tối giản, chỉ số lượng
│  ▸ Tầng 2  ▸ Tầng 3  ▸ Tất cả │  ← Lọc tầng (chip ngang)
├─────────────────────────────┤
│  ⚡ CẦN LÀM GẤP             │  ← Section đỏ nếu có urgent
│  ┌─────────────────────────┐│
│  │ 🔴 P.201  Dọn phòng    ││  ← Row lớn, font 16px
│  │    Khẩn cấp · 14:00    ││
│  │              [Bắt đầu] ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  📋 CHƯA LÀM (2)            │
│  ┌─────────────────────────┐│
│  │ P.305  Kiểm tra checkout││
│  │    Cao · 15:00          ││
│  │              [Bắt đầu] ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ P.410  Chuẩn bị check-in││
│  │    TB                   ││
│  │              [Bắt đầu] ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  🔵 ĐANG LÀM (1)            │
│  ┌─────────────────────────┐│
│  │ P.302  Dọn phòng  ⏱ 12p││
│  │         [Tiếp tục] [✓]  ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  ✅ ĐÃ XONG HÔM NAY (5)     │  ← Thu gọn, tap để mở
└─────────────────────────────┘
```

### Nguyên tắc thiết kế
- **Không dialog trung gian**: Mọi action (Bắt đầu, Hoàn thành) trực tiếp trên row
- **Font lớn**: Số phòng 16-18px bold, loại công việc 14px
- **Màu tối thiểu**: Đỏ = gấp, Xanh dương = đang làm, Xám = chờ, Xanh lá = xong
- **Lọc tầng**: Chip ngang scroll, lấy từ `room.floor` của tasks
- **Section "Đã xong"**: Thu gọn (collapsible), hiển thị số lượng hoàn thành hôm nay để tạo cảm giác thành tựu
- **Auto-refresh**: Realtime đã có sẵn từ `useUnifiedTasks`

### Files

| File | Thay đổi |
|------|----------|
| `src/pages/HousekeepingStaffDashboard.tsx` | **Mới** — Trang dashboard chuyên dụng |
| `src/components/housekeeping/StaffTaskRow.tsx` | **Mới** — Row tối giản thay TaskCard, font lớn, action inline |
| `src/components/housekeeping/FloorFilter.tsx` | **Mới** — Chip lọc tầng ngang |
| `src/hooks/useCompletedTasksToday.ts` | **Mới** — Query tasks hoàn thành hôm nay |
| `src/App.tsx` | Thêm route `/staff/housekeeping` |
| `src/components/layout/MobileBottomNav.tsx` | Redirect nhân viên buồng phòng đến dashboard mới |

### Chi tiết `StaffTaskRow`
- Một row 60-72px height
- Trái: Icon loại việc (nhỏ) + Số phòng (bold lớn) + Loại công việc
- Phải: Badge ưu tiên (chỉ màu, không text cho medium/low) + Deadline + Nút action
- Pending → nút "Bắt đầu" (primary)
- In progress → nút "Tiếp tục" + "✓ Xong"
- Tap vào row → mở TaskDetailDialog (giữ nguyên logic hiện có)

### Chi tiết `FloorFilter`
- Tự động lấy danh sách tầng từ tasks đang có
- Chip: "Tất cả (5)" | "T.1 (2)" | "T.2 (3)" — scroll ngang
- Không hiển thị nếu tất cả tasks cùng 1 tầng

### "Đã xong hôm nay"
- Query `housekeeping_tasks` WHERE `completed_at >= today` AND `assigned_to = userId`
- Collapsible section, mặc định thu gọn, chỉ hiện count

