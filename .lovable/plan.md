
## Kế hoạch: Gộp kiểm tra checkout + Báo dọn phòng

### TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH

---

### Các thay đổi đã triển khai:

1. **CleaningRequestStep.tsx** - Form báo dọn phòng với tình trạng phòng, ưu tiên, ghi chú
2. **RoomCheckPage.tsx** - Checkout flow 5 bước (Type → Items → Chargeable → Cleaning → Review)
3. **useRoomChecks.ts** - Logic gửi notification cho Manager khi cần dọn, room status → cleaning/vacant
4. **roomCheckConfig.ts** - Label mới "Kiểm tra checkout"
5. **rooms.types.ts & rooms.schemas.ts** - Thêm CleaningRequestData interface

### Workflow:
- Phòng cần dọn → status: cleaning + Notify Manager (In-app, Push, Telegram)
- Phòng sạch → status: vacant
