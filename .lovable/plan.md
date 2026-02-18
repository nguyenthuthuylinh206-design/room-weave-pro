
## Fix: Lỗi lưu cài đặt thanh toán trong Super Admin

### Nguyên nhân gốc

Trong `BankPaymentSettings.tsx` (Super Admin), khi tạo mới (chưa có settings), code gọi `createMutation` với:

```typescript
hotel_id: '', // <= Gửi chuỗi rỗng "" vào cột UUID
tenant_id: '', // <= Gửi chuỗi rỗng "" vào cột UUID
```

Database column `hotel_id` và `tenant_id` có kiểu `uuid` (nullable). PostgreSQL **từ chối** chuỗi rỗng `""` vì nó không phải UUID hợp lệ — phải là `null` hoặc một UUID hợp lệ. Lỗi này đã được xác nhận trong Postgres logs:

```
ERROR: invalid input syntax for type uuid: ""
```

Ngoài ra, `useBankPaymentSettings()` được gọi **không có `hotelId`** trong component này (Super Admin context), nên query bị disabled (`enabled: !!hotelId = false`) — đồng nghĩa `settings` luôn là `undefined`, luôn đi vào nhánh **create** thay vì **update**.

### Các vấn đề cần fix

| # | Vấn đề | File |
|---|--------|------|
| 1 | `hotel_id: ''` và `tenant_id: ''` không phải UUID hợp lệ | `BankPaymentSettings.tsx` |
| 2 | `useBankPaymentSettings()` không có hotelId → không load được settings hiện tại | `BankPaymentSettings.tsx` |
| 3 | Super Admin cần hook riêng để query settings toàn cục (không filter theo hotel) | `useBankPaymentSettings.ts` |

### Giải pháp

**1. Tạo hook `useSuperAdminBankPaymentSettings`** trong `useBankPaymentSettings.ts`:

Query không filter theo hotel_id/tenant_id — lấy record đầu tiên (global settings của Super Admin):

```typescript
export function useSuperAdminBankPaymentSettings() {
  return useQuery({
    queryKey: ['bank-payment-settings', 'super-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .select('*')
        .is('hotel_id', null) // Super admin settings không có hotel_id
        .is('tenant_id', null)
        .maybeSingle();
      if (error) throw error;
      return data as BankPaymentSettings | null;
    },
  });
}
```

**2. Fix `BankPaymentSettings.tsx`**: 
- Dùng `useSuperAdminBankPaymentSettings()` thay vì `useBankPaymentSettings()`
- Khi create: gửi `hotel_id: null, tenant_id: null` thay vì `''`

```typescript
// Trước (lỗi):
hotel_id: '',   // UUID không hợp lệ
tenant_id: '',  // UUID không hợp lệ

// Sau (đúng):
hotel_id: null,   // null hợp lệ cho nullable UUID
tenant_id: null,
```

**3. Fix `useCreateBankPaymentSettings`** trong hook:

Khi `hotel_id` là null (Super Admin), không cần deactivate record cũ theo hotel:

```typescript
// Trước:
if (settings.hotel_id) {
  await supabase...update...eq('hotel_id', settings.hotel_id)
}

// Sau (thêm xử lý null):
if (settings.hotel_id) {
  await supabase...eq('hotel_id', settings.hotel_id)
} else {
  // Super admin: deactivate records không có hotel_id
  await supabase...is('hotel_id', null).is('tenant_id', null)
}
```

### Kết quả

- Super Admin có thể lưu cài đặt thanh toán ngân hàng mà không bị lỗi UUID
- Sau khi lưu, form hiển thị đúng dữ liệu đã lưu (load từ DB)
- Update cũng hoạt động bình thường (không tạo record trùng)
