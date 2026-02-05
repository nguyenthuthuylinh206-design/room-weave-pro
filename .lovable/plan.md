

## So sánh chức năng Checkout Lẻ vs Checkout Nhóm

### PHÂN TÍCH CHI TIẾT

Sau khi kiểm tra toàn bộ code của hai chức năng, tôi phát hiện **nhiều chức năng quan trọng của Checkout Lẻ đang THIẾU trong Checkout Nhóm**.

---

### BẢNG SO SÁNH CHỨC NĂNG

| Chức năng | Checkout Lẻ | Checkout Nhóm | Trạng thái |
|-----------|-------------|---------------|------------|
| **Kiểm tra phòng** | | | |
| Gán nhân viên kiểm tra | Có | Có | OK |
| Theo dõi trạng thái realtime | Có | Có | OK |
| Timer đếm thời gian kiểm tra | Có | Có | OK |
| Gọi Telegram nhân viên | Có | Có (qua InspectionStatusCard) | OK |
| Hủy yêu cầu kiểm tra | Có | Có | OK |
| | | | |
| **Tính phí checkout trễ** | | | |
| Hiển thị bảng tier (12-15, 15-18, 18+) | Có (LATE_CHECKOUT_TIERS UI) | **KHÔNG** | THIẾU |
| Điều chỉnh phí checkout trễ | Có | Có | OK |
| Nút "Miễn phí" | Có | Có | OK |
| Nút "Theo chuẩn" | Có | Có | OK |
| Nhập lý do điều chỉnh | Có | Có | OK |
| | | | |
| **Check-in sớm (Early Checkin)** | | | |
| Hiển thị phụ thu check-in sớm | Có | **KHÔNG** | THIẾU |
| | | | |
| **Checkout sớm (Early Checkout)** | | | |
| Nhận diện checkout sớm | Có (isEarlyCheckoutCase) | **KHÔNG** | THIẾU |
| Hiển thị thông báo "Không phụ thu" | Có (green box) | **KHÔNG** | THIẾU |
| | | | |
| **Booking theo giờ (Hourly)** | | | |
| Phí vượt giờ (hourlyOvertimeCharge) | Có - Hiển thị + điều chỉnh | Có (tính trong hook) | OK (logic), THIẾU UI |
| UI điều chỉnh phí vượt giờ | Có | **KHÔNG** | THIẾU |
| | | | |
| **Booking theo tháng (Monthly)** | | | |
| Hiển thị chiết khấu dài hạn | Có | **KHÔNG** | THIẾU |
| | | | |
| **Chi phí và thuế** | | | |
| Subtotal | Có | **KHÔNG** | THIẾU |
| VAT (thuế GTGT) | Có - Hiển thị khi > 0 | **KHÔNG** | THIẾU |
| Phí dịch vụ (Service Fee) | Có - Hiển thị khi > 0 | **KHÔNG** | THIẾU |
| | | | |
| **Phí đền bù (Damage)** | | | |
| Hiển thị danh sách đồ hỏng/mất | Có (DamageChargesSection) | Có (inline) | OK |
| Điều chỉnh từng item | Có | Có | OK |
| Nút miễn phí từng item | Có | **KHÔNG** | THIẾU |
| Nút reset từng item | Có | Có | OK |
| In biên bản xác nhận | Có (handlePrintReport) | **KHÔNG** | THIẾU |
| | | | |
| **Thanh toán** | | | |
| Hiển thị tiền cọc | Có | Có (logic phân bổ) | OK |
| Hiển thị đã thanh toán | Có | Có | OK |
| Hiển thị còn lại | Có | Có | OK |
| Cho trả phòng với nợ | Có | Có | OK |
| Thu tiền & Trả phòng | Có (BookingPaymentDialog) | Có (GroupPaymentDialog) | OK |
| | | | |
| **Giao diện** | | | |
| Thu nhỏ dialog (Minimize) | Có | Có | OK |
| Chi tiết thanh toán đầy đủ | Có | THIẾU nhiều dòng | THIẾU |

