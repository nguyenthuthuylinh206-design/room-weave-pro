
User hỏi: "có ảnh hưởng gì không" — về kế hoạch sửa performance đã trình bày trước đó (sửa `sw.ts`, `vite.config.ts`, `useStaffStatus.ts`, bump version 1.0.2).

## Trả lời: Có 3 ảnh hưởng — đều LÀNH TÍNH

### 1. User hiện tại sẽ bị reload 1 lần (≈3 giây)
- Vì bump `APP_VERSION` → '1.0.2' → `CacheBuster` phát hiện mismatch → wipe cache + unregister SW cũ → tự reload
- Trên iPhone PWA: tự reload trong vài giây sau khi mở app
- Trên web: reload ngay lần load tiếp theo
- **Không mất dữ liệu** (chỉ clear cache HTTP, không động vào localStorage auth/session)
- User sẽ thấy popup changelog v1.0.2 sau khi reload xong

### 2. Lần đầu sau update sẽ hơi chậm hơn 1 chút (≈1-2 giây)
- Vì cache cũ bị xoá sạch → request đầu tiên phải đi network thật
- Từ lần 2 trở đi: nhanh hơn HẲN vì SW không còn chặn request Supabase nữa

### 3. Một số tính năng phụ thuộc realtime telegram_connections sẽ refetch chậm hơn
- Hiện listener này không filter tenant → refetch sai tenant → bỏ đi là đúng
- Dữ liệu telegram của staff vẫn cập nhật bình thường khi user mở/đóng tab (visibility refetch) hoặc sau staleTime (2 phút)
- **Không ai mất tính năng nào**

## KHÔNG ảnh hưởng đến:
- ✅ Đăng nhập / phiên đăng nhập (auth không qua SW nữa nên còn ổn định hơn)
- ✅ Realtime booking, room status, payment (vẫn chạy WebSocket trực tiếp)
- ✅ Dữ liệu trong DB (không động chạm)
- ✅ RLS / phân quyền
- ✅ Edge functions
- ✅ Mutation (tạo/sửa/xoá booking, room, etc.)
- ✅ Console logs khi dev (chỉ tắt ở production build)

## Rủi ro tiềm ẩn (rất thấp)
- Nếu user đang giữa chừng 1 thao tác khi CacheBuster reload → mất form chưa submit
  - **Mitigation**: CacheBuster chỉ chạy 1 lần ngay khi mở app, không chạy giữa session
- Nếu mạng user yếu → lần load đầu sau update có thể chậm 3-5 giây thay vì 1-2 giây
  - Sau đó vẫn nhanh hơn hiện tại

## Tóm lại
**An toàn để triển khai.** Nếu bạn xác nhận tiếp tục, mình sẽ thực hiện đúng 5 file đã liệt kê trong kế hoạch. Bạn xác nhận triển khai chứ?
