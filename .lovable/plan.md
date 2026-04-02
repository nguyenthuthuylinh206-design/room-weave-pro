

## Sắp xếp nhóm cho các danh mục sidebar

### Phân tích hiện tại

| Danh mục | Số mục | Cần nhóm? |
|----------|--------|-----------|
| Super Admin | 7 | Có |
| **Kho vận (Inventory)** | **12** | **Rất cần** |
| Phòng (Rooms) | 7 | Có |
| Giặt ủi (Laundry) | 6 | Có |
| Nhà cung cấp (Vendors) | 5 | Nhẹ |
| Bảo trì (Maintenance) | 3 | Không |
| Báo cáo (Reports) | 6 | Không (đã đồng nhất) |
| Cài đặt (Settings) | 11 | Đã xong ✓ |

### Đề xuất nhóm

**1. Kho vận (Inventory) — 12 mục → 4 nhóm**
```text
├─ TỔNG QUAN
│  ├ Dashboard
│  └ Lịch sử giao dịch
├─ SẢN PHẨM
│  ├ Danh sách sản phẩm
│  ├ Danh mục
│  └ Thêm sản phẩm
├─ XUẤT NHẬP KHO
│  ├ Nhập kho
│  ├ Xuất kho
│  ├ Chuyển kho
│  ├ Kiểm kê
│  └ Phân phối
└─ THIẾT LẬP
   ├ Phụ kiện bổ sung
   └ Kho hàng
```

**2. Phòng (Rooms) — 7 mục → 3 nhóm**
```text
├─ QUẢN LÝ PHÒNG
│  ├ Danh sách phòng
│  ├ Tiêu chuẩn phòng
│  └ Thêm phòng
├─ ĐẶT PHÒNG & KHÁCH
│  ├ Đặt phòng
│  ├ Khách hàng
│  └ Hóa đơn khách
└─ KHÁC
   └ Thất lạc
```

**3. Giặt ủi (Laundry) — 6 mục → 2 nhóm**
```text
├─ VẬN HÀNH
│  ├ Tổng quan
│  ├ Yêu cầu giặt
│  ├ Lô giặt
│  └ Tạo lô mới
└─ NHÀ CUNG CẤP
   ├ DS nhà cung cấp
   └ Thêm NCC
```

**4. Nhà cung cấp (Vendors) — 5 mục → 2 nhóm**
```text
├─ NHÀ CUNG CẤP
│  ├ Danh sách
│  ├ Thêm mới
│  └ So sánh
└─ ĐƠN HÀNG
   ├ Đơn mua hàng
   └ Tạo đơn mới
```

**5. Super Admin — 7 mục → 3 nhóm**
```text
├─ TỔNG QUAN
│  ├ Dashboard
│  └ Tenants
├─ TÀI CHÍNH
│  ├ Thanh toán
│  ├ Mã khuyến mãi
│  └ Gói giá
└─ MARKETING
   ├ Chiến dịch
   └ Nhắc nhở
```

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/layout/Sidebar.tsx` | Thêm `group` property cho children của 5 danh mục trên |

Cùng cơ chế render group label đã có sẵn từ Settings, không cần thay đổi logic render.

