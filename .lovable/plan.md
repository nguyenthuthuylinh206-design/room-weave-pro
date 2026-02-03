
## Kế hoạch: Hoàn thiện UX/UI Thanh toán Nhóm & Checkout Nhóm

### PHÂN TÍCH TÌNH TRẠNG HIỆN TẠI

| Thành phần | Tình trạng | Vấn đề UX/UI |
|-----------|------------|--------------|
| **GroupPaymentDialog** | ✅ Có | Dialog quá dài, khó đọc. Thiếu visual hierarchy. |
| **Nút TT Nhóm** | ✅ Có | Chỉ hiển thị khi `checked_in`, không rõ ràng |
| **Badge nhóm** | ✅ Có | Nhỏ, khó nhận biết. Không có tooltip |
| **Checkout Nhóm** | ❌ Chưa có | Phải checkout từng phòng riêng lẻ |
| **Tổng hợp thanh toán** | ❌ Thiếu | Không có overview tất cả phòng trước checkout |

---

### CÁC VẤN ĐỀ CỤ THỂ CẦN SỬA

#### 1. **GroupPaymentDialog - UX Issues**

**Vấn đề hiện tại:**
- Danh sách phòng chiếm nhiều không gian với thông tin lặp lại
- Không có indicator rõ ràng phòng nào đã/chưa thanh toán
- Nút thanh toán nhỏ, không nổi bật
- Thiếu quick actions (thanh toán đủ 1 click)
- Thiếu hiển thị số tiền còn lại của từng phòng theo cách trực quan

**Giải pháp:**
- Compact room list với progress bar thay vì danh sách dài
- Quick buttons: "Thanh toán đủ", "Thanh toán nửa"
- Visual indicator rõ ràng hơn cho trạng thái thanh toán

#### 2. **BookingsPage - Badge & Buttons**

**Vấn đề hiện tại:**
- Badge nhóm quá nhỏ (`text-[10px]`)
- Nút "TT Nhóm" chỉ xuất hiện khi `checked_in`
- Không có visual grouping cho các phòng cùng nhóm
- Thiếu tooltip giải thích

**Giải pháp:**
- Badge rõ hơn với màu nền nhẹ
- Nút TT Nhóm hiển thị cho cả `confirmed` và `checked_in`
- Thêm tooltip cho badge
- Highlight row khi hover vào nhóm

#### 3. **Group Checkout - Chưa có**

**Vấn đề:**
- Phải checkout từng phòng riêng lẻ
- Không có overview tổng hợp damage/late charges của cả nhóm
- Mỗi phòng phải chờ inspection riêng

**Giải pháp:**
- Tạo `GroupCheckoutDialog` mới
- Tổng hợp tất cả damage charges
- Cho phép checkout batch sau khi tất cả phòng đã được inspect
- Thanh toán gộp rồi checkout

---

### KẾ HOẠCH THỰC HIỆN

#### Phase 1: Cải thiện GroupPaymentDialog

| File | Thay đổi |
|------|----------|
| `GroupPaymentDialog.tsx` | Redesign compact hơn, thêm quick actions |

**Chi tiết UI mới:**

```text
┌────────────────────────────────────────────────────┐
│  💳 Thanh toán nhóm                               X│
│  Nguyễn Văn A • 3 phòng                            │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ 101 Superior    ████████████░░░░░░ 67%      │  │
│  │ 1.200k / 1.800k                  [Đang ở]   │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 102 Deluxe      ██████████████████ 100%    │  │
│  │ 2.000k / 2.000k                  [Đã TT ✓] │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 103 Suite       ░░░░░░░░░░░░░░░░░░ 0%      │  │
│  │ 0k / 3.000k                      [Đang ở]  │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  ─────────────────────────────────────────────────│
│  Tổng:         6.800.000đ                         │
│  Đã thanh toán: 3.200.000đ                        │
│  ═══════════════════════════════════════════════  │
│  CÒN LẠI:      3.600.000đ                         │
│  ─────────────────────────────────────────────────│
│                                                    │
│  [Thanh toán đủ 3.600.000đ]  ← Primary button     │
│                                                    │
│  Hoặc nhập số tiền:                               │
│  ┌───────────────────────┐                        │
│  │ 1.800.000            │ [50%] [Tùy chỉnh]      │
│  └───────────────────────┘                        │
│                                                    │
│  ○ Tiền mặt    ● Chuyển khoản                     │
│                                                    │
│  [ Tạo mã QR thanh toán ]                         │
└────────────────────────────────────────────────────┘
```

**Các cải tiến:**
- Progress bar visual cho từng phòng
- Quick amount buttons (50%, 100%)
- Primary CTA rõ ràng "Thanh toán đủ X đ"
- Compact room cards thay vì detailed cards

---

#### Phase 2: Cải thiện Badge & Actions trong BookingsPage

| File | Thay đổi |
|------|----------|
| `BookingsPage.tsx` | Badge lớn hơn, tooltip, nút cho nhiều status |

**Chi tiết:**

