## Mục tiêu

Lưới phòng `/rooms?view=grid` hiện đang hiển thị cho mọi vai trò giống nhau, có cả **giá phòng** và bố cục nặng — không tối ưu cho nhân viên buồng phòng (HK) vốn là người dùng chính ở màn này.

Cần biến card phòng thành "thẻ tác nghiệp HK": **số phòng + trạng thái to rõ → việc cần làm → nút Kiểm tra**. Giá phòng chỉ giữ lại cho Owner/Manager/Lễ tân.

## A. Logic nghiệp vụ — phân nhánh theo vai trò

Tạo helper `isOperationalRole(role)` = `role === 'staff' || role === 'department_manager'`
(HK staff + Trưởng bộ phận HK đều là người tác nghiệp).

Card phòng có 2 chế độ render:

| Khu vực | Operational (HK) | Owner / Manager / Lễ tân |
|---|---|---|
| Số phòng | **cực to** (text-3xl) + chấm màu trạng thái | text-2xl như hiện tại |
| Trạng thái | Badge text-sm in đậm, đặt ngay dưới số phòng | Selector ở góc phải (như cũ) |
| Loại phòng / sức chứa / giường / m² | Gộp 1 dòng `Deluxe • 2 khách • King • 35m²` (text-xs, mute) | Grid 3 cột như cũ |
| Đồ thiếu / giặt là / phiếu chờ | **Nổi bật**, gom thành "Việc cần làm" có icon trạng thái màu | Như cũ |
| **Giá phòng** | ❌ **ẨN** | ✅ Hiển thị |
| Lần kiểm cuối | "Đã kiểm 2 giờ trước" / "Chưa kiểm hôm nay" (text-xs amber nếu >12h) | Không hiển thị (giữ gọn) |
| Footer | 1 nút duy nhất **Kiểm tra** full-width | Xem chi tiết + dropdown task + Kiểm tra (như cũ) |
| Checkbox bulk | Vẫn giữ | Vẫn giữ |
| Click card | Không điều hướng (staff không có quyền xem detail) | → `/rooms/:id` |

## B. UI components

Sửa duy nhất `src/components/rooms/RoomGrid.tsx`:

1. Thêm `const isOperational = isOperationalRole(role)` đầu component.
2. Tách 1 phần JSX `RoomCardOperational` (inline, không tách file) để dễ đọc — render gọn theo bảng trên.
3. Phần đang dùng (`canViewRoomDetail`, dropdown task, nút view detail, block giá) **chỉ render khi `!isOperational`**.
4. Khối "Việc cần làm" cho HK:
   - Dòng 1: nếu có session đang kiểm → `Đang kiểm bởi {tên} ({type})` (orange, Clock pulse) — ưu tiên cao nhất
   - Dòng 2: Đồ thiếu (red) hoặc Đủ đồ (green, ngắn gọn ✓)
   - Dòng 3: Đồ giặt (cyan) — chỉ khi >0
   - Dòng 4: Phiếu chờ giao (amber) — chỉ khi >0
   - Dòng 5: Lần kiểm cuối — `Đã kiểm {relative}` hoặc `Chưa kiểm hôm nay` (amber khi quá hạn)
5. Nút Kiểm tra giữ logic disable khi session người khác đang giữ.
6. Grid spacing chặt hơn cho operational: `gap-3` thay vì `gap-4`, có thể fit 4 cột ở `lg`.

## C. Filter / Header

Không đổi `RoomsPage`. Chỉ thay đổi nội dung từng card.

## D. i18n

Bổ sung key tiếng Việt trong `src/locales/vi/rooms.json`:

```
grid.lastCheckedRelative: "Đã kiểm {{time}}"
grid.notCheckedToday: "Chưa kiểm hôm nay"
grid.summaryLine: "{{type}} • {{guests}} khách • {{bed}} • {{area}}m²"
```

Dùng `formatDistanceToNow` từ `date-fns` với locale `vi` cho `last_check_at`.

## E. Permission

Không cần policy mới. Dùng `role` từ `useUser()` đã có. Logic giá phòng được giấu ở **client UI** (HK staff đã không được vào trang detail/booking — không phải rò rỉ dữ liệu nhạy cảm; nếu cần chặt hơn về sau có thể loại field giá ở RPC theo role).

## F. Test cases (manual QA)

1. Đăng nhập role `staff` → card không thấy giá, không thấy nút "Xem chi tiết", click card không điều hướng.
2. Đăng nhập role `owner` / `hotel_manager` → card giữ nguyên bố cục cũ (giá, dropdown task, xem chi tiết).
3. Phòng đang có session kiểm → card hiển thị "Đang kiểm bởi ...", nút Kiểm tra disable với người khác, "Tiếp tục kiểm" với chính mình.
4. Phòng `last_check_at = null` → hiển thị "Chưa kiểm hôm nay" (amber).
5. Phòng có `missing_items=0`, `items_in_laundry=0`, không phiếu chờ → khối "Việc cần làm" chỉ có 1 dòng ✓ Đủ đồ + dòng lần kiểm cuối.
6. Mobile portrait 390px → card 1 cột, số phòng vẫn đọc rõ, nút Kiểm tra full-width thumb-zone.

## G. Rollout

- Thay đổi thuần UI, không migration, không breaking change cho Manager/Owner.
- Bump `APP_VERSION` + `CURRENT_VERSION` + thêm entry `changelog.json`: *"Tối ưu lưới phòng cho nhân viên buồng phòng: số phòng to rõ, làm nổi việc cần làm, ẩn giá."*

## File sẽ chỉnh

- `src/components/rooms/RoomGrid.tsx` (chính)
- `src/locales/vi/rooms.json` (thêm 3 key)
- `src/lib/app-version.ts`, `src/components/pwa/CacheBuster.tsx`, `public/changelog.json` (bump version)
