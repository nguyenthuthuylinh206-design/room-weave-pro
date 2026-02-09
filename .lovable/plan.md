

## Tong ket cac van de va cai thien can thiet

Sau khi kiem tra toan bo du an, toi phat hien cac van de sau:

---

### VAN DE 1: Bookings van dung `module="rooms"` (Chua duoc sua)

Trong plan truoc da de xuat tach `bookings` ra khoi `rooms`, nhung trong `App.tsx` (dong 477, 485), 2 route bookings van dung `module="rooms"`:

```
/bookings     -> PermissionRoute module="rooms"
/bookings/:id -> PermissionRoute module="rooms"
```

Can doi thanh `module="bookings"`.

**File**: `src/App.tsx` - dong 477, 485

---

### VAN DE 2: `bookings` thieu trong `usePermission.ts` PermissionModule type

File `src/hooks/usePermission.ts` dinh nghia `PermissionModule` type nhung **khong co `bookings`** (dong 6-19). Trong khi `src/components/auth/PermissionRoute.tsx` DA co `bookings`. Hai file khong dong bo.

**File**: `src/hooks/usePermission.ts` - them `'bookings'` vao type

---

### VAN DE 3: `ALL_MODULES` trong `usePermission.ts` khong dong bo voi `MODULES` trong `useUserPermissions.ts`

- `usePermission.ts` (dong 24-37): 12 modules, **thieu `bookings`**
- `useUserPermissions.ts` (dong 35-49): 13 modules, **co `bookings`**

Hai file dinh nghia module list doc lap, de gay sai lech.

**File**: `src/hooks/usePermission.ts` - them `bookings` vao `ALL_MODULES`

---

### VAN DE 4: `ALL_ACTIONS` trong `usePermission.ts` thieu `assign` va `manage`

- `usePermission.ts` (dong 40-47): Chi 6 actions (view, create, update, delete, export, approve)
- `useUserPermissions.ts` (dong 51-59): Da co 8 actions (them assign, manage)

**File**: `src/hooks/usePermission.ts` - them `assign` va `manage`

---

### VAN DE 5: Trung lap hooks phan quyen (3 he thong song song)

Hien tai co **3 hook files** xu ly permission voi logic trung lap:

| File | Muc dich | Dung o dau |
|------|---------|------------|
| `usePermission.ts` | `useHasPermission(module, action)` - dung cho `PermissionGate` | Components UI |
| `usePermissions.ts` | `useHasPermission(permissionCode)`, `useHasModulePermission` - dung legacy roles table | Khong ro |
| `useUserPermissions.ts` | `useCheckUserPermission(module, action)` - dung cho `PermissionGuard` | Components UI |

**Van de**: 
- `usePermissions.ts` dung query phuc tap qua `user_roles -> roles -> role_permissions -> permissions` (legacy system)
- `usePermission.ts` va `useUserPermissions.ts` deu goi `has_user_permission` RPC nhung co query key khac nhau
- Kho bao tri va de gay confuse khi developer chon sai hook

**Giai phap**: Hop nhat thanh 1 file duy nhat hoac danh dau ro legacy vs active

---

### VAN DE 6: `PermissionGuard` va `PermissionGate` - 2 component trung chuc nang

| Component | File | Dung hook |
|-----------|------|-----------|
| `PermissionGuard` | `src/components/auth/PermissionGuard.tsx` | `useCheckUserPermission` tu `useUserPermissions.ts` |
| `PermissionGate` | `src/components/auth/PermissionGate.tsx` | `useHasPermission` tu `usePermission.ts` |

Ca 2 deu wrap children va an/hien dua tren permission. **Nen hop nhat thanh 1**.

---

### VAN DE 7: Database Security - 102 linter warnings

- **99 warnings**: Function Search Path Mutable - cac database functions khong set `search_path`, co the bi khai thac de truy cap schema khong mong muon
- **1 warning**: Materialized View in API - view co the bi truy cap qua API
- **1 warning**: RLS Policy Always True - co policy dung `USING (true)` cho INSERT/UPDATE/DELETE
- **1 warning**: Leaked Password Protection Disabled

**Uu tien cao**: RLS Policy Always True va Leaked Password Protection

---

### VAN DE 8: `useUserModulePermissions.ts` - PermissionSummary thieu `can_assign` va `can_manage`

Interface `PermissionSummary` (dong 6-13) chi co 6 fields: `can_view`, `can_create`, `can_update`, `can_delete`, `can_export`, `can_approve`. Thieu `can_assign` va `can_manage` tuong ung voi 2 actions moi.

**File**: `src/hooks/useUserModulePermissions.ts`

---

### VAN DE 9: `saveConfiguration` trong `useUserPermissionConfiguration.ts` - allActions hardcode

Dong 146: `const allActions = ['view', 'create', 'update', 'delete', 'export', 'approve', 'assign', 'manage']` - da duoc cap nhat nhung khi module khong co `moduleActions`, no insert TAT CA 8 actions thay vi chi applicable actions. Nen dung `MODULE_ACTIONS[module]` lam fallback.

**File**: `src/hooks/useUserPermissionConfiguration.ts` - dong 176-183

---

### VAN DE 10: Duplicate hooks - `useCreateDistributionFromSupplement.ts` va `useCreateDistributionFromSupplements.ts`

2 files co ten gan giong nhau, de nham lan. Can xac nhan ca 2 deu dang duoc su dung hay 1 la du thua.

---

### KE HOACH THUC HIEN (theo thu tu uu tien)

#### Dot 1: Bug fixes (Quan trong)

| # | File | Thay doi |
|---|------|----------|
| 1 | `src/App.tsx` | Doi bookings routes tu `module="rooms"` sang `module="bookings"` |
| 2 | `src/hooks/usePermission.ts` | Them `bookings` vao `PermissionModule`, them `assign`/`manage` vao `ALL_ACTIONS`, them `bookings` vao `ALL_MODULES` |
| 3 | `src/hooks/useUserModulePermissions.ts` | Them `can_assign` va `can_manage` vao `PermissionSummary` |
| 4 | `src/hooks/useUserPermissionConfiguration.ts` | Dung `MODULE_ACTIONS[module]` lam fallback thay vi `allActions` |

#### Dot 2: Code cleanup (Cai thien)

| # | Thay doi |
|---|----------|
| 5 | Hop nhat `PermissionGuard` va `PermissionGate` thanh 1 component |
| 6 | Danh dau `usePermissions.ts` (legacy) la deprecated, chuyen sang `usePermission.ts` |
| 7 | Kiem tra va loai bo hook trung lap `useCreateDistributionFromSupplement(s)` |

#### Dot 3: Security (Database)

| # | Thay doi |
|---|----------|
| 8 | Bat Leaked Password Protection |
| 9 | Review va fix RLS Policy Always True |
| 10 | Set `search_path = public` cho cac database functions |

---

### KET QUA SAU THAY DOI

| Truoc | Sau |
|-------|-----|
| Bookings dung quyen `rooms` | Bookings co module rieng |
| 3 hooks phan quyen trung lap | 1 hook chinh + 1 legacy deprecated |
| 2 guard components trung chuc nang | 1 component duy nhat |
| PermissionModule types khong dong bo | Dong bo giua tat ca files |
| 102 database security warnings | Giam dang ke |

