

## Kế hoạch: Cài đặt tài khoản thanh toán theo từng khách sạn (chỉ chủ khách sạn)

### I. PHÂN TÍCH HIỆN TRẠNG

**Bảng `bank_payment_settings` hiện tại:**
- Không có `hotel_id` hoặc `tenant_id`
- Chỉ có 1 record cho toàn hệ thống
- RLS: Chỉ `super_admin` mới quản lý được

**Yêu cầu mới:**
- Mỗi khách sạn có tài khoản thanh toán riêng
- Chỉ **chủ khách sạn** (`tenant_owner` / `owner`) mới được cài đặt
- Staff, Manager không có quyền

---

### II. CÁC THAY ĐỔI

#### A. Database Migration

**Thêm cột mới vào `bank_payment_settings`:**
```sql
ALTER TABLE bank_payment_settings 
ADD COLUMN hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Tạo index và unique constraint
CREATE UNIQUE INDEX idx_bank_payment_settings_hotel 
ON bank_payment_settings(hotel_id) WHERE hotel_id IS NOT NULL;
```

**Cập nhật RLS policies:**
```sql
-- Drop các policy cũ
DROP POLICY IF EXISTS "Super admins can manage bank settings" ON bank_payment_settings;
DROP POLICY IF EXISTS "Allow public read active bank_payment_settings" ON bank_payment_settings;
DROP POLICY IF EXISTS "Authenticated users can view active bank settings" ON bank_payment_settings;

-- Policy mới: Chỉ tenant_owner/owner được quản lý
CREATE POLICY "Owners can manage their hotel bank settings"
ON bank_payment_settings FOR ALL
USING (
  -- Super admin có toàn quyền
  is_super_admin() 
  OR (
    -- Tenant owner của cùng tenant
    tenant_id IN (
      SELECT u.tenant_id FROM users u 
      WHERE u.id = auth.uid() 
      AND (u.user_level_code = 'tenant_owner' OR EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'owner'
      ))
    )
  )
);

-- Policy cho authenticated users đọc settings của khách sạn mình
CREATE POLICY "Users can view their hotel bank settings"
ON bank_payment_settings FOR SELECT
USING (
  is_active = true 
  AND (
    is_super_admin()
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- Policy cho public read (cho PaymentQRPage public) - Chỉ qua UUID
CREATE POLICY "Public read active bank settings by ID"
ON bank_payment_settings FOR SELECT
TO public
USING (is_active = true);
```

---

#### B. Cập nhật Hook `useBankPaymentSettings.ts`

Thêm tham số `hotelId` để query theo khách sạn:

```typescript
// Query active settings cho một hotel cụ thể
export function useBankPaymentSettings(hotelId?: string) {
  return useQuery({
    queryKey: ['bank-payment-settings', hotelId],
    queryFn: async () => {
      let query = supabase
        .from('bank_payment_settings')
        .select('*')
        .eq('is_active', true);
      
      if (hotelId) {
        query = query.eq('hotel_id', hotelId);
      }
      
      const { data, error } = await query.limit(1).single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as BankPaymentSettings | null;
    },
    enabled: !!hotelId,
  });
}

// Create với hotel_id và tenant_id
export function useCreateBankPaymentSettings() {
  return useMutation({
    mutationFn: async (settings: { hotel_id: string; tenant_id: string; ... }) => {
      // Deactivate existing cho hotel này
      await supabase
        .from('bank_payment_settings')
        .update({ is_active: false })
        .eq('hotel_id', settings.hotel_id);
      
      // Insert new
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .insert(settings)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    // ...
  });
}
```

---

#### C. Tạo Component mới: `HotelBankPaymentSettings.tsx`

Đặt trong `src/components/settings/` cho owner cài đặt:

```typescript
// src/components/settings/HotelBankPaymentSettings.tsx

export function HotelBankPaymentSettings({ hotelId }: { hotelId: string }) {
  const { user } = useUser();
  const { tenant } = useTenant();
  const isOwner = isTenantOwner(user) || isAdminUser(user);
  
  // Chỉ owner mới thấy và chỉnh sửa
  if (!isOwner) {
    return (
      <Alert variant="default">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Chỉ chủ khách sạn mới có quyền cài đặt tài khoản thanh toán
        </AlertDescription>
      </Alert>
    );
  }

  // Form giống BankPaymentSettings.tsx nhưng với hotel_id
  // ...
}
```

---

#### D. Thêm vào trang PricingRulesPage

Thêm section "Tài khoản nhận thanh toán" vào trang `/settings/pricing-rules`:

```typescript
// src/pages/settings/PricingRulesPage.tsx

import { HotelBankPaymentSettings } from '@/components/settings/HotelBankPaymentSettings';

export default function PricingRulesPage() {
  const { selectedHotel } = useHotelContext();
  
  return (
    <div className="space-y-6 p-4">
      {/* Existing: Phụ thu & Thuế phí */}
      <section>
        <h1>Cài đặt Phụ thu & Thuế phí</h1>
        <PricingRulesForm hotelId={selectedHotel.id} />
      </section>
      
      {/* New: Tài khoản thanh toán */}
      <section>
        <HotelBankPaymentSettings hotelId={selectedHotel.id} />
      </section>
    </div>
  );
}
```

---

#### E. Cập nhật các component sử dụng `useBankPaymentSettings`

Truyền `hotelId` từ context/props:

| Component | Thay đổi |
|-----------|----------|
| `BookingPaymentDialog.tsx` | Dùng `booking.hotel_id` |
| `PaymentQRPage.tsx` | Lấy `hotel_id` từ payment metadata |
| `ViewPaymentQRDialog.tsx` | Lấy `hotel_id` từ payment |
| `BankTransferPaymentDialog.tsx` | Truyền `hotelId` prop |

---

### III. TÓM TẮT FILE THAY ĐỔI

| File | Hành động |
|------|-----------|
| **Database Migration** | Thêm cột `hotel_id`, `tenant_id` + RLS policies |
| `src/hooks/useBankPaymentSettings.ts` | **Sửa** - Thêm `hotelId` param |
| `src/components/settings/HotelBankPaymentSettings.tsx` | **Tạo mới** - Component cài đặt |
| `src/pages/settings/PricingRulesPage.tsx` | **Sửa** - Thêm section bank settings |
| `src/components/bookings/BookingPaymentDialog.tsx` | **Sửa** - Truyền hotelId |
| `src/pages/payment/PaymentQRPage.tsx` | **Sửa** - Lấy hotelId từ payment |
| `src/components/payment/ViewPaymentQRDialog.tsx` | **Sửa** - Truyền hotelId |

---

### IV. LƯU Ý BẢO MẬT

1. **Chỉ tenant_owner/owner/super_admin** được thêm/sửa/xóa bank settings
2. **Staff/Manager** chỉ xem được settings active của hotel mình để hiển thị QR
3. **Public access** chỉ qua PaymentQRPage với UUID cụ thể
4. **Unique constraint** đảm bảo mỗi hotel chỉ có 1 active setting

---

### V. FLOW SAU KHI IMPLEMENT

```text
Chủ khách sạn (Owner):
======================
1. Vào Settings → Quy tắc giá (Pricing Rules)
2. Thấy 2 section:
   - Phụ thu & Thuế phí (existing)
   - Tài khoản nhận thanh toán (new)
3. Cấu hình ngân hàng cho khách sạn đang chọn
4. Mỗi khách sạn có settings riêng

Staff/Manager:
==============
1. Vào trang Pricing Rules
2. Thấy alert "Chỉ chủ khách sạn mới có quyền cài đặt"
3. Vẫn sử dụng được QR thanh toán (read-only)
```

