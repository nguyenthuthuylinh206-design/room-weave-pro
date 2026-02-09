

## UX/UI Room Check - DA HOAN THANH

### Cac fix da thuc hien:

| # | Fix | Trang thai |
|---|-----|------------|
| 1 | Skip modal CheckTypeSelector khi phong cleaning (navigate thang type=daily) | ✅ Done |
| 2 | Auto-skip Phase1 Confirm khi khong co phu thu/mat/hong | ✅ Done |
| 3 | Gop Cleaning step vao Review step (6 buoc -> 5 buoc checkout) | ✅ Done |
| 4 | Giam toast spam - chi giu toast cho lost/damaged | ✅ Done |
| 5 | Thu gon header mobile - thay Card bang div, gop headers, an PageHeader tren mobile | ✅ Done |
| 6 | Fix label "Thieu" -> "Het" cho consumable action | ✅ Done |
| 7 | Tach nut Huy thanh icon X o goc tren phai | ✅ Done |

### Chi tiet thay doi:

**Files da sua:**
- `src/components/rooms/StaffRoomCheckView.tsx` - Navigate truc tiep khi phong cleaning
- `src/pages/rooms/RoomCheckPage.tsx` - Auto-skip, gop steps, compact header, nut Huy
- `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx` - Giam toast, doi label "het"
- `src/components/rooms/check-steps/item-type-tabs/CategoryItemRow.tsx` - Doi label consumed
