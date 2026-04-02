

## Fix: Thêm phòng miễn phí không cập nhật UI

### Nguyên nhân
`handleTrialAddRooms` gọi `supabase.update()` trực tiếp nhưng **không invalidate React Query cache**. Dữ liệu `registeredRooms` từ `useTenantSubscription` vẫn giữ giá trị cũ.

### Sửa

| File | Thay đổi |
|------|----------|
| `src/components/settings/subscription/AddRoomsDialog.tsx` | Import `useQueryClient`, sau khi update thành công gọi `invalidateQueries` cho các key: `tenant-subscription`, `actual-room-count`, `tenant-usage`, `check-quota` |

### Chi tiết
Thêm vào `handleTrialAddRooms` sau dòng `if (error) throw error`:
```typescript
const queryClient = useQueryClient();
// ... in handleTrialAddRooms after success:
queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
queryClient.invalidateQueries({ queryKey: ['actual-room-count'] });
queryClient.invalidateQueries({ queryKey: ['tenant-usage'] });
queryClient.invalidateQueries({ queryKey: ['check-quota'] });
```

