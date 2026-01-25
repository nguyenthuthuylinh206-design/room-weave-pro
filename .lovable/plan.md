

## Kế hoạch: Xử lý kiểm tra lại phòng và chuyển trạng thái

### I. VẤN ĐỀ HIỆN TẠI

#### A. Trạng thái phòng sau kiểm tra

| Loại kiểm tra | Trạng thái sau khi hoàn thành |
|---------------|-------------------------------|
| `checkout` | → `cleaning` (tự động) |
| `daily` | Không đổi |
| `checkin` | Không đổi |
| `maintenance` | Không đổi |

**Thiếu**: Cơ chế chuyển `cleaning` → `vacant` khi dọn phòng xong.

#### B. Kiểm tra lại sau khi đã hoàn thành

Hiện tại **KHÔNG CÓ** tính năng cho phép:
- Nhân viên kiểm tra lại nếu phát hiện thiếu sót
- Chỉnh sửa kết quả kiểm tra đã hoàn thành
- Manager review và yêu cầu kiểm tra lại

---

### II. GIẢI PHÁP ĐỀ XUẤT

#### Phần 1: Thêm nút "Hoàn thành dọn phòng" (cleaning → vacant)

**Logic:**
- Khi phòng ở trạng thái `cleaning`, hiển thị nút "Hoàn thành dọn phòng"
- Nhân viên bấm → Phòng chuyển sang `vacant`
- Tùy chọn: Yêu cầu kiểm tra nhanh trước khi đổi trạng thái

**Files thay đổi:**
- `src/components/rooms/StaffRoomCheckView.tsx` - Thêm nút
- `src/hooks/useRooms.ts` - Thêm mutation `markRoomReady`

**Code mẫu:**
```typescript
const markRoomReady = async (roomId: string) => {
  await supabase
    .from('rooms')
    .update({ status: 'vacant' })
    .eq('id', roomId)
    .eq('status', 'cleaning') // Chỉ đổi nếu đang cleaning
}
```

#### Phần 2: Thêm tính năng "Kiểm tra lại" (Re-check)

**2 Option:**

**Option A: Cho phép kiểm tra mới bất cứ lúc nào**
- Không khóa phòng sau khi kiểm tra xong
- Mỗi lần kiểm tra tạo record mới trong `room_checks`
- Ưu điểm: Đơn giản, linh hoạt
- Nhược điểm: Có thể tạo nhiều records trùng lặp

**Option B: Thêm trạng thái "Chờ xác nhận" trước khi hoàn thành**
- Sau khi nhân viên kiểm tra xong → Trạng thái: `pending_review`
- Manager review và duyệt
- Nếu có vấn đề → Yêu cầu kiểm tra lại
- Ưu điểm: Kiểm soát chặt hơn
- Nhược điểm: Phức tạp, chậm workflow

**Đề xuất: Kết hợp cả 2**

**Logic chi tiết:**
1. Sau khi kiểm tra checkout xong → Phòng chuyển `cleaning`
2. Nhân viên dọn phòng xong → Bấm "Hoàn thành dọn phòng"
3. Hệ thống hỏi: "Bạn có muốn kiểm tra nhanh trước khi mở phòng?"
   - Có → Mở form kiểm tra nhanh (daily check)
   - Không → Chuyển thẳng sang `vacant`
4. Nếu phát hiện thiếu đồ sau khi đã hoàn thành:
   - Nhân viên vào lại phòng → Bấm "Kiểm tra lại"
   - Tạo room_check mới với ghi chú "Kiểm tra bổ sung"

#### Phần 3: Cập nhật trạng thái phòng đầy đủ

**Logic chuyển trạng thái:**

| Hành động | Phòng đang ở | Chuyển sang |
|-----------|--------------|-------------|
| Checkout check hoàn thành | `check_out` / `occupied` | `cleaning` |
| Hoàn thành dọn phòng | `cleaning` | `vacant` |
| Check-in check hoàn thành | `check_in` / `vacant` | `occupied` |
| Daily check hoàn thành | Bất kỳ | Không đổi |
| Maintenance hoàn thành | `maintenance` | `vacant` |

---

### III. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/hooks/useRooms.ts` | Thêm mutation `markRoomReady()` |
| `src/hooks/useRoomChecks.ts` | Cập nhật logic chuyển trạng thái cho checkin/maintenance |
| `src/components/rooms/StaffRoomCheckView.tsx` | Thêm nút "Hoàn thành dọn phòng", "Kiểm tra lại" |
| `src/components/rooms/RoomDetailActions.tsx` (nếu có) | Thêm action buttons cho Manager |
| `src/pages/rooms/RoomDetailPage.tsx` | Hiển thị lịch sử kiểm tra và nút kiểm tra lại |

---

### IV. UI/UX ĐỀ XUẤT

#### StaffRoomCheckView - Phòng đang cleaning:

```
┌─────────────────────────────────────┐
│ P101 - Deluxe                       │
│ [Đang dọn] ● Checkout lúc 10:30     │
│                                     │
│ [✓ Hoàn thành dọn]  [🔄 Kiểm tra]   │
└─────────────────────────────────────┘
```

#### Dialog xác nhận hoàn thành dọn:

```
╔═══════════════════════════════════════╗
║ Hoàn thành dọn phòng P101?            ║
╠═══════════════════════════════════════╣
║ Phòng sẽ chuyển sang trạng thái       ║
║ "Sẵn sàng" và có thể nhận khách.      ║
║                                       ║
║ ○ Kiểm tra nhanh trước khi mở phòng   ║
║ ○ Mở phòng ngay                       ║
║                                       ║
║        [Hủy]  [Xác nhận]              ║
╚═══════════════════════════════════════╝
```

---

### V. KẾT QUẢ SAU TRIỂN KHAI

1. Nhân viên có thể đánh dấu hoàn thành dọn phòng (cleaning → vacant)
2. Có thể kiểm tra lại phòng bất cứ lúc nào nếu phát hiện thiếu sót
3. Trạng thái phòng chuyển đổi đúng theo workflow thực tế
4. Lịch sử kiểm tra đầy đủ, dễ truy vết
5. Manager có thể theo dõi tiến độ dọn phòng realtime

