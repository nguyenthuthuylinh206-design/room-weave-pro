# Tối ưu Chat — gọn gàng & phân nhóm người dùng

## Vấn đề bạn nêu
1. **Ô chat hiện tại quá to/lỏng** — bubble, padding, header chiếm nhiều không gian.
2. **Danh sách user khi tạo hội thoại sổ thẳng tất cả ra** — không có phân nhóm, không search, dài lê thê khó tìm người.

## Phạm vi sửa (giữ nguyên kiến trúc, chỉ tinh chỉnh UI)

### 1. Compact lại khung chat (`ChatPage.tsx`)
- **Bubble**: giảm `px-3 py-2` → `px-2.5 py-1.5`, `text-sm` → `text-[13px]`, max-width 75% → 72%, bo `rounded-2xl` kiểu chat thay vì `rounded-lg`.
- **Spacing list tin nhắn**: `space-y-2` → `space-y-0.5`; gộp tin liên tiếp cùng người gửi trong < 3 phút (1 cụm) — chỉ tin **cuối cụm** mới hiện thời gian; ẩn tên người gửi khi trùng cụm.
- **Header hội thoại**: bớt `py-3` → `py-2`, gộp "Chat trực tiếp / Nhóm" thành chip nhỏ bên cạnh tên thay vì 1 dòng riêng.
- **Composer**: `h-9` → `h-8`, icon Paperclip nhỏ lại `h-8 w-8`, nút Gửi đổi thành icon mũi tên `Send` (vuông `h-8 w-8`), tổng chiều cao thanh nhập gọn ~40px.
- **Sidebar conversation row**: `py-2` → `py-1.5`, gộp time + unread badge sát phải, preview 1 dòng truncate.
- **Khung tổng**: thay `h-[calc(100vh-12rem)]` bằng `h-[calc(100dvh-9rem)]` (desktop) / `h-[100dvh]` (mobile) để dùng đủ chiều cao, không bị "ô vuông nhỏ trong trang".

### 2. Dialog "Hội thoại mới" — phân nhóm + search
Hiện tại `NewConversationDialog` chỉ render 1 list phẳng tất cả user trong tenant. Sẽ đổi thành:

- **Ô search** ở đầu — lọc theo `full_name` + `email` (không dấu, lowercase).
- **Phân nhóm theo vai trò/bộ phận** (collapsible section, có badge đếm):
  - `Chủ sở hữu / Quản lý` (owner, hotel_manager, department_manager)
  - `Nhân viên` (staff)
  - Sắp xếp A-Z trong từng nhóm.
- **Chip "Đã chọn"** ở đầu (chế độ nhóm): hiển thị các member đã chọn, click X để bỏ — không cần scroll xuống tìm lại.
- **Row gọn**: avatar 28px + tên + vai trò mờ bên phải, chiều cao `h-11` (touch-friendly).
- **Scroll area** tăng từ `h-64` → `h-72` để thấy nhiều hơn.
- **Lọc theo hotel hiện tại** đúng nghĩa: chỉ hiện user thực sự được gán cho hotel đang chọn (qua `user_hotels`) thay vì toàn tenant — đỡ rối với khách sạn lớn.

## File sẽ sửa (chỉ frontend)
- `src/pages/ChatPage.tsx` — compact bubble, grouping, composer gọn, dialog "Mới" được tách thành component con với search + section.
- `src/hooks/useChat.ts` — `useHotelMembers` thêm join `user_hotels` theo `selectedHotel.id`, trả thêm `role` để phân nhóm.

Không đụng schema, không đụng RPC, không đụng realtime.

## QA checklist
- Bubble không tràn ngang trên mobile 360px.
- 3 tin liên tiếp của cùng người → gộp đúng, chỉ tin cuối có timestamp.
- Search "ng" → lọc đúng tên + email cả có dấu lẫn không dấu.
- Bỏ chọn thành viên trong chip "Đã chọn" → checkbox bên dưới đồng bộ.
- Composer trên iPhone SE không bị bàn phím che.

OK đi vậy nhé? Sau khi xong mình bump v1.0.59 + thêm changelog.
