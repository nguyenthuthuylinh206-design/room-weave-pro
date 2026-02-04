

## Kết quả kiểm tra: Các lỗi còn lại trong quy trình Lô Giặt Nháp

### TỔNG QUAN

Sau khi kiểm tra toàn bộ quy trình, tôi phát hiện **6 vấn đề** cần sửa:

---

### VẤN ĐỀ 1: Thiếu xử lý URL query param `sendBatch` (CRITICAL)

**Mô tả**: BatchDetailPage điều hướng đến `/laundry/requests?sendBatch=${id}` khi nhấn "Gửi đi giặt", nhưng LaundryRequestsTab KHÔNG xử lý query param này.

**Hậu quả**: Khi click "Gửi đi giặt" từ trang chi tiết draft batch, dialog gửi lô giặt KHÔNG tự động mở.

**Giải pháp**:
- Sửa `LaundryDashboardPage.tsx` hoặc `LaundryRequestsTab.tsx` để:
  - Đọc query param `sendBatch`
  - Tự động chuyển sang tab "requests" 
  - Tự động mở `SendLaundryBatchDialog` với batchId từ param

---

### VẤN ĐỀ 2: Thiếu translation cho status "draft" (LOW)

**Mô tả**: Các file translation `laundry.json` thiếu key `status.draft`.

**Files cần sửa**:
- `src/i18n/locales/vi/laundry.json`: Thêm `"draft": "Nháp"` vào object `status`
- `src/i18n/locales/en/laundry.json`: Thêm `"draft": "Draft"` vào object `status`

**Translation cần thêm**:
```json
"status": {
  "draft": "Nháp",  // VI
  "draft": "Draft",  // EN
  ...
}
```

Và thêm vào `batchDetail.timeline`:
```json
"timeline": {
  "draft": "Nháp",  // VI
  "draft": "Draft",  // EN
  ...
}
```

---

### VẤN ĐỀ 3: BatchStatusTimeline không hiển thị step "draft" (MEDIUM)

**Mô tả**: Component `BatchStatusTimeline.tsx` chỉ hiển thị các bước từ "delivered" → "stocked", không có step cho "draft".

**Hậu quả**: Khi xem draft batch, timeline hiển thị không chính xác.

**Giải pháp**:
- Thêm step đầu tiên "draft" khi batch.status === 'draft'
- Điều kiện hiển thị: chỉ hiện draft step khi batch là draft

---

### VẤN ĐỀ 4: Thiếu logic load batch cụ thể khi mở SendLaundryBatchDialog (MEDIUM)

**Mô tả**: Hiện tại `SendLaundryBatchDialog` nhận batch từ `useDraftLaundryBatch()` hook chỉ trả về draft batch của hôm nay. Nhưng khi navigate từ BatchDetailPage với `sendBatch` param, cần load batch cụ thể theo ID.

**Giải pháp**:
- Khi có `sendBatch` query param → Load batch theo ID đó thay vì dùng draft batch mặc định

---

### VẤN ĐỀ 5: Có thể xem batch detail của draft nhưng URL không đúng (LOW)

**Mô tả**: Sau khi xử lý xong, nút "Gửi đi giặt" trong BatchDetailPage điều hướng đến `/laundry/requests?sendBatch=${id}` nhưng route này là Dashboard page, không phải Requests page riêng.

**Hiện trạng**: Đây là do thiết kế UI - tab "Yêu cầu từ phòng" nằm trong Dashboard, nên URL là `/laundry?tab=requests`. Cần điều chỉnh navigation path.

**Giải pháp**: Sửa navigation thành `/laundry?tab=requests&sendBatch=${id}`

---

### VẤN ĐỀ 6: Thiếu nút xóa items khỏi draft batch (ENHANCEMENT)

**Mô tả**: Hiện tại chỉ có thể thêm items vào draft batch, nhưng KHÔNG có chức năng xóa items nếu thêm nhầm.

**Giải pháp** (tùy chọn):
- Thêm nút xóa item trong BatchItemsTable khi status === 'draft'
- Tạo RPC `remove_item_from_draft_batch`

