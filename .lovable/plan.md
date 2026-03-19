

## Cải thiện giao diện Checkout cho lễ tân

### Vấn đề hiện tại
Dialog checkout hiện tại là một danh sách dài, mọi thứ trộn lẫn: thông tin khách, kiểm tra phòng, bảng phụ thu, chi tiết thanh toán, cảnh báo — tất cả cuộn trong 1 dialog nhỏ. Lễ tân khó nắm nhanh tình trạng.

### Giải pháp: Chia thành các Card rõ ràng + Visual hierarchy

**1. Header Card — Thông tin khách & phòng**
- Nền màu nhạt, font lớn: tên khách, số phòng, giờ checkout
- Badge trạng thái rõ ràng (đúng giờ = xanh, trễ = vàng/đỏ)
- Bỏ layout `flex justify-between` nhỏ → dùng card nổi bật

**2. Inspection Card — Kiểm tra phòng**
- Card riêng biệt với border màu theo trạng thái
- Trạng thái lớn, dễ đọc (icon + text)
- Nút hành động (Gọi Telegram, Hủy) rõ ràng hơn

**3. Phụ thu Card — Late checkout / Overtime**
- Giữ nguyên logic nhưng giao diện gọn hơn
- Chỉ hiện tier đang áp dụng (collapse các tier khác)
- Input điều chỉnh inline rõ ràng hơn

**4. Chi tiết thanh toán Card**
- Dùng Accordion/Collapsible cho dịch vụ & đồ hỏng/mất
- Tổng cộng + Còn lại luôn hiển thị nổi bật ở cuối
- Số tiền lớn, font mono, màu đỏ/xanh rõ ràng

**5. Footer Actions — Sticky**
- Nút thanh toán/checkout sticky ở dưới dialog
- Cảnh báo nợ nhỏ gọn, tích hợp vào nút

### Chi tiết thay đổi

| File | Thay đổi |
|------|----------|
| `CheckoutSummaryDialog.tsx` | Redesign layout: chia sections thành cards với heading, spacing, visual hierarchy rõ ràng. Collapse late checkout tiers (chỉ show active). Sticky footer. Tổng cộng/Còn lại font lớn nổi bật. Accordion cho dịch vụ chi tiết. |

### Thiết kế cụ thể

```text
┌─────────────────────────────────┐
│ ✕                    [Thu nhỏ]  │
│                                 │
│ ┌─ INFO CARD ────────────────┐  │
│ │ 👤 Nguyễn Đức Phước       │  │
│ │ 🏠 P.105   ⏰ 09:30       │  │
│ │ ✅ Checkout đúng giờ       │  │
│ └────────────────────────────┘  │
│                                 │
│ ┌─ KIỂM TRA PHÒNG ──────────┐  │
│ │ 🔄 Đang chờ kiểm tra      │  │
│ │ NV: Linh  |  22:56 12/03  │  │
│ │ [Gọi Telegram] [Hủy]      │  │
│ └────────────────────────────┘  │
│                                 │
│ ┌─ THANH TOÁN ───────────────┐  │
│ │ Tiền phòng    71.400.000 ₫│  │
│ │ ▸ Dịch vụ        400.000 ₫│  │
│ │ ▸ Phí phụ thu    250.000 ₫│  │
│ │ [In biên bản]              │  │
│ │ ─────────────────────────  │  │
│ │ Subtotal      72.050.000 ₫│  │
│ │ VAT 8%         5.764.000 ₫│  │
│ │ Phí DV 5%      3.602.500 ₫│  │
│ │━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│ │ TỔNG CỘNG    81.416.500 ₫ │  │
│ │ CÒN LẠI     81.416.500 ₫ │  │
│ └────────────────────────────┘  │
│                                 │
│ ⚠️ Khách chưa thanh toán       │
│                                 │
│ [Hủy] [Nợ] [💳 Thu tiền & CK]  │
└─────────────────────────────────┘
```

**Cải tiến chính:**
- Mỗi section là 1 card có border + heading → dễ scan
- Thông tin khách nổi bật, badge trạng thái checkout rõ ràng
- Dịch vụ & phí phụ thu collapse được (▸) → giảm visual noise
- Tổng cộng + Còn lại font lớn, nổi bật
- Footer sticky với nút CTA rõ ràng
- Spacing thoáng hơn giữa các sections

