
## Nguyên nhân gốc

Database có record bank settings của Super Admin (`hotel_id = NULL`, `tenant_id = NULL`, `is_active = true`). Tuy nhiên, RLS policy hiện tại **chặn** tenant user đọc record này.

**RLS policy hiện tại:**
```sql
-- "Users can view their tenant bank settings"
(is_active = true) AND (
  is_super_admin() 
  OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
)
```

Record Super Admin có `tenant_id = NULL`, nên `NULL IN (SELECT tenant_id FROM users WHERE id = auth.uid())` = **FALSE** → user không đọc được → `bankSettings = null` → hiển thị lỗi "Chưa cấu hình thông tin thanh toán".

## Giải pháp

Cập nhật RLS policy SELECT để cho phép authenticated user đọc thêm record có `hotel_id IS NULL AND tenant_id IS NULL` (tức là cấu hình global của Super Admin dùng cho subscription payment).

**Policy mới:**
```sql
ALTER POLICY "Users can view their tenant bank settings" 
ON bank_payment_settings 
USING (
  is_active = true AND (
    is_super_admin()
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR (hotel_id IS NULL AND tenant_id IS NULL)  -- Cho phép đọc config global của Super Admin
  )
);
```

Điều này an toàn vì:
- Chỉ cho phép đọc (SELECT), không phải ghi
- Chỉ record `is_active = true` mới được đọc
- Policy quản lý (ALL cmd) vẫn chỉ Super Admin mới sửa được
- Không ảnh hưởng đến dữ liệu của các tenant khác

## Thay đổi cần thực hiện

**1 migration SQL:**
```sql
ALTER POLICY "Users can view their tenant bank settings" 
ON public.bank_payment_settings 
USING (
  (is_active = true) AND (
    is_super_admin() 
    OR (tenant_id IN (
      SELECT users.tenant_id FROM users WHERE users.id = auth.uid()
    ))
    OR (hotel_id IS NULL AND tenant_id IS NULL)
  )
);
```

Không cần thay đổi code frontend — sau khi update policy, `useSuperAdminBankPaymentSettings()` sẽ tự động trả về đúng dữ liệu và dialog QR sẽ hiển thị bình thường.
