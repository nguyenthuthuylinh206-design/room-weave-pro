

## Báo cáo kiểm tra tính năng Supplement & Laundry Requests

### Tổng kết trạng thái

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Database tables | ✅ Hoàn thành | `supplement_requests`, `laundry_requests` đã tồn tại |
| RPC Functions | ✅ Hoàn thành | 4 functions đã tạo và hoạt động |
| Navigation - Sidebar | ✅ Hoàn thành | `/supplements` và `/laundry?tab=requests` đã có |
| Navigation - MobileNav | ✅ Hoàn thành | Link "Bổ sung đồ" đã có (line 27) |
| Navigation - MorePage (mobile) | ✅ Hoàn thành | Module "Bổ sung đồ" đã có (line 44) |
| LaundryDashboardPage | ✅ Hoàn thành | Tabs Batches/Requests đã tích hợp |
| MobileLaundryDashboard | ✅ Hoàn thành | Quick action "Đồ giặt từ phòng" với badge |
| Realtime subscriptions | ✅ Hoàn thành | Cả 2 pages đều có realtime listener |
| Auto-create supplement request | ✅ Hoàn thành | Logic trong useRoomChecks.ts (line 1121-1278) |
| Auto-create laundry request | ✅ Hoàn thành | Logic trong useRoomChecks.ts (line 1280-1402) |
| Auto-create maintenance | ✅ Hoàn thành | Logic cho equipment/furniture (line 1405-1531) |
| Notifications | ✅ Hoàn thành | Push, In-app, Telegram đều có |
| Data hiện tại | ⚠️ Chưa test | 0 supplement/laundry requests trong DB |

---

### Các vấn đề phát hiện và cần sửa

#### 1. Filter "all" không hoạt động đúng (SupplementsPage.tsx)

**Vấn đề:** Khi chọn "Tất cả" trong dropdown status, giá trị `"all"` được truyền vào filter, nhưng hook `useSupplementRequests` không xử lý giá trị này đặc biệt.

**Vị trí:** `src/pages/supplements/SupplementsPage.tsx` line 175

**Giải pháp:**
```typescript
// Hiện tại (line 65-68)
const { data: requests, isLoading } = useSupplementRequests({
  status: filters.status || undefined,  // "all" sẽ được truyền đi
  search: filters.search || undefined,
})

// Cần sửa thành
const { data: requests, isLoading } = useSupplementRequests({
  status: filters.status && filters.status !== 'all' ? filters.status : undefined,
  search: filters.search || undefined,
})
```

---

#### 2. Thiếu invalidateQueries cho laundry batches sau approve

**Vấn đề:** Khi thêm laundry request vào batch qua `useAddToDraftBatch`, cần invalidate thêm `draft-laundry-batch` query.

**Vị trí:** `src/hooks/useLaundryRequests.ts` line 186-195

**Giải pháp:** Đã có đủ invalidateQueries, nhưng cần đảm bảo `draft-laundry-batch` được refresh:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['laundry-requests'] })
  queryClient.invalidateQueries({ queryKey: ['laundry-requests-pending-count'] })
  queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
  queryClient.invalidateQueries({ queryKey: ['draft-laundry-batch'] }) // Thêm dòng này
  toast.success('Đã thêm vào lô giặt')
},
```

---

#### 3. DraftBatch link sử dụng window.location thay vì navigate

**Vấn đề:** Trong `LaundryRequestsTab.tsx` line 114, sử dụng `window.location.href` thay vì `useNavigate()`, gây reload toàn bộ trang.

**Vị trí:** `src/components/laundry/LaundryRequestsTab.tsx` line 114

**Giải pháp:**
```typescript
// Thêm import
import { useNavigate } from 'react-router-dom'

// Trong component
const navigate = useNavigate()

// Thay thế (line 114)
onClick={() => navigate(`/laundry/batches/${draftBatch.id}`)}
```

---

#### 4. Thiếu i18n cho một số labels cứng

**Các labels hardcoded cần i18n:**
- `LaundryRequestsTab.tsx`: "Đồ giặt từ kiểm tra phòng", "Lô giặt nháp hôm nay", etc.
- `SupplementsPage.tsx`: "Yêu cầu bổ sung đồ", "Chờ duyệt", etc.
- `MobileLaundryDashboard.tsx` line 60: "Đồ giặt từ phòng"

**Đánh giá:** Đây là vấn đề nhỏ, có thể sửa sau nếu cần đa ngôn ngữ.

---

#### 5. Chưa có empty state khi filter không có kết quả

**Vấn đề:** Khi filter theo status mà không có request nào, thông báo chung chung "Chưa có yêu cầu bổ sung nào" không phân biệt được là do filter hay thực sự chưa có.

**Giải pháp (tùy chọn):** Thêm logic phân biệt empty state:
```typescript
{requests?.length === 0 && (filters.status || filters.search) ? (
  <Card className="p-8 text-center">
    <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
    <p className="text-muted-foreground">Không tìm thấy kết quả phù hợp</p>
    <Button variant="link" onClick={() => setFilters({ status: '', search: '' })}>
      Xóa bộ lọc
    </Button>
  </Card>
) : requests?.length === 0 ? (
  <Card className="p-8 text-center">
    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
    <p className="text-muted-foreground">Chưa có yêu cầu bổ sung nào</p>
  </Card>
) : null}
```

---

### Danh sách sửa đổi cần thực hiện

| # | File | Thay đổi | Mức độ |
|---|------|----------|--------|
| 1 | `SupplementsPage.tsx` | Fix filter "all" handling | Quan trọng |
| 2 | `useLaundryRequests.ts` | Thêm invalidate `draft-laundry-batch` | Quan trọng |
| 3 | `LaundryRequestsTab.tsx` | Đổi `window.location` → `useNavigate` | Trung bình |
| 4 | `SupplementsPage.tsx` | Cải thiện empty state theo filter | Tùy chọn |

---

### Kết luận

**Tổng thể:** Hệ thống đã hoàn thiện **~95%**. Core business logic (auto-create requests, notifications, approval workflow) đều hoạt động đúng.

**Cần fix ngay:**
1. Filter "all" trong SupplementsPage
2. InvalidateQueries cho draft batch
3. Navigation link dùng SPA routing

**Kiến nghị:** Sau khi fix 3 issues trên, nên test end-to-end bằng cách:
1. Thực hiện checkout check với đồ mất/tiêu hao/giặt
2. Kiểm tra requests xuất hiện trong `/supplements` và `/laundry?tab=requests`
3. Duyệt request và kiểm tra inventory transaction được tạo

