

## Kế hoạch: Hoàn thiện các phần chưa triển khai

### I. CÁC TÍCH HỢP CẦN HOÀN THIỆN

#### Bước 1: Tích hợp ChargeableItemsStep vào RoomCheckPage

**File cần sửa:** `src/pages/rooms/RoomCheckPage.tsx`

**Thay đổi:**
1. Import `ChargeableItemsStep` component
2. Thêm state để lưu danh sách chargeable items đã chọn
3. Hiển thị `ChargeableItemsStep` như 1 section trong step kiểm tra (chỉ với checkout)
4. Khi submit room check, lưu chargeable items vào database
5. Gọi `notify-chargeable` edge function nếu có đồ tính phí

```typescript
// Trong RoomCheckPage.tsx
import { ChargeableItemsStep } from '@/components/rooms/check-steps/ChargeableItemsStep'
import { useCreateMultipleChargeableConsumptions } from '@/hooks/useChargeableConsumptions'

// State mới
const [chargeableItems, setChargeableItems] = useState([])
const createChargeableConsumptions = useCreateMultipleChargeableConsumptions()

// Khi submit checkout
if (formData.check_type === 'checkout' && chargeableItems.length > 0) {
  await createChargeableConsumptions.mutateAsync(chargeableItems)
  // Trigger notification
  await supabase.functions.invoke('notify-chargeable', {
    body: { bookingId, roomId, items: chargeableItems }
  })
}
```

#### Bước 2: Hiển thị ChargeableConsumablesCard trong BookingDetailPage

**File cần sửa:** `src/pages/bookings/BookingDetailPage.tsx`

**Thay đổi:**
1. Import `ChargeableConsumablesCard`
2. Thêm vào phần tabs hoặc section riêng
3. Chỉ hiển thị khi booking có phụ thu

```typescript
import { ChargeableConsumablesCard } from '@/components/bookings/ChargeableConsumablesCard'

// Trong render
<ChargeableConsumablesCard 
  bookingId={booking.id} 
  showBillAction={booking.status !== 'checked_out'}
/>
```

#### Bước 3: Trigger notification khi ghi nhận đồ tính phí

**File cần sửa:** `src/hooks/useChargeableConsumptions.ts`

**Thay đổi:** Gọi edge function trong `onSuccess` của mutation

```typescript
onSuccess: async (data) => {
  // ... existing code ...
  
  // Trigger notification
  if (data && data.length > 0) {
    try {
      await supabase.functions.invoke('notify-chargeable', {
        body: {
          bookingId: data[0].booking_id,
          roomId: data[0].room_id,
          items: data.map(d => ({
            name: d.item_name,
            quantity: d.quantity,
            amount: d.total_amount
          })),
          totalAmount: data.reduce((sum, d) => sum + d.total_amount, 0)
        }
      })
    } catch (e) {
      console.error('Failed to send chargeable notification:', e)
    }
  }
}
```

### II. KIỂM TRA VÀ BỔ SUNG

#### Bước 4: Kiểm tra pg_cron cho cleanup-sessions

**Kiểm tra:** Query database xem cron job đã được thiết lập chưa

```sql
SELECT * FROM cron.job WHERE jobname LIKE '%cleanup%';
```

**Nếu chưa có:** Tạo migration thêm cron job

```sql
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '*/30 * * * *', -- Mỗi 30 phút
  $$SELECT net.http_post(
    url:='https://ehjtoajnlnuvuiwkpmbp.supabase.co/functions/v1/cleanup-sessions',
    headers:='{"Authorization": "Bearer ' || current_setting('supabase.service_role_key') || '"}'::jsonb
  )$$
);
```

### III. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/pages/rooms/RoomCheckPage.tsx` | Tích hợp ChargeableItemsStep vào checkout flow |
| `src/pages/bookings/BookingDetailPage.tsx` | Hiển thị ChargeableConsumablesCard |
| `src/hooks/useChargeableConsumptions.ts` | Trigger notify-chargeable sau khi ghi nhận |
| `supabase/migrations/xxx.sql` | Thiết lập pg_cron job (nếu chưa có) |

### IV. KẾT QUẢ SAU TRIỂN KHAI

1. Nhân viên checkout có thể ghi nhận đồ tính phí trực tiếp trong flow
2. Thông báo realtime gửi đến Receptionist/Manager khi có phụ thu
3. Booking detail hiển thị rõ ràng các khoản phụ thu
4. Cleanup sessions chạy tự động mỗi 30 phút

