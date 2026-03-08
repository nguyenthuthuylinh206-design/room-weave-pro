

## Đánh giá trang /help

### Nội dung: Đầy đủ
Data đã có trong `helpGuides.ts` và `contextualHelp.ts`:
- **4 vai trò**: Nhân viên phòng (6 guides), Lễ tân (5 guides), Quản lý (7 guides), Chủ khách sạn (4 guides) = **22 bài hướng dẫn**
- **15 trang** có contextual help (nút `?` trên PageHeader)
- Mỗi bài có: steps, tips, nút "Đi tới trang"
- Search hoạt động, mobile responsive (accordion), desktop (tabs + grid)

### Vấn đề hiển thị: Desktop Sidebar thiếu link /help

| Nơi hiển thị | Có link /help? |
|---|---|
| Desktop Sidebar (`Sidebar.tsx`) | **Không** |
| Mobile Sidebar (`MobileSidebar.tsx`) | Có ("Hỗ trợ") |
| Nút `?` trên PageHeader (contextual) | Có (link "Xem tất cả hướng dẫn") |

**Vấn đề chính**: Trên desktop, người dùng không có cách nào truy cập trực tiếp trang Hướng dẫn từ menu chính — chỉ có thể đến từ nút `?` trên các trang.

### Kế hoạch fix

**Thêm mục "Hướng dẫn sử dụng" vào Desktop Sidebar** (`Sidebar.tsx`):
- Thêm vào nhóm Settings hoặc tạo mục riêng ở cuối sidebar (trước profile)
- Icon: `HelpCircle`, path: `/help`
- Hiển thị cho tất cả roles

