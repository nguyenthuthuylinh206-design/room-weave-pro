

## Kế hoạch: Sửa lỗi báo "Đã giao thành công" quá sớm

### NGUYÊN NHÂN GỐC

Luồng hiện tại:

```text
Ấn GIAO → RPC deliver_stop → onSuccess:
                              ├── toast.success("Đã giao hàng đến phòng") ← SAI! Báo sớm
                              └── navigate to Room Check
```

**Vấn đề**: Toast "Đã giao hàng đến phòng" xuất hiện **ngay khi gọi API** xong, trong khi nhân viên chưa thực sự:
1. Xác nhận đồ giao
2. Kiểm tra phòng
3. Hoàn tất Room Check

### GIẢI PHÁP

Thay đổi luồng: **Chỉ báo thành công khi hoàn tất Room Check**

```text
Ấn GIAO → RPC deliver_stop → onSuccess:
                              ├── toast.info("Đang chuyển đến kiểm tra phòng...") ← Thông báo đang xử lý
                              └── navigate to Room Check
                                      │
                                      ↓
                              Hoàn tất Room Check
                                      │
                                      ↓
                              toast.success("Đã hoàn tất giao hàng") ← Đúng thời điểm
```

---

### CHI TIẾT THAY ĐỔI

#### 1. Sửa `useDeliverStop` - Thay success bằng info

**File: `src/hooks/useRouteBatch.ts`**

```typescript
// TRƯỚC
onSuccess: async (result) => {
  queryClient.invalidateQueries({ queryKey: ['route-batches'] })
  // ...
  toast.success('Đã giao hàng đến phòng') // ← SAI
}

// SAU
onSuccess: async (result) => {
  queryClient.invalidateQueries({ queryKey: ['route-batches'] })
  // ...
  // Không báo success ở đây - sẽ báo khi hoàn tất Room Check
  // toast.info được xử lý ở component gọi
}
```

#### 2. Sửa `UnifiedRoomList` - Hiển thị thông báo phù hợp

**File: `src/components/distribution/components/UnifiedRoomList.tsx`**

```typescript
const handleDeliver = (stop: RouteStop) => {
  deliverStop.mutate(
    { roomOrderId: stop.id, roomInfo: { ... } },
    { 
      onSuccess: () => {
        onRefresh?.()
        toast.info('Đang chuyển đến bước kiểm tra phòng...') // Thông báo rõ ràng
        navigate(`/rooms/${stop.room_id}/check?type=delivery&...`)
      } 
    }
  )
}
```

#### 3. Sửa `RoomCheckPage` - Báo success khi hoàn tất

**File: `src/pages/rooms/RoomCheckPage.tsx`**

Trong hàm submit khi là type `delivery`, thêm toast success:

```typescript
const onSubmit = async (data) => {
  // ... xử lý submit
  
  if (data.check_type === 'delivery' && distributionOrderId) {
    toast.success('Đã hoàn tất giao hàng và kiểm tra phòng')
    navigate(`/inventory/distributions/${distributionOrderId}`)
  }
}
```

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/hooks/useRouteBatch.ts` | Xóa `toast.success('Đã giao hàng đến phòng')` trong `onSuccess` của `useDeliverStop` |
| `src/components/distribution/components/UnifiedRoomList.tsx` | Thêm `toast.info('Đang chuyển đến bước kiểm tra phòng...')` |
| `src/pages/rooms/RoomCheckPage.tsx` | Thêm `toast.success('Đã hoàn tất giao hàng và kiểm tra phòng')` khi submit thành công với type `delivery` |

---

### KẾT QUẢ MONG ĐỢI

| Thời điểm | Thông báo |
|-----------|-----------|
| Sau khi ấn GIAO | "Đang chuyển đến bước kiểm tra phòng..." (màu xanh dương/info) |
| Sau khi hoàn tất Room Check | "Đã hoàn tất giao hàng và kiểm tra phòng" (màu xanh lá/success) |

