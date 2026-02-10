

## Sua doi giao dien Group Checkout - Chuyen nghiep va de nhin

### VAN DE HIEN TAI

Dialog Group Checkout dang dung qua nhieu mau nen (background colors) cho cac trang thai va khu vuc, tao cam giac "mau me" va khong chuyen nghiep:

1. **Badge trang thai kiem tra**: Dung `bg-green-50`, `bg-blue-50`, `bg-amber-50` voi border mau - qua nhieu mau sac
2. **Canh bao qua han**: `bg-red-50 border-red-200` - nen do
3. **Thong bao checkout som/dung gio**: `bg-green-50 border-green-200` - nen xanh
4. **Bang phu thu tre**: Active tier dung `bg-amber-50 border-l-2 border-l-amber-500` - nen vang noi bat
5. **Khu vuc chinh sua phu thu**: `bg-amber-50/50 border-amber-200` - nen vang
6. **InspectionStatusCard**: 3 trang thai dung 3 mau nen khac nhau (xanh duong, vang, xanh la)
7. **Canh bao chua thanh toan**: `bg-amber-50 border-amber-200`
8. **Tong hop**: Dong "CON LAI" dung `text-lg font-bold` - qua lon
9. **Cac dong +/- trong tong hop**: Dung `text-amber-600`, `text-red-600` - hop ly nhung can nhat quan

### NGUYEN TAC THIET KE MOI (theo Enterprise SaaS Minimalist)

- **Khong dung mau nen cho status**: Chi dung mau chu semantic (`text-green-600`, `text-red-600`, `text-amber-600`)
- **Border don gian**: Chi dung `border rounded-lg` hoac `border-b`, khong dung border mau
- **Compact**: `text-xs`, `text-sm`, padding `p-2`/`p-3`
- **Monochrome badges**: Dung `variant="outline"` khong mau nen
- **Canh bao/thong bao**: Chi dung icon + text mau, khong co nen mau

### CHI TIET THAY DOI

#### 1. Badge trang thai kiem tra (`getInspectionStatusBadge`)

**Truoc**:
```text
bg-green-50 text-green-700 border-green-200  (completed)
bg-blue-50 text-blue-700 border-blue-200     (in_progress)
bg-amber-50 text-amber-700 border-amber-200  (pending)
```

**Sau**:
```text
text-green-600 (completed) - chi text, khong badge
text-blue-600  (in_progress) - chi text + icon
text-amber-600 (pending) - chi text + icon
text-muted-foreground (not_requested)
```
-> Bo Badge, chuyen thanh `<span>` voi icon + text mau semantic.

#### 2. Canh bao qua han

**Truoc**: `bg-red-50 border border-red-200 rounded-lg`
**Sau**: `border rounded-lg` (border mac dinh) + icon va text `text-red-600`, khong nen mau

#### 3. Checkout som / dung gio

**Truoc**: `bg-green-50 border border-green-200 rounded-lg`
**Sau**: Chi hien 1 dong text `text-green-600` voi icon Check, khong can border hay nen. Gon giang.

#### 4. Bang phu thu tre

**Truoc**: Active tier co `bg-amber-50 border-l-2 border-l-amber-500`
**Sau**: Active tier chi dung `font-medium` va text `text-amber-600` cho so tien. Khong nen mau. Header bang dung `text-xs uppercase text-muted-foreground` thay vi `bg-muted/50`.

#### 5. Khu vuc chinh sua phu thu (editable late charge / overtime)

**Truoc**: `p-2 bg-amber-50/50 rounded border border-amber-200`
**Sau**: `p-2 border rounded-lg` (border mac dinh), Label dung `text-amber-600` de giu nhan dien muc phu thu. Bo nen vang.

#### 6. InspectionStatusCard

**Truoc**: 3 mau nen khac nhau cho 3 trang thai
**Sau**: Tat ca dung `border rounded-lg` (border mac dinh), phan biet bang:
- Icon + text mau semantic (xanh la, xanh duong, vang)
- Khong nen mau

#### 7. Canh bao chua thanh toan

**Truoc**: `bg-amber-50 border border-amber-200 rounded-lg`
**Sau**: `border rounded-lg` + icon va text `text-amber-600`

#### 8. Tong hop thanh toan

- Dong "CON LAI": Giam tu `text-lg` xuong `text-sm font-semibold`
- Bo dau `+` truoc cac dong phu thu (khong can thiet, da co nhan mo ta)
- Cac dong giam gia (coc, da TT): Giu `text-green-600`
- Cac dong tang gia (phu thu, den bu): Chi dung mau chu, khong dung `+`

#### 9. Room header trong Collapsible

- Bo `border-blue-200` khi selected, chi dung `border` mac dinh
- Badge "Da tra" chuyen tu `variant="secondary"` thanh text `text-muted-foreground` don gian

#### 10. Progress Warning

**Truoc**: `bg-amber-50 border border-amber-200 rounded-lg`
**Sau**: `border rounded-lg` + text `text-amber-600`

### CU THE FILE THAY DOI

| File | Thay doi |
|------|---------|
| `GroupCheckoutDialog.tsx` | Loai bo tat ca `bg-*-50`, `border-*-200`, chuyen sang semantic text colors. Giam kich thuoc "CON LAI". Don gian hoa badges. |
| `InspectionStatusCard.tsx` | Loai bo `bg-blue-50`, `bg-amber-50`, `bg-green-50`, chuyen sang `border` mac dinh voi text semantic. |

### KET QUA MONG DOI

Giao dien se tro nen:
- **Sach se, chuyen nghiep** - it mau sac, nhieu khoang trang
- **De doc** - thong tin phan cap ro rang bang font-weight va text-color
- **Nhat quan** - toan bo dung cung design system Enterprise SaaS
- **Khong "mau me"** - chi dung mau khi can thiet (semantic: loi/canh bao/thanh cong)

