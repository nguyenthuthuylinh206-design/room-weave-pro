

## Kế hoạch: Bổ sung đồng bộ thông báo cho Group Checkout

### VẤN ĐỀ ĐÃ XÁC ĐỊNH

Sau khi phân tích code và database, tôi tìm thấy **2 vấn đề chính**:

---

### VẤN ĐỀ 1: Thiếu Realtime Subscription

**Hiện trạng:** `GroupCheckoutDialog` chỉ dùng `refetchInterval: 10000` (polling mỗi 10 giây) - KHÔNG có realtime subscription để theo dõi thay đổi status của inspection requests.

**So sánh:**
| Component | Realtime | Cơ chế |
|-----------|----------|--------|
| Checkout lẻ (`useCheckoutInspection`) | ✅ Có | `supabase.channel().on('postgres_changes')` |
| Group Checkout (`GroupCheckoutDialog`) | ❌ Không | Chỉ có polling 10s |

**Kết quả:** Khi NV Linh bắt đầu/hoàn thành kiểm tra phòng, UI của GroupCheckoutDialog không cập nhật ngay lập tức.

---

### VẤN ĐỀ 2: Thiếu Thông báo Ngược (Reverse Notification)

**Hiện trạng:** Khi gửi yêu cầu kiểm tra → có thông báo đến nhân viên ✅

Nhưng khi nhân viên **BẮT ĐẦU** hoặc **HOÀN THÀNH** kiểm tra → **KHÔNG có thông báo ngược** cho lễ tân/quản lý ❌

**Flow hiện tại:**
```text
Quản lý → [Gửi yêu cầu] → [Push/InApp/Telegram] → NV Linh
NV Linh → [Bắt đầu kiểm tra] → ❌ Không thông báo cho Quản lý
NV Linh → [Hoàn thành] → ❌ Không thông báo cho Quản lý
```

---

### GIẢI PHÁP

#### 1. Thêm Realtime Subscription vào GroupCheckoutDialog

```typescript
// Thêm useEffect để subscribe realtime changes
useEffect(() => {
  if (!groupData?.bookings || !open) return
  
  const bookingIds = groupData.bookings.map(b => b.id)
  
  const channel = supabase
    .channel(`group-inspections-${bookingGroupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'checkout_inspection_requests',
        filter: `booking_id=in.(${bookingIds.join(',')})`,
      },
      (payload) => {
        console.log('[GroupCheckout Realtime] Inspection changed:', payload)
        refetchInspections()
        // Invalidate cost calculations if needed
        queryClient.invalidateQueries({ queryKey: ['group-inspections', bookingGroupId] })
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}, [groupData?.bookings, bookingGroupId, open, refetchInspections, queryClient])
```

#### 2. Thêm Thông báo Ngược khi Nhân viên Bắt đầu/Hoàn thành

Cập nhật `useCheckoutInspection.ts` - hàm `startInspection`:

```typescript
// Trong onSuccess của startInspection
onSuccess: (data) => {
  // ... existing code ...
  
  // THÊM: Gửi thông báo cho người yêu cầu
  if (data && pendingInspection?.requested_by) {
    const roomNumber = pendingInspection.room?.room_number || ''
    const staffName = user?.full_name || 'Nhân viên'
    
    sendTelegramNotification({
      tenantId: user?.tenantId,
      hotelId: pendingInspection.hotel_id,
      userIds: [pendingInspection.requested_by],
      title: `🔄 Đang kiểm tra phòng ${roomNumber}`,
      message: `${staffName} đã bắt đầu kiểm tra phòng.`,
      notificationType: 'checkout',
    })
    
    createInAppNotification({
      userId: pendingInspection.requested_by,
      tenantId: user?.tenantId,
      title: `Đang kiểm tra phòng ${roomNumber}`,
      body: `${staffName} đã bắt đầu kiểm tra phòng.`,
      type: 'room_checkout',
    })
  }
}
```

Tương tự cho khi hoàn thành kiểm tra (trong `RoomCheckPage` sau khi submit).

---

### FILES CẦN THAY ĐỔI

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/components/bookings/GroupCheckoutDialog.tsx` | Thêm realtime subscription cho checkout_inspection_requests |
| 2 | `src/hooks/useCheckoutInspection.ts` | Thêm reverse notifications trong `startInspection` |
| 3 | `src/pages/RoomCheckPage.tsx` | Thêm thông báo cho `requested_by` khi hoàn thành checkout check |

---

### KẾT QUẢ MONG ĐỢI

**Sau khi sửa:**

| Sự kiện | Trước | Sau |
|---------|-------|-----|
| Gửi yêu cầu kiểm tra | ✅ NV nhận thông báo | ✅ Giữ nguyên |
| NV bắt đầu kiểm tra | ❌ Không thông báo | ✅ Quản lý nhận Telegram + In-app |
| NV hoàn thành kiểm tra | ❌ Không thông báo | ✅ Quản lý nhận Telegram + In-app |
| UI GroupCheckout | ❌ Cập nhật chậm (10s) | ✅ Cập nhật realtime |

**Flow sau khi sửa:**
```text
Quản lý → [Gửi yêu cầu] → [Push/InApp/Telegram] → NV Linh
NV Linh → [Bắt đầu] → [InApp/Telegram] → Quản lý
           ↓
   [Realtime] → UI GroupCheckout cập nhật ngay
           ↓
NV Linh → [Hoàn thành] → [InApp/Telegram] → Quản lý
           ↓
   [Realtime] → UI GroupCheckout hiển thị ✅ Hoàn thành
```

