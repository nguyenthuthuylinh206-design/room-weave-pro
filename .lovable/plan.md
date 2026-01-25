
## Kế hoạch: Gộp kiểm tra checkout + Báo dọn phòng

### TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH

---

### Các thay đổi đã triển khai:

1. **CleaningRequestStep.tsx** - Form báo dọn phòng với tình trạng phòng, ưu tiên, ghi chú
2. **RoomCheckPage.tsx** - Checkout flow 5 bước (Type → Items → Chargeable → Cleaning → Review)
3. **useRoomChecks.ts** - Logic gửi notification cho Manager khi cần dọn, room status → cleaning/vacant
4. **roomCheckConfig.ts** - Label mới "Kiểm tra checkout"
5. **rooms.types.ts & rooms.schemas.ts** - Thêm CleaningRequestData interface
6. **CleaningRequestBanner.tsx** - Banner phân công dọn phòng cho Manager trong RoomDetailPage
7. **RoomDetailPage.tsx** - Hiển thị banner khi phòng có status 'cleaning'

### Workflow hoàn chỉnh:
```
Nhân viên kiểm tra checkout → Đánh giá tình trạng phòng
    ↓
Phòng cần dọn? 
  → Có: Room → cleaning + Notify Manager
  → Không: Room → vacant
    ↓
Manager nhận notification → Vào trang chi tiết phòng
    ↓
Click "Phân công" → Chọn nhân viên + priority → Tạo housekeeping_task
    ↓
Nhân viên được giao nhận notification → Dọn xong → Phòng → vacant
```
