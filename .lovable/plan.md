
## Kế hoạch: Sửa lỗi Thông báo bị trùng lặp

### I. NGUYÊN NHÂN GỐC

Edge function `send-push-notification` đang **TỰ ĐỘNG TẠO IN-APP NOTIFICATION** mỗi khi gửi push notification (lines 387-412).

Khi gửi thông báo checkout/cleaning request, code gọi **song song**:
1. `createMultipleNotifications()` → Tạo in-app notification
2. `sendMultiplePushNotifications()` → Edge function tạo **thêm** 1 in-app notification

**Kết quả:** Mỗi notification được tạo **2 lần** với metadata khác nhau.

**Bằng chứng từ Database:**
- "Báo cáo checkout phòng P102":
  - 16:26:31 - metadata: `{check_id, check_type, room_id}`
  - 16:26:33 - metadata: `{type, url}` (từ edge function)
- "Yêu cầu dọn phòng P102":
  - 16:26:17 - metadata: `{cleaning_priority, room_condition, ...}`
  - 16:26:20 - metadata: `{type, url}` (từ edge function)

---

### II. GIẢI PHÁP

**Loại bỏ code tự động tạo in-app notification trong edge function** `send-push-notification`.

Logic đã sai: Push notification và In-app notification là **2 kênh riêng biệt**, không nên gộp chung.

---

### III. CHI TIẾT THAY ĐỔI

**File:** `supabase/functions/send-push-notification/index.ts`

**Xóa đoạn code lines 387-412:**

```typescript
// XÓA TOÀN BỘ ĐOẠN NÀY:
// Create in-app notifications for each user
const notificationInserts = userIds.map(userId => {
  const sub = subscriptions.find((s: PushSubscriptionRow) => s.user_id === userId)
  return {
    tenant_id: sub?.tenant_id || payload.tenant_id,
    user_id: userId,
    title: payload.title,
    body: payload.body,
    type: payload.data?.type || 'info',
    action_url: payload.action_url,
    icon: payload.icon,
    metadata: payload.data || {},
  }
}).filter(n => n.tenant_id)

if (notificationInserts.length > 0) {
  const { error: notifError } = await supabase
    .from('in_app_notifications')
    .insert(notificationInserts)
  
  if (notifError) {
    console.error('Error inserting in-app notifications:', notifError)
  } else {
    console.log(`Created ${notificationInserts.length} in-app notifications`)
  }
}
```

---

### IV. TẠI SAO LOẠI BỎ THAY VÌ SỬA?

| Phương án | Ưu điểm | Nhược điểm |
|-----------|---------|------------|
| **Loại bỏ code** | Đơn giản, rõ ràng, tách biệt 2 kênh notification | Không có |
| Thêm flag `skipInApp` | Phức tạp, cần sửa nhiều nơi gọi | Khó maintain |
| Check duplicate trước khi insert | Tốn thêm query, logic phức tạp | Performance |

**Quyết định:** Loại bỏ code là giải pháp tốt nhất vì:
- Push notification và In-app notification nên được quản lý **độc lập**
- Tất cả các nơi gọi thông báo đã có logic tách biệt: gọi riêng `createMultipleNotifications()` và `sendMultiplePushNotifications()`
- Đảm bảo tính **single responsibility** của edge function

---

### V. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `supabase/functions/send-push-notification/index.ts` | Xóa lines 387-412 (tự động tạo in-app notification) |

---

### VI. TESTING CHECKLIST

1. Thực hiện checkout phòng, kiểm tra chỉ tạo **1 notification** "Báo cáo checkout"
2. Tạo cleaning request, kiểm tra chỉ tạo **1 notification** "Yêu cầu dọn phòng"
3. Push notification vẫn hoạt động bình thường
4. In-app notification vẫn có đầy đủ metadata (check_id, room_id, v.v.)
5. Query database để confirm không còn duplicate:
   ```sql
   SELECT title, COUNT(*) 
   FROM in_app_notifications 
   WHERE created_at > NOW() - INTERVAL '1 hour' 
   GROUP BY title, body 
   HAVING COUNT(*) > 1
   ```

---

### VII. CLEAN UP (SAU KHI SỬA)

Xóa các notification trùng lặp cũ trong database:

```sql
-- Xóa notification trùng (giữ lại record có metadata đầy đủ hơn)
DELETE FROM in_app_notifications 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id, title, body, DATE_TRUNC('minute', created_at)
             ORDER BY 
               CASE WHEN metadata::text != '{}' THEN 0 ELSE 1 END,
               created_at ASC
           ) as rn
    FROM in_app_notifications
    WHERE created_at > NOW() - INTERVAL '7 days'
  ) t
  WHERE rn > 1
);
```
