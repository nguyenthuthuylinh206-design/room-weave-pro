

## Gộp menu "Kho & Tài sản" — từ 12 mục xuống 5

### Hiện tại: 12 sub-items (quá nhiều)

```text
Kho & Tài sản
├── Bảng điều khiển        ← gộp vào Danh sách tài sản
├── Danh sách tài sản      ← GIỮ (trang chính)
├── Danh mục               ← bỏ khỏi menu, truy cập từ trang tài sản
├── Thêm tài sản mới       ← bỏ, đã có nút trên trang danh sách
├── Giao dịch kho          ← GIỮ (gộp Nhập/Xuất/Chuyển/Kiểm kê vào đây)
├── Bổ sung đồ             ← GIỮ (có badge riêng, workflow riêng)
├── Nhập kho               ← gộp vào Giao dịch kho
├── Xuất kho               ← gộp vào Giao dịch kho
├── Chuyển kho             ← gộp vào Giao dịch kho
├── Kiểm kê               ← gộp vào Giao dịch kho
├── Phiếu giao hàng        ← GIỮ (có badge riêng)
└── Quản lý kho            ← chuyển sang Cài đặt
```

### Sau khi gộp: 5 mục

```text
Kho & Tài sản
├── Tài sản                (trang chính, bao gồm dashboard + list)
├── Giao dịch kho          (tabs: Tất cả | Nhập | Xuất | Chuyển | Kiểm kê)
├── Bổ sung đồ             (giữ nguyên, có badge)
├── Phiếu giao hàng        (giữ nguyên, có badge)
└── Quản lý kho            (chỉ hiện khi có >1 kho)
```

### Logic gộp

| Mục bỏ/gộp | Lý do |
|-------------|-------|
| **Bảng điều khiển** | Trang `/inventory` đã hiện overview stats, không cần mục riêng — đổi link tài sản về `/inventory` |
| **Danh mục** | Truy cập từ trang danh sách tài sản (đã có filter danh mục), hoặc từ Cài đặt |
| **Thêm tài sản mới** | Đã có nút "+" trên trang danh sách, không cần menu riêng |
| **Nhập/Xuất/Chuyển/Kiểm kê** | Đều là loại giao dịch kho — gộp thành tabs trong trang Giao dịch kho |
| **Quản lý kho** | Chỉ hiện khi tenant có >1 kho (giống logic filter đã làm) |

### Kế hoạch sửa

| File | Thay đổi |
|------|----------|
| `src/components/layout/Sidebar.tsx` | Giảm children của `inventory` từ 12 xuống 5 mục. Bỏ: dashboard, categories, addItem, inbound, outbound, transfer. Giữ: itemsList (→ `/inventory`), transactions, supplements, distribution, warehouses (conditional) |
| `src/i18n/locales/en/navigation.json` | Không cần thay đổi (keys đã có) |
| `src/i18n/locales/vi/navigation.json` | Không cần thay đổi (keys đã có) |

