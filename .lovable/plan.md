

## Fix: Dialog "Đang tạo đơn hàng..." quay mãi không dừng

### Nguyên nhân

Trong `BankTransferPaymentDialog.tsx`, khi `createInvoiceWithContent()` phát hiện đã có hóa đơn pending (status = 'sent'), nó hiển thị toast lỗi và return early (dòng 68-72). Tuy nhiên, loading condition ở dòng 193:

```typescript
(isCreatingInvoice || (autoCreateInvoice && !invoiceCreated))
```

Sau khi return early:
- `isCreatingInvoice = false` (set trong finally)
- `invoiceCreated = false` (không bao giờ set true)
- `autoCreateInvoice = true` (prop truyền vào)

=> `(true && !false)` = TRUE => **Spinner quay vĩnh viễn**

### Giải pháp

1. Thêm state `hasError` để track khi tạo invoice thất bại
2. Cập nhật loading condition để tính cả `hasError`
3. Khi có lỗi (hóa đơn pending hoặc exception), hiển thị thông báo lỗi với nút "Đóng" thay vì spinner

### Thay đổi chi tiết

**File: `src/components/payment/BankTransferPaymentDialog.tsx`**

1. Thêm state `hasError` và `errorMessage`:
```typescript
const [hasError, setHasError] = useState(false);
const [errorMessage, setErrorMessage] = useState('');
```

2. Reset state khi dialog mở (trong useEffect):
```typescript
setHasError(false);
setErrorMessage('');
```

3. Trong `createInvoiceWithContent`, khi phát hiện pending invoice:
```typescript
if (pendingInvoices && pendingInvoices.length > 0) {
  setHasError(true);
  setErrorMessage('Bạn còn hóa đơn chưa thanh toán. Vui lòng thanh toán hoặc hủy trước khi tạo mới.');
  toast.error('...');
  setIsCreatingInvoice(false);
  return;
}
```

4. Trong catch block:
```typescript
catch (error) {
  setHasError(true);
  setErrorMessage('Không thể tạo đơn hàng. Vui lòng thử lại.');
  toast.error('...');
}
```

5. Cập nhật loading condition:
```typescript
// Trước:
(isCreatingInvoice || (autoCreateInvoice && !invoiceCreated))

// Sau:
(isCreatingInvoice || (autoCreateInvoice && !invoiceCreated && !hasError))
```

6. Thêm UI hiển thị lỗi (sau loading block, trước manual confirmation):
```tsx
hasError ? (
  <div className="flex flex-col items-center py-8 text-center space-y-4">
    <AlertTriangle className="h-12 w-12 text-amber-500" />
    <p className="text-muted-foreground">{errorMessage}</p>
    <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
  </div>
) : ...
```

### Kết quả

- Khi có hóa đơn pending: hiển thị thông báo lỗi rõ ràng thay vì spinner quay mãi
- Khi tạo invoice thất bại: hiển thị lỗi với nút Đóng
- Flow bình thường (không có pending invoice): hoạt động bình thường, tạo invoice + hiển thị QR

