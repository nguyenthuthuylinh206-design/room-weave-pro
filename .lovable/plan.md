

## Fix: React Error #185 (Maximum update depth exceeded) tại `/inventory/inbound/new`

### Nguyên nhân

Trong `src/pages/inventory/InboundPage.tsx`, dòng 88-91:

```typescript
const toWarehouseId = form.watch('to_warehouse_id')
if (defaultWarehouse && !toWarehouseId) {
  form.setValue('to_warehouse_id', defaultWarehouse.id)
}
```

`form.setValue()` được gọi **trực tiếp trong render body** (không nằm trong useEffect). Khi `defaultWarehouse` load xong:
1. `form.setValue` thay đổi form state
2. Component re-render
3. `form.watch` trả về giá trị mới nhưng nếu có race condition hoặc form reset, `toWarehouseId` lại trống
4. `setValue` gọi lại -> vòng lặp vô hạn -> crash

Lỗi này xảy ra với **một số khách hàng** vì phụ thuộc vào timing load `defaultWarehouse` data. Nếu data load chậm (network yếu), component mount xong rồi mới có data -> trigger setValue loop.

### Giải pháp

Di chuyển logic set default warehouse vào `useEffect` để chỉ chạy khi `defaultWarehouse` thay đổi, không chạy mỗi lần render.

### Thay đổi

**File: `src/pages/inventory/InboundPage.tsx`**

Thay thế dòng 87-91:
```typescript
// TRƯỚC (lỗi - gọi setValue trong render)
const toWarehouseId = form.watch('to_warehouse_id')
if (defaultWarehouse && !toWarehouseId) {
  form.setValue('to_warehouse_id', defaultWarehouse.id)
}
```

Bằng:
```typescript
// SAU (đúng - dùng useEffect)
useEffect(() => {
  if (defaultWarehouse && !form.getValues('to_warehouse_id')) {
    form.setValue('to_warehouse_id', defaultWarehouse.id)
  }
}, [defaultWarehouse, form])
```

Cần thêm import `useEffect` từ React (hiện chưa import trong file này).

### Kết quả

- Không còn vòng lặp re-render vô hạn
- Default warehouse vẫn được set tự động khi data load xong
- Fix cho tất cả khách hàng, không phụ thuộc tốc độ mạng

