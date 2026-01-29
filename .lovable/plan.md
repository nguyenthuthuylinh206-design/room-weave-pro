
## Kế hoạch: Sửa lỗi QR không đúng cho từng khách sạn

### I. NGUYÊN NHÂN

**Vấn đề phát hiện:**

Trong `PaymentQRPage.tsx`:
```typescript
const paymentHotelId = payment?.hotel_id;
const { data: bankSettings } = useBankPaymentSettings(paymentHotelId);
```

Và trong `useBankPaymentSettings`:
```typescript
export function useBankPaymentSettings(hotelId?: string) {
  return useQuery({
    queryKey: ['bank-payment-settings', hotelId],
    queryFn: async () => {
      let query = supabase
        .from('bank_payment_settings')
        .select('*')
        .eq('is_active', true);

      if (hotelId) {
        query = query.eq('hotel_id', hotelId);  // CHỈ FILTER KHI CÓ hotelId
      }
      // NẾU hotelId = undefined → TRẢ VỀ BẤT KỲ ACTIVE SETTINGS NÀO!
      
      const { data, error } = await query.limit(1).maybeSingle();
      return data;
    },
    // KHÔNG CÓ enabled check → chạy ngay cả khi hotelId = undefined
  });
}
```

**Kịch bản lỗi:**
1. Khi `PaymentQRPage` mount, `payment = undefined` → `paymentHotelId = undefined`
2. Hook `useBankPaymentSettings(undefined)` fetch **bất kỳ** active settings (không filter hotel_id)
3. Có thể trả về settings của hotel khác (ví dụ: tài khoản `030380171013` thay vì `0866158977`)
4. Sau khi `payment` load xong, query với đúng `hotelId` nhưng có thể cache cũ vẫn được dùng

---

### II. GIẢI PHÁP

#### A. Sửa hook `useBankPaymentSettings`

**Thay đổi:**
- Thêm `enabled: !!hotelId` để chỉ chạy query khi có hotelId
- Đảm bảo không trả về settings sai khi chưa có hotelId

```typescript
export function useBankPaymentSettings(hotelId?: string) {
  return useQuery({
    queryKey: ['bank-payment-settings', hotelId],
    queryFn: async () => {
      // Nếu không có hotelId, không query
      if (!hotelId) return null;
      
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .select('*')
        .eq('is_active', true)
        .eq('hotel_id', hotelId)
        .maybeSingle();

      if (error) throw error;
      return data as BankPaymentSettings | null;
    },
    enabled: !!hotelId,  // CHỈ CHẠY KHI CÓ hotelId
  });
}
```

#### B. Sửa `PaymentQRPage.tsx`

**Thay đổi loading logic:**
- Đảm bảo chờ cả payment data VÀ bank settings
- Không show QR sai trong khi đang load

```typescript
// Fetch payment trước
const { data: payment, isLoading: paymentLoading, error } = usePaymentById(
  shouldFetchData && sessionChecked ? paymentId : undefined
);

// Lấy hotelId từ payment - CHỈ KHI CÓ DATA
const paymentHotelId = payment?.hotel_id;

// Fetch bank settings - CHỈ KHI CÓ hotelId từ payment
const { data: bankSettings, isLoading: bankLoading } = useBankPaymentSettings(paymentHotelId);

// Loading: chờ cả payment VÀ bank settings load xong
if (paymentLoading || (payment && bankLoading)) {
  return <LoadingState />;
}
```

---

### III. TÓM TẮT FILE THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/hooks/useBankPaymentSettings.ts` | Thêm `enabled: !!hotelId`, luôn filter theo `hotel_id` |
| `src/pages/payment/PaymentQRPage.tsx` | Cải thiện loading logic |

---

### IV. LỢI ÍCH

1. **Đúng QR cho đúng hotel**: Mỗi khách sạn hiển thị đúng tài khoản ngân hàng đã cấu hình
2. **Không fetch sai data**: Query chỉ chạy khi có đủ thông tin cần thiết
3. **UX tốt hơn**: Loading state rõ ràng, không flash QR sai

---

### V. CHI TIẾT KỸ THUẬT

**Hook sửa đổi:**
```typescript
// src/hooks/useBankPaymentSettings.ts
export function useBankPaymentSettings(hotelId?: string) {
  return useQuery({
    queryKey: ['bank-payment-settings', hotelId],
    queryFn: async () => {
      if (!hotelId) return null;
      
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .select('*')
        .eq('is_active', true)
        .eq('hotel_id', hotelId)
        .maybeSingle();

      if (error) throw error;
      return data as BankPaymentSettings | null;
    },
    enabled: !!hotelId,
  });
}
```

**PaymentQRPage sửa đổi:**
```typescript
// Đảm bảo loading đúng sequence
const isLoading = paymentLoading || (payment && !bankSettings && bankLoading);
```