---

### CÁC CHỨC NĂNG THIẾU CẦN BỔ SUNG CHO GROUP CHECKOUT

#### 1. Bảng tier phụ thu checkout trễ (UI)
**Checkout lẻ** hiển thị bảng trực quan các mức phụ thu:
- Trước 12:00 → Miễn phí
- 12:00 - 15:00 → 30%
- 15:00 - 18:00 → 50%
- Sau 18:00 → 100%

**Group Checkout** chỉ hiển thị badge, không có bảng chi tiết.

#### 2. Nhận diện và hiển thị Checkout sớm
**Checkout lẻ** có logic `isEarlyCheckoutCase` để:
- Nhận diện khi khách trả phòng trước ngày dự kiến
- Hiển thị thông báo màu xanh "Checkout sớm - Không phụ thu"

**Group Checkout** không có logic này.

#### 3. Phụ thu Check-in sớm
**Checkout lẻ** hiển thị dòng "Phụ thu check-in sớm" nếu có.

**Group Checkout** không hiển thị.

#### 4. VAT và Phí dịch vụ
**Checkout lẻ** hiển thị:
```
Subtotal: xxx
VAT (10%): xxx
Phí dịch vụ (5%): xxx
TỔNG CỘNG: xxx
```

**Group Checkout** chỉ hiển thị Tiền phòng và Tổng, bỏ qua VAT/Phí dịch vụ.

#### 5. UI điều chỉnh phí vượt giờ (Hourly booking)
**Checkout lẻ** có UI riêng cho điều chỉnh phí vượt giờ với:
- Input chỉnh số tiền
- Nút "Miễn phí"

**Group Checkout** tính trong hook nhưng không có UI điều chỉnh riêng cho hourly.

#### 6. In biên bản xác nhận thiệt hại
**Checkout lẻ** có nút "In biên bản xác nhận" khi có đồ hỏng/mất.

**Group Checkout** không có.

#### 7. Chiết khấu dài hạn (Monthly booking)
**Checkout lẻ** hiển thị dòng "Chiết khấu dài hạn" nếu có.

**Group Checkout** không hiển thị.

---

### KẾ HOẠCH SỬA LỖI

#### Bước 1: Cập nhật GroupCheckoutConfirmDialog.tsx

Thêm các phần còn thiếu vào chi tiết từng phòng:

```typescript
// 1. Thêm nhận diện early checkout
const isEarlyCheckout = isEarlyCheckoutCase(actualDate, scheduledDate)

// 2. Thêm hiển thị bảng tier phụ thu (cho daily booking)
{room.bookingType === 'daily' && !isEarlyCheckout && (
  <div className="border rounded-lg overflow-hidden">
    <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
      PHỤ THU CHECK-OUT TRỄ
    </div>
    {LATE_CHECKOUT_TIERS.map(tier => (...))}
  </div>
)}

// 3. Thêm hiển thị checkout sớm
{isEarlyCheckout && (
  <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
    <span className="text-green-700">Checkout sớm - Không phụ thu</span>
  </div>
)}

// 4. Thêm phụ thu check-in sớm
{cost.costBreakdown.earlyCheckinCharge > 0 && (
  <div className="flex justify-between">
    <span>Phụ thu check-in sớm</span>
    <span>{formatVNCurrency(cost.costBreakdown.earlyCheckinCharge)}</span>
  </div>
)}

// 5. Thêm chiết khấu dài hạn (monthly)
{room.bookingType === 'monthly' && cost.costBreakdown.monthlyDiscount > 0 && (
  <div className="flex justify-between text-green-600">
    <span>Chiết khấu dài hạn</span>
    <span>-{formatVNCurrency(cost.costBreakdown.monthlyDiscount)}</span>
  </div>
)}
```

