## Vấn đề

Tab **Yêu cầu HĐVAT** ở `/guest-invoices` đã có bảng liệt kê (Tên công ty, MST, Địa chỉ, Email, Dịch vụ, Tiền) nhưng khi kế toán bấm 👁 Xem lại mở `InvoicePreviewDialog` — dialog này render HTML hóa đơn **phiếu thu** kèm QR, không phải view dành cho kế toán xử lý HĐVAT.

Thiếu một màn chi tiết để kế toán:
- Xem rõ thông tin bên xuất hóa đơn (copy nhanh từng trường)
- Xem chi tiết dịch vụ + tổng tiền theo dạng dễ nhập vào phần mềm HĐĐT
- Ghi lại **số HĐVAT thật** (ký hiệu/serial + số) khi đánh dấu đã xuất
- Gửi email nhắc kế toán / hủy yêu cầu trong cùng 1 chỗ

## Giải pháp

### 1. Tạo `src/components/invoices/VatRequestDetailDialog.tsx`

Layout (Dialog `max-w-2xl`):

**Header**
- `YC-xxxx` · Badge trạng thái (Chờ xử lý / Đã xuất / Đã hủy) · ngày yêu cầu

**Section "Bên mua (xuất hóa đơn cho)"** – border rounded-lg p-3
- 4 dòng key-value: Tên công ty, Mã số thuế, Địa chỉ, Email kế toán
- Mỗi giá trị có nút Copy (icon `Copy`) → `navigator.clipboard.writeText` + toast

**Section "Lưu trú"** – border rounded-lg p-3
- Khách (`guest_name`), Phòng (`room_number`), Check-in/out (`check_in_date`/`check_out_date`)
- Nếu thiếu booking_id thì hiện "—"

**Section "Chi tiết dịch vụ"** – border rounded-lg p-3
- Bảng compact: Mô tả · SL · Đơn giá · Thành tiền
- Dưới bảng: Subtotal · VAT (rate %) · TỔNG CỘNG (font-bold)

**Section "Hành động"** – sticky footer
- Nếu `status === 'pending'`:
  - `Input` "Số HĐVAT đã xuất" (placeholder `1C25TAA/0001234`)
  - Button **Xác nhận đã xuất** (primary): update `{ status:'issued', issued_at: now, notes: 'HĐVAT: <số>' + (existing notes ? '\n' + existing : '') }`
  - Button outline **Gửi email kế toán** → đóng dialog, mở `SendInvoiceEmailDialog` với invoice hiện tại (pre-fill `accountant_email`)
  - Button ghost text-red-600 **Hủy yêu cầu** → update `status='cancelled'`
- Nếu `status === 'issued'`:
  - Hiển thị "Số HĐVAT: <parse từ notes>" + "Xuất lúc: <issued_at>"
  - Button **Đóng**
- Nếu `status === 'cancelled'`:
  - Hiển thị "Đã hủy" + Button Đóng

Dùng `useUpdateGuestInvoice()` đã có. Tất cả button có `type="button"`.

### 2. Sửa `src/pages/invoices/GuestInvoicesPage.tsx`

- Thêm import `VatRequestDetailDialog` và state `vatDetailInvoice`
- Trong block tab `vat_request`:
  - Row `<tr>` thêm `onClick={() => setVatDetailInvoice(inv)}` + `cursor-pointer hover:bg-muted/20`
  - Nút 👁 đổi `onClick` từ `setPreviewInvoice(inv)` → `setVatDetailInvoice(inv)`
- Cuối page render:
  ```tsx
  <VatRequestDetailDialog
    invoice={vatDetailInvoice}
    open={!!vatDetailInvoice}
    onOpenChange={(v) => { if (!v) setVatDetailInvoice(null) }}
    onOpenEmail={(inv) => { setVatDetailInvoice(null); setEmailInvoice(inv) }}
  />
  ```
- Tab `receipt` giữ nguyên `InvoicePreviewDialog`.

### 3. Không động DB
Số HĐVAT thật lưu vào cột `notes` đã có (prefix `HĐVAT: `). Không thêm migration, không sửa types.

## Files

- **Tạo**: `src/components/invoices/VatRequestDetailDialog.tsx`
- **Sửa**: `src/pages/invoices/GuestInvoicesPage.tsx`

## Test thủ công

1. Vào `/guest-invoices` → tab Yêu cầu HĐVAT → click vào 1 dòng `pending` → dialog mới mở với đủ thông tin công ty + dịch vụ.
2. Bấm Copy từng field → toast "Đã copy".
3. Nhập số HĐVAT → Xác nhận đã xuất → row chuyển sang "Đã xuất", badge pending giảm 1.
4. Mở lại dòng đã xuất → thấy số HĐVAT + thời điểm.
5. Bấm Gửi email kế toán → mở `SendInvoiceEmailDialog` với địa chỉ kế toán pre-fill.
