

## Mở rộng Sidebar Owner - Đầy đủ tất cả chức năng

### Van de hien tai

Sidebar cua Owner (`ownerNavigation` trong `Sidebar.tsx`) chi co 5 muc:
- Dashboard
- Bookings
- Rooms
- Reports (gioi han)
- Settings

**Thieu hoan toan** cac module quan trong:
- Inventory (Kho & Tai san) - 12 sub-items
- Laundry (Giat la) - 6 sub-items
- Vendors (Nha cung cap) - 5 sub-items
- Maintenance (Bao tri) - 3 sub-items
- Staff Management (Quan ly nhan su)

Trong khi Manager lai co day du tat ca cac module nay. Owner la cap cao nhat nhung lai bi gioi han navigation.

### Giai phap

**Xoa bo `ownerNavigation` rieng biet**, thay vao do cho Owner su dung cung `navigation` voi Manager/Staff (vi Owner da co quyen truy cap tat ca module). Chi can sua 1 dong logic trong Sidebar.tsx.

### Chi tiet thay doi

**File: `src/components/layout/Sidebar.tsx`**

| Thay doi | Chi tiet |
|----------|----------|
| Xoa mang `ownerNavigation` (dong 65-111) | Khong can navigation rieng cho Owner nua |
| Sua logic chon navigation (dong 325) | Xoa dieu kien `role === 'owner' ? ownerNavigation : navigation`, luon dung `navigation` |

Logic hien tai:
```
const effectiveNavigation = role === 'owner' ? ownerNavigation : navigation
```

Sua thanh:
```
const effectiveNavigation = navigation
```

Mang `navigation` da co `roles: ['owner', ...]` o moi muc, nen Owner se tu dong thay tat ca. Dong thoi `hasModuleAccess` cung da return `true` cho `role === 'owner'`.

### Ket qua

| Truoc | Sau |
|-------|-----|
| Owner chi thay 5 muc sidebar | Owner thay day du tat ca module nhu Manager |
| Thieu Inventory, Laundry, Vendors, Maintenance, Staff | Co day du voi badge counts, sub-menus |
| Phai vao Settings de truy cap mot so chuc nang | Truy cap truc tiep tu sidebar |
| Reports chi co revenue + financial | Them operations, rooms, inventory, laundry, maintenance reports |

### Pham vi anh huong

- Chi sua 1 file: `src/components/layout/Sidebar.tsx`
- Khong anh huong mobile (BottomNav va MorePage da day du cho Owner)
- Khong anh huong permissions - Owner van co full access
- Khong anh huong routing - tat ca routes da ho tro Owner