#### Bước 2: Cập nhật phần tổng hợp (Grand Totals)

```typescript
// Thêm VAT và phí dịch vụ vào totals
{totals.totalVat > 0 && (
  <div className="flex justify-between">
    <span>VAT</span>
    <span>{formatVNCurrency(totals.totalVat)}</span>
  </div>
)}

{totals.totalServiceFee > 0 && (
  <div className="flex justify-between">
    <span>Phí dịch vụ</span>
    <span>{formatVNCurrency(totals.totalServiceFee)}</span>
  </div>
)}
```

#### Bước 3: Thêm nút In biên bản

```typescript
// Trong CollapsibleContent khi có damage items
{cost.damageItems.length > 0 && (
  <Button variant="outline" size="sm" onClick={() => handlePrintReport(room)}>
    <Printer className="h-4 w-4 mr-1" />
    In biên bản
  </Button>
)}
```

#### Bước 4: Cập nhật useGroupCheckoutCalculations

Đảm bảo hook tính đủ các thông số:
- `earlyCheckinCharge`
- `monthlyDiscount`
- `vatRate`, `serviceFeeRate` (lấy từ booking hoặc pricing rules)

---

### FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `src/components/bookings/GroupCheckoutConfirmDialog.tsx` | Thêm UI: bảng tier, early checkout, early checkin, VAT, service fee, monthly discount, nút in biên bản |
| `src/hooks/useGroupCheckoutCalculations.ts` | Bổ sung tính earlyCheckinCharge, monthlyDiscount, lấy vatRate/serviceFeeRate từ booking |
| `src/components/bookings/GroupCheckoutDialog.tsx` | Có thể cần truyền thêm data như earlyCheckinCharge |

---

### KẾT QUẢ MONG ĐỢI

Sau khi sửa, GroupCheckoutConfirmDialog sẽ có đầy đủ các chức năng như CheckoutSummaryDialog:

```text
┌─────────────────────────────────────────────┐
│ Xác nhận Checkout Nhóm (3 phòng)            │
├─────────────────────────────────────────────┤
│ Giờ checkout: 14:30  [Phụ thu 30%]          │
├─────────────────────────────────────────────┤
│ ▼ P.101 - Nguyễn Văn A        +50.000 phụ   │
│   ┌── PHỤ THU CHECK-OUT TRỄ ──┐             │
│   │ ✓ 12:00-15:00  30%=50.000 │             │
│   │   15:00-18:00  50%        │             │
│   │   Sau 18:00    100%       │             │
│   └───────────────────────────┘             │
│   Phụ thu: [50000] đ [Miễn] [Chuẩn]         │
│   Phụ thu check-in sớm: 30.000đ             │
│   ───────────────────                       │
│   Đồ hỏng: Khăn tắm x1 = 15.000đ            │
│   [In biên bản]                             │
│   ───────────────────                       │
│   Tổng phòng: 215.000đ                      │
├─────────────────────────────────────────────┤
│ ▶ P.102 - Nguyễn Văn A        +0 phụ        │
│   [Checkout sớm - Không phụ thu]            │
├─────────────────────────────────────────────┤
│ Tiền phòng:        450.000đ                 │
│ Phụ thu trễ:       +50.000đ                 │
│ Phí đền bù:        +15.000đ                 │
│ ─────────────────────────────               │
│ Subtotal:          515.000đ                 │
│ VAT (10%):         51.500đ                  │
│ Phí dịch vụ (5%):  25.750đ                  │
│ ─────────────────────────────               │
│ TỔNG CỘNG:         592.250đ                 │
│ Đã thanh toán:     -200.000đ                │
│ Tiền cọc:          -100.000đ                │
│ ─────────────────────────────               │
│ CÒN LẠI:           292.250đ                 │
├─────────────────────────────────────────────┤
│ [Hủy] [Checkout (nợ)] [Thu tiền & Checkout] │
└─────────────────────────────────────────────┘
```

