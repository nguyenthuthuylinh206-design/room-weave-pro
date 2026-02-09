

## Phan tich van de he thong phan quyen

### VAN DE 1: MODULES thieu so voi thuc te

Danh sach `MODULES` trong `useUserPermissions.ts` co **12 module**, nhung thuc te he thong su dung cac module khong co trong danh sach nay:

| Module thuc te (dung trong App.tsx) | Co trong MODULES? | Hau qua |
|---|---|---|
| `dashboard` | Co | OK |
| `items` | Co | OK |
| `rooms` | Co | OK |
| `laundry` | Co | OK |
| `inventory` | Co | OK |
| `maintenance` | Co | OK |
| `vendors` | Co | OK |
| `purchase_orders` | Co | OK |
| `reports` | Co | OK |
| `users` | Co | OK |
| `settings` | Co | OK |
| `hotels` | Co | OK |
| `bookings` | **KHONG** (dung chung `rooms`) | Khong the phan quyen rieng Dat phong va Quan ly phong |
| `housekeeping` | **KHONG** (khong co route check) | Khong the phan quyen rieng Housekeeping |

**Van de**: Bookings (Dat phong) dang dung chung module `rooms`, nen khong the cho phep 1 user chi xem Dat phong ma khong xem Phong, hoac nguoc lai.

---

### VAN DE 2: ACTIONS thieu `assign` va `manage`

Danh sach `ACTIONS` co 6 quyen: `view, create, update, delete, export, approve`

Nhung `PermissionRoute` co dinh nghia type `PermissionAction` bao gom ca `assign` va `manage` (dung o `settings/workflows` voi `action="manage"`). Nhung 2 action nay **khong hien thi** trong UI phan quyen, nen admin khong the cap quyen `manage` hoac `assign` cho ai.

---

### VAN DE 3: Badge trang thai khong ro rang

Trong `ModuleToggle.tsx`:
- Module tat: hien "Khong co quyen" (Badge secondary)
- Module bat + tat ca actions bat: khong hien gi
- Module bat + mot so actions bat: hien "Tuy chinh" (Badge outline)

**Van de**: "Tuy chinh" khong cho biet user co nhung quyen gi. Admin phai bam mo expand tung module de xem chi tiet. Voi 12 module, viec nay rat mat thoi gian.

---

### VAN DE 4: Khong co Preset/Template quyen

Moi lan tao user moi, admin phai bat/tat tung module va tung action thu cong. Khong co cach:
- Ap dung template quyen nhanh (vd: "Staff phong", "Staff kho", "Manager toan quyen")
- Copy quyen tu user khac

---

### VAN DE 5: Khong phan biet actions theo module

Tat ca 12 module deu hien **6 actions giong nhau** (view, create, update, delete, export, approve). Nhung thuc te:
- `dashboard`: chi can `view` (khong can create/delete/approve)
- `reports`: chi can `view` va `export` (khong can create/delete)
- `settings`: can `view` va `manage` (khong can export/approve)
- `hotels`: can `view`, `create`, `update`, `delete` (khong can export/approve)

Hien 6 actions cho dashboard la thua va gay nhau lan.

---

### GIAI PHAP DE XUAT

### 1. Them module `bookings` vao MODULES

**File: `src/hooks/useUserPermissions.ts`**
- Them `{ code: 'bookings', name: 'Dat phong', icon: 'CalendarDays' }` vao mang MODULES

**File: `src/App.tsx`**
- Doi cac route bookings tu `module="rooms"` sang `module="bookings"`

### 2. Them actions `assign` va `manage` vao ACTIONS

**File: `src/hooks/useUserPermissions.ts`**
- Them `{ code: 'assign', name: 'Phan cong', color: 'cyan' }` va `{ code: 'manage', name: 'Quan ly', color: 'orange' }` vao mang ACTIONS

### 3. Dinh nghia actions phu hop cho tung module

**File: `src/hooks/useUserPermissions.ts`**
- Them `MODULE_ACTIONS` map de chi dinh actions ap dung cho tung module:

```text
dashboard  -> [view]
items      -> [view, create, update, delete, export]
rooms      -> [view, create, update, delete]
bookings   -> [view, create, update, delete, export]
laundry    -> [view, create, update, delete, export, approve]
inventory  -> [view, create, update, delete, export, approve]
maintenance-> [view, create, update, delete, assign, approve]
vendors    -> [view, create, update, delete]
purchase_orders -> [view, create, update, delete, approve]
reports    -> [view, export]
users      -> [view, create, update, delete]
settings   -> [view, update, manage]
hotels     -> [view, create, update, delete]
```

**File: `src/components/permissions/ModuleToggle.tsx`**
- Nhan prop `applicableActions` de chi hien cac action phu hop

### 4. Hien thi tom tat quyen tren badge

**File: `src/components/permissions/ModuleToggle.tsx`**
- Thay badge "Tuy chinh" bang tom tat cu the, vd: "Xem, Sua" hoac "3/5 quyen"

### 5. Them Preset quyen (Optional - giai doan sau)

Tao san 3-4 template quyen de admin ap dung nhanh:
- "Nhan vien phong": rooms (view, update), laundry (view), maintenance (view, create)
- "Nhan vien kho": inventory (full), items (view, update)
- "Quan ly toan quyen": tat ca modules (tru settings/manage)

---

### FILES CAN SUA

| # | File | Thay doi |
|---|------|----------|
| 1 | `src/hooks/useUserPermissions.ts` | Them module `bookings`, them actions `assign`/`manage`, them `MODULE_ACTIONS` map |
| 2 | `src/App.tsx` | Doi bookings routes tu `module="rooms"` sang `module="bookings"` |
| 3 | `src/components/permissions/ModuleToggle.tsx` | Filter actions theo module, hien tom tat quyen tren badge |
| 4 | `src/components/permissions/UserPermissionPanel.tsx` | Truyen `applicableActions` vao ModuleToggle |
| 5 | `src/hooks/useUserPermissionConfiguration.ts` | Cap nhat logic save de chi luu applicable actions |
| 6 | `src/components/auth/PermissionRoute.tsx` | Them `bookings` vao PermissionModule type |

---

### KET QUA SAU THAY DOI

| Truoc | Sau |
|-------|-----|
| 12 modules, thieu bookings | 13 modules, day du |
| 6 actions giong nhau cho moi module | Actions phu hop tung module (dashboard chi co view) |
| Badge chi hien "Tuy chinh" mo ho | Hien cu the "Xem, Sua" hoac "3/5 quyen" |
| Thieu assign/manage action | Co du 8 actions |
| Bookings va Rooms chung quyen | Tach rieng, phan quyen doc lap |

