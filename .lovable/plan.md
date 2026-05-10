## Vấn đề

Trang **Quản lý khách hàng** (và mọi nơi đọc bảng `tenants`) trả về rỗng vì:

- `public.tenants` đã **bật RLS** (`relrowsecurity = true`)
- Nhưng **KHÔNG có policy nào** cho `SELECT` (cũng không có cho INSERT/UPDATE/DELETE)
- → Postgres mặc định **chặn 100% SELECT** từ client REST

Bằng chứng:
- DB có **11 tenants** (10 không tính tenant hệ thống `00000000…`)
- RPC `get_super_admin_dashboard_stats` (SECURITY DEFINER, bypass RLS) trả `total_tenants: 10` ✅
- Network log: `GET /rest/v1/tenants?…` → trả `[]` hoặc `PGRST116 (0 rows)` ở mọi query trực tiếp

Đây cũng là nguyên nhân gốc của các báo cáo trước "tất cả dữ liệu đều bị mất" — bất cứ component nào (Subscription banner, ReadOnlyMode, useTenant, AdvancedTenantsManagement, ChangePlanDialog…) query trực tiếp `tenants` đều thấy rỗng.

---

## Phương án

Tạo migration thêm 4 policy cho `public.tenants`:

| Policy | Cmd | Logic |
|---|---|---|
| `tenants_select_own` | SELECT | `id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())` — user xem tenant của chính mình |
| `tenants_select_super_admin` | SELECT | `public.is_super_admin(auth.uid())` — Super Admin xem tất cả |
| `tenants_update_super_admin` | UPDATE | `public.is_super_admin(auth.uid())` — Super Admin sửa tất cả |
| `tenants_update_owner` | UPDATE | `id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'owner')` — Owner sửa tenant mình |

INSERT/DELETE: KHÔNG mở. Tạo tenant mới đi qua flow signup (server-side / SECURITY DEFINER RPC). Xoá tenant chỉ qua Super Admin tools (RPC riêng nếu cần).

Dùng `is_super_admin(uuid)` (đã có) → tránh recursion vì hàm này SECURITY DEFINER đọc `user_roles`, không đọc `tenants`.

---

### A. Logic
Phân quyền 3 lớp như trên. Không động tới business logic, không thay đổi UI.

### B. Migration
1 migration tạo 4 policy + ghi audit log via `log_state_transition` nếu có (chỉ ghi text, không bắt buộc).

### C. RPC
Không thêm RPC. Reuse `is_super_admin`, `has_role` đã có.

### D. UI
Không đổi. Sau migration, các trang sẽ tự fill data:
- `/admin/tenants` → 10 khách hàng hiện ra
- Subscription banner → đọc được tenant hiện tại
- HotelContext / ReadOnlyMode → hết lỗi 406

### E. Permission
- Super Admin: full read/update tenants
- Owner: read + update tenant của mình
- Manager/Staff: chỉ read tenant của mình
- Anonymous: không có quyền

### F. Test
1. Login `admin@company.com` (super_admin) → `/admin/tenants` thấy 10 khách hàng.
2. `GET /rest/v1/tenants?id=eq.{tenant_id_của_user}` từ user thường → trả 1 row (không còn 406).
3. User của tenant A KHÔNG đọc được tenant B (RLS tenant isolation OK).
4. Owner update field `name` của tenant mình → 200.
5. Staff update tenant → 0 row affected (chặn).
6. Super Admin update field `subscription_status` của tenant bất kỳ → 200.

### G. Rollout
- Không breaking. Migration thuần ADD POLICY.
- Rollback: `DROP POLICY tenants_select_own, tenants_select_super_admin, tenants_update_super_admin, tenants_update_owner ON public.tenants;`
- Sau khi áp: F5 các trang để invalidate react-query cache.

---

## Phần còn thiếu / lưu ý

- Cần kiểm tra thêm các bảng khác có cùng tình trạng "RLS on, no policy" không (`hotels`, `subscription_plans`, `tenant_usage`…). Nếu có sẽ làm migration tiếp theo. Trong phạm vi yêu cầu hiện tại chỉ fix `tenants` để mở khoá trang đang xem.
- Không thay đổi PWA/cache (đã fix turn trước).