```tsx
// Badge nhóm cải tiến
{booking.booking_group_id && groupCounts && groupCounts[booking.booking_group_id] > 1 && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="secondary" 
          className="text-xs px-2 py-0.5 cursor-help bg-blue-100 text-blue-700 border-blue-200"
        >
          <Users className="h-3 w-3 mr-1" />
          Nhóm {groupCounts[booking.booking_group_id]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Đặt phòng nhóm với {groupCounts[booking.booking_group_id]} phòng</p>
        <p className="text-xs text-muted-foreground">Bấm "TT Nhóm" để thanh toán chung</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

```tsx
// Nút TT Nhóm cho cả confirmed và checked_in
{booking.booking_group_id && 
 groupCounts && 
 groupCounts[booking.booking_group_id] > 1 && 
 ['confirmed', 'checked_in'].includes(booking.status) && (
  <Button
    type="button"
    size="sm"
    variant="outline"
    className="h-7 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
    onClick={() => {
      setSelectedGroupId(booking.booking_group_id!)
      setShowGroupPaymentDialog(true)
    }}
  >
    <Wallet className="h-3 w-3 mr-1" />
    TT Nhóm
  </Button>
)}
```

---

#### Phase 3: Tạo GroupCheckoutDialog (Tính năng mới)

| File | Thay đổi |
|------|----------|
| `GroupCheckoutDialog.tsx` | **MỚI** - Dialog checkout nhóm |
| `BookingsPage.tsx` | Thêm nút "Checkout Nhóm" |

**Mockup UI:**

```text
┌─────────────────────────────────────────────────────┐
│  🚪 Checkout nhóm - Nguyễn Văn A (3 phòng)         X│
├─────────────────────────────────────────────────────┤
│                                                     │
│  KIỂM TRA PHÒNG                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ P.101 │ ✓ Đã kiểm tra    │ Phí: 0đ          │  │
│  ├──────────────────────────────────────────────┤  │
│  │ P.102 │ ⏳ Đang kiểm tra  │ 2:35             │  │
│  ├──────────────────────────────────────────────┤  │
│  │ P.103 │ ○ Chưa kiểm tra  │ [Gửi yêu cầu]    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  TỔNG HỢP PHÍ PHÁT SINH                            │
│                                                     │
│  Phí checkout muộn:                                 │
│  • P.101: 200.000đ (14:30)                         │
│  • P.102: 150.000đ (14:15)                         │
│  • P.103: 0đ (đúng giờ)                            │
│  Tổng muộn: 350.000đ                               │
│                                                     │
│  Phí đền bù thiệt hại:                             │
│  • P.101: Khăn mặt (2) - 100.000đ                  │
│  • P.102: Không có                                  │
│  • P.103: Đang chờ kiểm tra...                     │
│  Tổng đền bù: 100.000đ                             │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  THANH TOÁN                                         │
│  Tổng tiền phòng:      6.800.000đ                  │
│  Phí phát sinh:          450.000đ                  │
│  Đã thanh toán:       -3.200.000đ                  │
│  ═══════════════════════════════════════════════   │
│  CẦN THU:              4.050.000đ                  │
│                                                     │
│  ⚠️ Còn 1 phòng chưa kiểm tra xong                 │
│                                                     │
│  [Thu nhỏ]  [Thanh toán & Checkout tất cả]         │
└─────────────────────────────────────────────────────┘
```

**Logic:**
1. Hiển thị trạng thái kiểm tra của tất cả phòng trong nhóm
2. Cho phép gửi yêu cầu kiểm tra cho phòng chưa có
3. Tổng hợp late checkout charges từ tất cả phòng
4. Tổng hợp damage charges từ tất cả phòng
5. Khi tất cả đã kiểm tra → Cho phép thanh toán và checkout batch
6. Có nút "Thu nhỏ" để xử lý khách khác trong lúc chờ

---

### CHI TIẾT FILES CẦN SỬA

| File | Loại | Mô tả |
|------|------|-------|
| `src/components/bookings/GroupPaymentDialog.tsx` | Sửa | Redesign compact, quick actions |
| `src/pages/bookings/BookingsPage.tsx` | Sửa | Badge lớn hơn, tooltip, nút cho nhiều status |
| `src/components/bookings/GroupCheckoutDialog.tsx` | **MỚI** | Dialog checkout nhóm tổng hợp |
| `src/hooks/useGroupBooking.ts` | Sửa | Thêm fields cho checkout (late charges, damage, inspection status) |

---

### THỨ TỰ ƯU TIÊN

| Ưu tiên | Công việc | Lý do |
|---------|-----------|-------|
| 1 | Cải thiện GroupPaymentDialog | Impact cao, thay đổi nhỏ |
| 2 | Cải thiện Badge & Buttons | Dễ nhận biết hơn |
| 3 | Tạo GroupCheckoutDialog | Tính năng mới, phức tạp hơn |

---

### KẾT QUẢ MONG ĐỢI

| Metric | Trước | Sau |
|--------|-------|-----|
| Thao tác thanh toán nhóm | 5-6 bước | 2-3 bước |
| Thời gian checkout 3 phòng | 3x đơn lẻ | 1 lần gộp |
| Nhận biết booking nhóm | Khó thấy | Rõ ràng |
| Tổng hợp phí phát sinh | Không có | Có dashboard |

---

### GHI CHÚ KỸ THUẬT

- Giữ nguyên logic thanh toán đã có, chỉ cải thiện UI
- GroupCheckoutDialog cần tích hợp với `useCheckoutInspection` hiện có
- Tái sử dụng `MinimizedCheckoutWidget` pattern cho group checkout
- RPC `perform_group_checkout` sẽ cần thêm nếu triển khai Phase 3
