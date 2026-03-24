

## Đơn giản hóa trang Quản lý Tài sản

### Vấn đề hiện tại (từ screenshot)
Trên 765px, trang hiện có **quá nhiều lớp** chồng nhau:
1. Header: "Quản lý Tài sản" + nút "Thêm tài sản mới"
2. Tabs: Tài sản | Dịch vụ
3. Category tabs: Tất cả 0
4. **5 bộ lọc** ngang hàng: Search + Danh mục + Tồn kho + Kho + Trạng thái
5. **4 nút action**: Import + Xuất Excel + Quét QR + Đồng bộ

→ User chưa thấy data đã phải scroll qua ~200px toolbar. Nhiều chức năng gây bối rối.

### Chức năng nên bỏ/ẩn

| Chức năng | Lý do bỏ |
|-----------|----------|
| **Quét QR** | Chưa hoạt động — chỉ hiện toast "đang phát triển" |
| **Đồng bộ** | Chức năng nội bộ (sync categories), user thường không cần |
| **Category Tabs** (ItemTabs) | Trùng với dropdown "Tất cả danh mục" — cùng chức năng lọc theo category |
| **Trạng thái filter** (Đang dùng/Ngừng dùng) | Hầu như luôn là "Đang dùng", hiếm khi đổi — chuyển vào menu phụ |
| **Kho filter** | Giữ lại nhưng chỉ hiện khi có >1 kho |

### Cấu trúc mới

```text
┌─────────────────────────────────────────────────┐
│ Quản lý Tài sản          [Import] [Export] [+]  │
│ Quản lý tất cả tài sản...                      │
├─────────────────────────────────────────────────┤
│ Tài sản | Dịch vụ                               │
├─────────────────────────────────────────────────┤
│ 🔍 Tìm kiếm...  [Danh mục ▾] [Tồn kho ▾]     │
├─────────────────────────────────────────────────┤
│ (Bảng dữ liệu)                                 │
└─────────────────────────────────────────────────┘
```

- Search + 2 filter chính trên 1 hàng duy nhất
- Import/Export lên header cạnh nút Thêm (gọn hơn)
- Bỏ: Quét QR, Đồng bộ, Category Tabs, Status filter
- Kho filter: chỉ hiện khi tenant có >1 warehouse

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `src/components/items/ItemFilters.tsx` | Bỏ nút Quét QR + Đồng bộ. Bỏ Status filter. Kho filter chỉ hiện khi >1 kho. Di chuyển Import/Export lên props callback cho header |
| `src/pages/items/ItemsPage.tsx` | Bỏ `<ItemTabs>`. Di chuyển Import/Export buttons lên cạnh nút "Thêm tài sản" trong PageHeader |

