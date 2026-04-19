

## Mục tiêu

Làm lại trang `/items/:id` theo chuẩn **Enterprise SaaS minimalist** của dự án: gọn, dễ đọc, ít icons, bỏ trùng lặp.

## Vấn đề hiện tại

1. **Quá nhiều `Card`** với `CardHeader/CardTitle` to → tốn không gian dọc, vi phạm chuẩn (phải dùng `border rounded-lg`)
2. **Quá nhiều icons** trong tabs, header sidebar, KPI tiles, table cells (Boxes, Package, Home, Shirt, MapPin, Clock, User, TrendingUp...) → vi phạm `minimalist-ui-icon-reduction-spec`
3. **Trùng thông tin**: "Trạng thái kho" hiện ở cả KPI (con số đỏ) lẫn Sidebar (Badge) — chỉ cần 1 chỗ
4. **2 Cảnh báo cuối sidebar** lặp lại điều mà KPI tile đã hiển thị bằng màu → bỏ
5. **Hình ảnh chiếm 1 Card riêng to** ngay đầu — nên thu lại thành thumbnail nhỏ cạnh tên
6. **Sidebar dài**: Basic Info có 8 mục rời rạc, mỗi mục là 1 block lớn — gộp thành grid 2 cột compact
7. **Tabs chỉ có 2 tab** nhưng wrap trong Card → bỏ Card, dùng border đơn giản
8. **QR code** chiếm cả Card 200×200 — thu xuống 140px hoặc đưa vào popover
9. **Lifecycle** card hiếm khi có dữ liệu — nếu có thì gộp vào Basic Info
10. Header dùng `text-3xl` quá to so với phần còn lại

## Thiết kế mới

### Layout 2 cột (giữ tỉ lệ 2:1)

```
┌────────────────────────────────────────────────────────────┐
│ ← Khăn tắm Mollis                              [Sửa]       │
│   ITEM-...  •  Khăn tắm  •  Khách sạn Phương Đông          │
├──────────────────────────────────────┬─────────────────────┤
│ [thumb] [thumb] [thumb] [+]          │ Thông tin           │
│                                      │ ─────────────────   │
│ ┌─ KHO ───────────────────────────┐  │ Trạng thái  Còn hàng│
│ │ Tổng    Trong kho  Đang dùng    │  │ Tối thiểu   20 Cái  │
│ │  100      56         41         │  │ Đặt lại     30 Cái  │
│ │ Đang giặt  Hỏng   Mất           │  │ Đơn vị      Cái     │
│ │   2        0       0            │  │ Đơn giá     50.000₫ │
│ └─────────────────────────────────┘  │ Giá trị tồn 2.8M ₫  │
│                                      │ Thương hiệu Mollis  │
│ [Lịch sử (1)] [Phân bổ phòng (20)]   │ Model       MT-01   │
│ ─────────────────────────────────    │                     │
│ Mã GD     Loại    SL  Người  Thời gian│ ─── Mã QR ────      │
│ TXN-...   Giao... -1  ...    18h trước│ [QR 140px]          │
│                                      │ ITEM-...            │
└──────────────────────────────────────┴─────────────────────┘
```

### Thay đổi cụ thể

1. **Header**: `text-3xl` → `text-xl font-semibold`. Bỏ "noCategory". Gộp `code • category • hotel` vào 1 dòng `text-xs text-muted-foreground font-mono` (riêng phần code).

2. **Hình ảnh**: Bỏ Card. Thành dải thumbnail 80×80 ngang phía trên KPI. Click → lightbox (giữ logic hiện tại). Nếu không có ảnh → ẩn hoàn toàn (không hiện placeholder Package to).

3. **KPI Kho**: 1 `border rounded-lg p-4` duy nhất, 6 ô grid (Tổng, Trong kho, Đang dùng, Đang giặt, Hỏng, Mất). Bỏ icon từng ô. Dùng `text-2xl font-semibold`, label `text-xs uppercase tracking-wide text-muted-foreground`. Số dùng màu semantic: trong kho thấp → `text-amber-600`, hết → `text-red-600`, hỏng/mất > 0 → `text-red-600`. Bỏ block "bg-orange-50/bg-red-50" riêng.

4. **Tabs**: Bỏ `Card` wrapper. Dùng `Tabs` với border trực tiếp. Bỏ icon trong table cells (TrendingUp/Down, User, Clock, MapPin). Giữ Badge category nhưng `variant="outline"`.

5. **Sidebar — Thông tin** (gộp Basic Info + Lifecycle):
   - Bỏ `Card`, dùng `border rounded-lg p-4`
   - List dạng `flex justify-between` cho mỗi field: `<span class="text-xs text-muted-foreground">Label</span><span class="text-sm font-medium">Value</span>`
   - Trạng thái kho: dùng `text-green-600/amber-600/red-600` (chữ semantic), không dùng Badge
   - Giá trị tồn kho: highlight `text-base font-semibold`
   - Lifecycle (lifetime, wash cycles + progress bar) — nếu có thì append vào cuối box này

6. **QR Code**: `border rounded-lg p-3`, QR 140px, mã code `text-xs font-mono` ở dưới.

7. **Bỏ hoàn toàn**:
   - 2 Card cảnh báo "Hết hàng / Sắp hết" cuối sidebar (đã thể hiện qua màu chữ ở KPI + sidebar)
   - Icon trong CardTitle / Tabs / Table

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/pages/items/ItemDetailPage.tsx` | **Rewrite toàn bộ phần render** (giữ nguyên logic load data, permission, mobile redirect). Thay `Card` → `border rounded-lg`, bỏ icons, gộp blocks, compact spacing. |

Không cần file mới, không thay đổi DB, không sửa hook.

