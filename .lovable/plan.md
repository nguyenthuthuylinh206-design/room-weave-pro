

## Phan tich logic - Cac van de can sua

### Bug 1: `canClose` - Loi operator precedence (NGHIEM TRONG)

**File**: `RouteDetailView.tsx` line 107-109

```typescript
// Hien tai - SAI:
const canClose = isLeader && 
    route?.status === 'completed' || 
    (route?.status === 'in_progress' && pendingStops === 0 && cannotAccessStops === 0)
```

Do uu tien toan tu, dieu nay evaluate thanh:
`(isLeader && completed) || (in_progress && ...)` -- bat ky ai (khong can isLeader) deu co the dong route khi in_progress.

**Fix**: Them ngoac:
```typescript
const canClose = isLeader && (
    route?.status === 'completed' || 
    (route?.status === 'in_progress' && pendingStops === 0 && cannotAccessStops === 0)
)
```

### Bug 2: Triple toast khi self-assign handover

Khi creator = assignee click "Kiem tra kho & Bat dau giao":
1. `useHandoverBatch.onSuccess` → toast "Da giao hang cho nhan vien thanh cong"
2. `useConfirmReceiveOrder.onSuccess` → toast "Da xac nhan nhan hang thanh cong"
3. `handleHandoverFirstBatch` → toast "Da kiem tra kho & bat dau giao hang"

User nhan 3 toast lien tiep. Can:
- Trong `handleHandoverFirstBatch`: khi auto-confirm, khong de `useHandoverBatch` va `useConfirmReceiveOrder` tu toast. Chi hien 1 toast duy nhat.
- Giai phap: Dung `mutateAsync` voi option `{ onSuccess: undefined }` khong co, nhung co the them flag hoac suppress toast bang cach kiem tra trong onSuccess.

**Fix thuc te**: Doi `useHandoverBatch.onSuccess` de khong toast khi caller se tu handle (self-assign). Hoac don gian hon: bo toast trong `useHandoverBatch.onSuccess` va `useConfirmReceiveOrder.onSuccess`, de caller tu toast. Nhung dieu nay anh huong cac flow khac.

**Fix tot nhat**: Them option `silent` vao mutation, hoac bo toast "Da giao hang..." trong `handleHandoverFirstBatch` khi self-assign (vi da co toast "Da kiem tra kho..."). Va suppress toast cua `useConfirmReceiveOrder` khi goi tu auto-confirm.

### Bug 3: Progress hien thi 2 noi

- DeliveryStepWizard (line 164-172): Hien progress bar + text khi `in_progress`
- Info bar (line 220-225): Cung hien progress bar + text

**Fix**: Bo progress trong info bar khi status la `in_progress` (wizard da co), hoac bo progress trong wizard va chi giu o info bar.

### Bug 4: `handleDeliver` goi RPC roi navigate room check

`deliver_stop` RPC danh dau stop la "delivered" trong DB TRUOC KHI room check xay ra. Neu user cancel room check, stop van da delivered. Logic nay co the la intentional (delivery confirmation tach biet voi room check), nhung can xac nhan.

### Van de nho khac

- **`isStorekeeper` cho phep `created_by`**: Bat ky ai tao phieu deu duoc coi la storekeeper, ke ca staff. Co the qua rong quyen.
- **Double data fetch**: `DistributionOrderDetailPage` dung `useDistributionOrderDetail` va `RouteDetailView` dung `useRouteDetail` -- fetch 2 lan du lieu tuong tu.

### Ke hoach fix

1. **Fix `canClose` precedence** - Them ngoac don
2. **Fix triple toast** - Suppress toast tu mutations khi auto-confirm, chi giu 1 toast cuoi
3. **Gop progress** - Bo progress trong info bar khi wizard da hien thi, hoac nguoc lai

**Files thay doi**: `RouteDetailView.tsx`, `useRouteBatch.ts`

