

## Kiểm tra toàn diện - Danh sách lỗi còn lại

Sau khi kiểm tra kỹ toàn bộ code, tôi phát hiện **6 lỗi** cần sửa:

---

### Bug 1: `onPaymentComplete` filter sai `b.room_id` thay vì `b.id` 🔴 CRITICAL

**File:** `GroupCheckoutDialog.tsx` line 1348

```
.filter(b => selectedRooms.has(b.room_id) && b.status === 'checked_in')
```

`selectedRooms` chứa **booking ID** (set từ line 167: `b.id`), nhưng filter so sánh `b.room_id`. Kết quả: **không booking nào match** → `bookingsToCalc` rỗng → costs không được recalculate sau payment → UI hiển thị số cũ.

**Sửa:** Đổi `b.room_id` thành `b.id`.

---

### Bug 2: `onPaymentComplete` dùng stale `groupData` + không tính overdue 🔴 CRITICAL

**File:** `GroupCheckoutDialog.tsx` line 1346-1365

Hai vấn đề:
1. Sau `refetchQueries`, `groupData` trong closure vẫn là giá trị cũ (React chưa re-render). `b.amount_paid` vẫn = 0.
2. Line 1355: `differenceInDays(new Date(b.check_out_date), new Date(b.check_in_date))` — không tính overdue nights (đã fix ở useEffect line 191-194 nhưng quên fix ở đây).

**Sửa:** Không recalculate ngay trong callback. Thay vào đó, thêm state flag `paymentJustCompleted`, rồi dùng useEffect watch `groupData` + flag để recalculate khi data mới nhất đã load.

---

### Bug 3: `RoomBookingDialog.performCheckOut` truyền `p_new_amount_paid: amountPaid` (giá trị cũ) 🟡 HIGH

**File:** `RoomBookingDialog.tsx` line 587

```
p_new_amount_paid: amountPaid,  // = state amountPaid cũ
```

Checkout bình thường (không phải Pay & Checkout) vẫn truyền `amountPaid` hiện tại. RPC sẽ SET `amount_paid = amountPaid` — đúng rồi nhưng cũng SET `payment_status` dựa trên giá trị này. Nếu user đã thanh toán partial qua BookingPaymentDialog trước, và sau đó checkout, giá trị `amountPaid` state có thể đã stale (lấy từ lúc mở dialog).

**Sửa:** Truyền `p_new_amount_paid: null` cho checkout bình thường (giữ nguyên `amount_paid` DB hiện tại). Chỉ truyền giá trị khi Pay & Checkout.

---

### Bug 4: `RoomBookingDialog.handleCheckOutClick` không fetch `items_consumed` 🟡 HIGH

**File:** `RoomBookingDialog.tsx` line 501-526

```
.select('items_lost, items_damaged')  // THIẾU items_consumed!
```

So sánh với `BookingsPage.tsx` line 597 và `onCheckoutNow` line 1346: đều fetch `items_consumed`. Nhưng `handleCheckOutClick` (checkout bình thường, không overdue) bỏ sót → không tính phí minibar/đồ dùng.

**Sửa:** Thêm `items_consumed` vào select và map tương tự.

---

### Bug 5: Webhook SePay dùng `total_amount` DB gốc cho group payment distribution 🟡 HIGH

**File:** `supabase/functions/sepay-webhook/index.ts` line 273-274

```
const totalAmount = booking.total_amount || 0
const owed = totalAmount - currentPaid
```

Webhook lấy `total_amount` từ DB — nếu booking quá hạn nhưng chưa checkout (total_amount chưa update), webhook sẽ tính `owed` sai. Tuy nhiên, nếu checkout đã xảy ra trước khi payment confirm, thì `total_amount` DB đã đúng vì `perform_checkout` RPC đã update.

Vấn đề thực tế: Khi user thanh toán TRƯỚC khi checkout (flow: Thu tiền → Kiểm tra phòng → Checkout), `total_amount` DB vẫn là giá gốc. Webhook phân phối sai.

**Sửa:** Khi tạo `booking_payments` cho group, lưu `roomCostsByBooking` vào `metadata` của payment record. Webhook đọc từ metadata thay vì DB.

---

### Bug 6: `GroupPaymentDialog` duplicate guest info trong DialogHeader 🟢 LOW

**File:** `GroupPaymentDialog.tsx` line 420-427

```
<DialogDescription>
  {groupData.guestName} • {groupData.roomCount} phòng
</DialogDescription>
{step === 'select' && (
  <p className="text-sm text-muted-foreground">
    {groupData.guestName} • {groupData.roomCount} phòng  ← TRÙNG!
  </p>
)}
```

Hiển thị tên khách 2 lần khi ở step `select`.

**Sửa:** Xóa `<p>` trùng lặp.

---

### Tóm tắt thay đổi

| # | Mức độ | File | Thay đổi |
|---|--------|------|----------|
| 1 | 🔴 | `GroupCheckoutDialog.tsx` L1348 | `b.room_id` → `b.id` |
| 2 | 🔴 | `GroupCheckoutDialog.tsx` L1340-1367 | Dùng useEffect + flag thay vì recalculate trong stale closure; tính overdue nights |
| 3 | 🟡 | `RoomBookingDialog.tsx` L587 | `p_new_amount_paid: null` cho checkout thường |
| 4 | 🟡 | `RoomBookingDialog.tsx` L501 | Thêm `items_consumed` vào fetch |
| 5 | 🟡 | `sepay-webhook/index.ts` L273 + `GroupPaymentDialog.tsx` | Lưu calculated totals vào metadata; webhook đọc từ metadata |
| 6 | 🟢 | `GroupPaymentDialog.tsx` L423-427 | Xóa `<p>` trùng lặp |

