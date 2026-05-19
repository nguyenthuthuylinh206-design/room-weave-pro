## Vấn đề
Sau khi dời lịch thành công, ngày check-in / check-out trong bảng `/bookings` không tự cập nhật. Phải F5 mới thấy.

## Nguyên nhân
`useRescheduleBookingCheckin` chỉ invalidate `['bookings']`, `['room-bookings']`, `['overdue-checkins']` — nhưng bảng bookings dùng query key `['all-bookings', ...]` và stats card dùng `['booking-stats']`, `['group-booking']`. Các key này không khớp nên React Query không refetch.

## Cách sửa
Mở rộng danh sách invalidate trong `src/hooks/useRescheduleBookingCheckin.ts` (chỉ 1 file):

```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['overdue-checkins'] })
  qc.invalidateQueries({ queryKey: ['all-bookings'] })   // ← bảng chính
  qc.invalidateQueries({ queryKey: ['booking-stats'] })  // ← thẻ thống kê
  qc.invalidateQueries({ queryKey: ['group-booking'] })  // ← chi tiết nhóm
  qc.invalidateQueries({ queryKey: ['bookings'] })
  qc.invalidateQueries({ queryKey: ['room-bookings'] })
  qc.invalidateQueries({ queryKey: ['room-availability-window'] }) // ← lịch trong dialog
  toast.success('Đã dời ngày check-in')
}
```

Bump `APP_VERSION` → 1.0.29 + entry changelog.

## Test
1. Dời lịch 1 booking → dialog đóng → ngày check-in/out trong bảng đổi ngay không cần F5.
2. Thẻ "Sắp đến" / "Quá giờ" cập nhật count tương ứng.
3. Mở lại dialog dời lịch → mini-calendar phản ánh khoảng mới.