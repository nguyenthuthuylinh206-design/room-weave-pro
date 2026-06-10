## Hiện trạng

Scan toàn dự án trả về **608 findings, tất cả mức WARN** (không có ERROR mới). Chia thành 3 nhóm chính:

| Nhóm | Số lượng | Mô tả |
|---|---|---|
| **A. Function Search Path Mutable** | ~6 | Function chưa `SET search_path = public` → rủi ro nếu attacker tạo object cùng tên ở schema khác |
| **B. Public Bucket Allows Listing** | 2 | Bucket public cho phép `LIST` toàn bộ file (đoán URL → tải file người khác) |
| **C. SECURITY DEFINER callable by anon / authenticated** | ~600 | Mỗi RPC SECURITY DEFINER bị đếm 1 lần cho `anon` + 1 lần cho `authenticated`. Đây là **mặc định của Supabase** — không tự động sai, nhưng linter muốn ta REVOKE EXECUTE FROM anon với các RPC chỉ dành cho user đăng nhập |

## Đề xuất xử lý

### Bước 1 — Sửa nhóm A (search_path) — bắt buộc
Migration `ALTER FUNCTION ... SET search_path = public` cho 6 function còn sót. Risk: 0, chỉ là hardening.

### Bước 2 — Sửa nhóm B (public bucket) — bắt buộc
2 bucket public (khả năng cao là `avatars` + `guest-documents` hoặc bucket scan ảnh). Giải pháp:
- Giữ bucket public (cần preview ảnh) nhưng **siết policy SELECT trên `storage.objects`**: chỉ cho phép đọc nếu biết đúng `name` (không cho `list`).
- Cụ thể: drop policy "Public read", thay bằng policy chỉ áp dụng cho `SELECT` khi truy cập trực tiếp 1 object (không cho query liệt kê).

Đã có ghi nhận `avatars` & ảnh housekeeping là chấp nhận public trong @security-memory → vẫn fix list-leak nhưng giữ read trực tiếp.

### Bước 3 — Xử lý nhóm C (SECURITY DEFINER) — chọn cách
**Đây là phần quyết định nhiều nhất.** Có 2 hướng:

**Hướng 3a — Revoke EXECUTE FROM anon cho tất cả RPC nội bộ (khuyến nghị):**
- Viết migration `REVOKE EXECUTE ON FUNCTION public.<fn> FROM anon` cho mọi RPC chỉ dành cho user đăng nhập (~50–80 RPC như `perform_checkin`, `submit_room_check_lean`, `transition_room_status`, …).
- Giữ `EXECUTE TO authenticated` (vì policy đã filter `tenant_id`).
- Giữ `anon` cho các RPC public thực sự: `get_qr_payment_info`, `tbltkbtt-*`, mobile-scan-upload helper, etc.
- Sau migration: ~600 warning giảm còn ~50 (chỉ còn nhóm `authenticated` — chấp nhận được vì policy đã filter).

**Hướng 3b — Ignore toàn bộ nhóm C:**
- Mark tất cả là ignored trong scanner + ghi vào @security-memory rằng "mọi RPC đều validate `tenant_id` qua `get_current_tenant_id()`, anon không có tenant nên không lấy được data".
- Không cần migration. Risk: nếu có RPC quên check tenant → vẫn lộ.

### Bước 4 — Cập nhật @security-memory
Ghi nhận: bucket list-leak đã fix, search_path đã pin, chính sách EXECUTE cho RPC.

## Câu hỏi cần bạn quyết

1. **Nhóm C đi hướng 3a (revoke chi tiết) hay 3b (ignore + ghi memo)?**
   - 3a an toàn hơn, mất ~1 migration dài.
   - 3b nhanh, dựa vào trust "mọi RPC đã check tenant".

2. **Có muốn tôi audit luôn từng RPC SECURITY DEFINER xem có thực sự `get_current_tenant_id()` / check `auth.uid()` không?** (đây là việc đáng làm 1 lần, không quá lâu).

## File / migration dự kiến

- `supabase/migrations/<ts>_harden_function_search_path.sql` — pin search_path 6 function
- `supabase/migrations/<ts>_storage_bucket_no_list.sql` — siết SELECT trên 2 bucket public
- (nếu chọn 3a) `supabase/migrations/<ts>_revoke_anon_execute_rpc.sql` — revoke EXECUTE FROM anon
- Cập nhật `@security-memory`

Chờ bạn chốt hướng cho nhóm C rồi mình triển khai.
