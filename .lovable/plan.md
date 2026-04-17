

## Đợt 3 bổ sung + sót Đợt 2 — Phương án AN TOÀN TUYỆT ĐỐI cho dữ liệu

### Nguyên tắc
Bạn lo cắt cột `select('*')` có thể làm mất field → component vỡ hoặc tính toán sai (giá tiền, công nợ, trạng thái phòng). **Mình loại bỏ hoàn toàn rủi ro đó** bằng cách KHÔNG đụng vào select ở các hook tài chính/booking nhạy cảm.

---

### Phạm vi điều chỉnh (so với plan trước)

**❌ BỎ (vì rủi ro dữ liệu):**
- ~~Cắt `select('*')` ở `useBookings.ts`~~ — liên quan tiền/checkout, không động
- ~~Cắt `select('*')` ở `useBookingPayments.ts`~~ — tài chính, không động
- ~~Cắt `select('*')` ở `useRoomChecks.ts`~~ — items_lost/damaged ảnh hưởng kho + tính phí
- ~~Cắt `select('*')` ở `useMaintenanceRequests.ts`~~ — giữ nguyên
- ~~Cắt `select('*')` ở `useUnifiedTasks.ts`~~ — giữ nguyên
- ~~Server-side pagination `BookingsPage`~~ — đụng query logic phức tạp, dễ sai bộ lọc
- ~~Tách hook list/detail~~ — tăng complexity, dễ regression

**✅ GIỮ (an toàn 100%, KHÔNG đổi data shape):**

**1. Sót Đợt 2 — A1: `SubscriptionPaymentPage.tsx`**
- CHỈ thêm filter `tenant_id=eq.${tenantId}` vào channel hiện có
- Không đụng query, không đổi data
- Rủi ro: 0 (chỉ giảm event nhận về, query vẫn fetch full)

**2. Sót Đợt 2 — A2: `GroupCheckoutDialog`**
- Bỏ `refetchInterval: 10s`
- Thêm realtime subscription `booking_payments` filter theo `booking_id IN (...)` của group
- onMount: invalidate 1 lần để fetch snapshot mới
- Khi tab visible trở lại: invalidate
- Rủi ro: 0 — vẫn dùng cùng query, chỉ đổi trigger refetch

**3. Chỉ cắt `select('*')` ở 1 hook DUY NHẤT — `useNotifications.ts`**
- Notification list KHÔNG ảnh hưởng tài chính/kho
- Trước khi cắt: grep mọi `notification.field` để liệt kê field đang dùng
- Giữ TẤT CẢ field đang được component đọc, chỉ bỏ cột `data` (JSON lớn) **NẾU** không có usage
- Nếu có bất kỳ usage nào → giữ nguyên `select('*')`, bỏ qua hook này luôn
- Rủi ro: cực thấp (đã grep + chỉ là notification)

### Quy trình bảo vệ dữ liệu

Trước mỗi thay đổi:
1. **Grep usage** field trên toàn project
2. Nếu có ≥1 usage không chắc chắn → **giữ nguyên select**, không cắt
3. Sau khi sửa → đọc lại file để đảm bảo type vẫn khớp
4. Không tách hook, không đổi shape return

### Ảnh hưởng dữ liệu (cuối cùng)

| Khu vực | Trước | Sau | Rủi ro |
|---|---|---|---|
| Subscription payment realtime | nhận event mọi tenant | chỉ tenant mình | 0 — chỉ chính xác hơn |
| GroupCheckoutDialog | poll 10s | realtime + invalidate on resume | 0 — cùng query, nhanh hơn |
| Notifications select | full `*` | bỏ cột `data` nếu không dùng | thấp (đã grep) |
| Bookings/Payments/RoomChecks/Maintenance/Tasks | full `*` | **giữ nguyên** | 0 |
| Server pagination | — | **không đổi** | 0 |

### Kết quả
- 2 sót Đợt 2 được vá → realtime sạch + giảm DB query
- Tất cả flow tài chính/booking/kho/nhiệm vụ: **không đổi 1 byte logic nào**
- An toàn dữ liệu: tuyệt đối

### Phạm vi file
- `src/pages/.../SubscriptionPaymentPage.tsx`
- `src/components/.../GroupCheckoutDialog.tsx`
- `src/hooks/useNotifications.ts` (chỉ khi grep an toàn, nếu không thì skip)

