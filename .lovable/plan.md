
## Kế hoạch: Sửa nút quay lại không hoạt động

### Vấn đề phát hiện

Có **2 lỗi** trong nút quay lại:

| Vị trí | Dòng | Lỗi hiện tại | Cần sửa |
|--------|------|--------------|---------|
| Mobile | 115 | `navigate(-1)` | `navigate('/inventory/distributions')` |
| Desktop | 234 | `navigate('/inventory/distribution')` (thiếu 's') | `navigate('/inventory/distributions')` |

### Chi tiết

1. **Mobile view** (dòng 115): Vẫn dùng `navigate(-1)` - không đáng tin cậy khi mở link trực tiếp
2. **Desktop view** (dòng 234): Đã sửa nhưng sai URL - `/inventory/distribution` thay vì `/inventory/distributions`

Route chính xác trong `App.tsx` là: `inventory/distributions` (có chữ **s**)

### Thay đổi

**File: `src/pages/inventory/DistributionOrderDetailPage.tsx`**

```typescript
// Dòng 115 (Mobile) - Sửa từ:
onClick={() => navigate(-1)}
// Thành:
onClick={() => navigate('/inventory/distributions')}

// Dòng 234 (Desktop) - Sửa từ:
onClick={() => navigate('/inventory/distribution')}
// Thành:
onClick={() => navigate('/inventory/distributions')}
```