---

## KẾ HOẠCH THỰC HIỆN

| # | Task | Độ phức tạp | Files |
|---|------|-------------|-------|
| 1 | Xử lý query param `sendBatch` và tự động mở dialog | **Cao** | `LaundryDashboardPage.tsx`, `LaundryRequestsTab.tsx` |
| 2 | Sửa navigation path trong BatchDetailPage | **Thấp** | `BatchDetailPage.tsx`, `MobileBatchDetail.tsx` |
| 3 | Thêm translation cho status "draft" | **Thấp** | `laundry.json` (vi + en) |
| 4 | Cập nhật BatchStatusTimeline cho draft | **Trung bình** | `BatchStatusTimeline.tsx` |
| 5 | Load batch cụ thể theo ID từ param | **Trung bình** | `LaundryRequestsTab.tsx` |

---

## CHI TIẾT THAY ĐỔI

### 1. LaundryDashboardPage.tsx

```typescript
// Thêm xử lý sendBatch param
const sendBatchId = searchParams.get('sendBatch')

useEffect(() => {
  if (sendBatchId) {
    // Auto switch to requests tab
    setSearchParams({ tab: 'requests', sendBatch: sendBatchId })
  }
}, [sendBatchId])
```

### 2. LaundryRequestsTab.tsx

```typescript
// Thêm logic đọc sendBatch param và mở dialog
const [searchParams] = useSearchParams()
const sendBatchParam = searchParams.get('sendBatch')

// State cho batch được chọn để gửi
const [selectedBatchForSend, setSelectedBatchForSend] = useState<string | null>(null)

// Thêm query để load batch theo ID khi có param
const { data: batchToSend } = useQuery({
  queryKey: ['laundry-batch-to-send', sendBatchParam],
  queryFn: async () => {
    if (!sendBatchParam) return null
    const { data } = await supabase
      .from('laundry_batches')
      .select('id, batch_code, total_items, total_weight_kg')
      .eq('id', sendBatchParam)
      .single()
    return data
  },
  enabled: !!sendBatchParam
})

// Auto open dialog when batchToSend loaded
useEffect(() => {
  if (batchToSend) {
    setSendBatchDialogOpen(true)
  }
}, [batchToSend])
```

### 3. BatchDetailPage.tsx & MobileBatchDetail.tsx

```typescript
// Sửa navigation path
// Trước:
navigate(`/laundry/requests?sendBatch=${id}`)

// Sau:
navigate(`/laundry?tab=requests&sendBatch=${id}`)
```

### 4. laundry.json translations

```json
// VI:
"status": {
  "draft": "Nháp",
  ...
},
"batchDetail": {
  "timeline": {
    "draft": "Nháp",
    ...
  }
}

// EN:
"status": {
  "draft": "Draft",
  ...
},
"batchDetail": {
  "timeline": {
    "draft": "Draft",
    ...
  }
}
```

### 5. BatchStatusTimeline.tsx

```typescript
// Thêm step draft nếu batch đang ở trạng thái draft
const steps = batch.status === 'draft' 
  ? [
      {
        key: 'draft',
        label: t('batchDetail.timeline.draft'),
        date: batch.created_at,
        completed: true,
      }
    ]
  : [
      // existing steps: delivered, washing, ready, received, stocked
      ...
    ]
```

---

## KẾT QUẢ MONG ĐỢI

| Flow | Trước | Sau |
|------|-------|-----|
| Click "Gửi đi giặt" từ BatchDetail | Điều hướng đến `/laundry/requests?sendBatch=id` nhưng dialog không mở | Dialog tự động mở với batch đã chọn |
| Xem draft batch timeline | Không hiển thị step draft | Hiển thị step "Nháp" đầu tiên |
| Filter batches by draft | Hiển thị "draft" hardcoded | Hiển thị translation "Nháp" |
| Toàn bộ flow draft → delivered | Hoạt động không trơn tru | Hoạt động hoàn chỉnh |

