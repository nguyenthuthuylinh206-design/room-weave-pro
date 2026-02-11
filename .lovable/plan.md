

## Cap nhat hien thi Tenant Info trong Sidebar

### Thay doi

#### File: `src/components/layout/Sidebar.tsx` (dong 340-357)

**1. Map ten goi dich vu sang tieng Viet**

Them mapping:
- `basic` -> `Co ban`
- `standard` -> `Tieu chuan`  
- `premium` -> `Cao cap`
- `trial` -> `Dung thu`

**2. Them trang thai subscription bang mau semantic**

- `active` -> `text-green-600` (khong hien text, chi dot mau canh badge)
- `expired` -> `text-red-600` dot do
- `trial` -> `text-amber-600` dot vang

**3. Them so phong dang ky**

Hien thi compact: `54 phong` duoi dong ten, ben canh badge goi.

**4. Them tooltip cho ten dai**

Dung `title` attribute de hien thi ten day du khi hover.

**5. Hien thi ngay het han (neu sap het)**

Neu con duoi 30 ngay -> hien thi `Het han: 17/12/2026` bang `text-amber-600`.

### Layout moi

```text
[Logo 40x40] | Ten cong ty (truncate, title tooltip)
             | [Co ban] [*] 54 phong
```

- `[*]` = dot mau trang thai (green/red/amber)
- `54 phong` = text-xs text-muted-foreground
- Neu sap het han: them dong `Het han: dd/mm/yyyy` text-xs text-amber-600

### File thay doi

| File | Thay doi |
|------|---------|
| `src/components/layout/Sidebar.tsx` | Cap nhat vung dong 340-357: map plan label, them status dot, so phong, tooltip, canh bao het han |

### Khong thay doi database

Tat ca du lieu da co san trong `useTenant()` hook: `subscription_plan`, `subscription_status`, `subscription_end_date`, `registered_rooms`.

