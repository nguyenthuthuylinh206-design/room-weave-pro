

## Kế hoạch: Sửa lỗi không tạo yêu cầu bảo trì từ đồ bị hỏng

### VẤN ĐỀ ĐÃ XÁC ĐỊNH

Khi kiểm tra phòng và đánh dấu đồ bị hỏng (damaged), hệ thống gửi thông báo về đồ hỏng nhưng **KHÔNG tạo yêu cầu bảo trì** vì thiếu thông tin `item_type`.

### PHÂN TÍCH KỸ THUẬT

**Logic kiểm tra trong `createMaintenanceForDamagedItems`:**
```text
// useRoomChecks.ts - dòng 1527-1530
const equipmentTypes = ['equipment', 'furniture']
const maintenanceItems = damagedItems.filter(item => 
  equipmentTypes.includes(item.item_type || '')  // ← Kiểm tra item_type
)

if (maintenanceItems.length === 0) return []  // ← Không tạo nếu không match
```

**Dữ liệu thực tế trong database:**
```text
room_checks.items_damaged = [
  {
    "item_id": "...",
    "item_name": "Điện thoại bàn",
    "damage_cost": 225000,
    "damage_type": "repairable",
    "quantity": 1,
    "notes": "Hỏng dây"
    // ❌ THIẾU: "item_type": "equipment"
  }
]
```

**Kết quả:**
- `item.item_type` = `undefined`
- `item.item_type || ''` = `''`
- `equipmentTypes.includes('')` = `false`
- `maintenanceItems.length` = `0`
- **Không tạo yêu cầu bảo trì → Không có thông báo**

---

### NGUYÊN NHÂN GỐC

**File:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`

Hàm `handleMarkDamaged` (dòng 248-258) **không truyền `item_type`** khi tạo DamagedItem:

```typescript
const handleMarkDamaged = (item: RoomItemWithDetails, damageInfo: {...}) => {
  setDamagedItems(prev => [...prev, {
    item_id: item.item_id,
    item_name: item.item_name,
    item_code: item.item_code,
    quantity: 1,
    damage_type: damageInfo.damage_type,
    damage_cost: damageInfo.damage_cost,
    notes: damageInfo.notes,
    // ❌ THIẾU: item_type: (item as any).item_type
  }]);
};
```

Mặc dù `CategoryBasedItemsCheck` fetch và enrich `item_type` từ database, nhưng thông tin này **bị mất** khi gọi `onMarkDamaged`.

---

### GIẢI PHÁP

#### 1. Cập nhật interface `onMarkDamaged` để nhận thêm `item_type`

**File:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`

```typescript
// Sửa handleMarkDamaged để bao gồm item_type
const handleMarkDamaged = (
  item: RoomItemWithDetails, 
  damageInfo: { 
    damage_type: 'repairable' | 'replacement_needed'; 
    damage_cost: number; 
    notes?: string;
    item_type?: 'linen' | 'consumable' | 'equipment' | 'furniture';  // THÊM
  }
) => {
  setDamagedItems(prev => [...prev, {
    item_id: item.item_id,
    item_name: item.item_name,
    item_code: item.item_code,
    quantity: 1,
    damage_type: damageInfo.damage_type,
    damage_cost: damageInfo.damage_cost,
    notes: damageInfo.notes,
    item_type: damageInfo.item_type || (item as any).item_type,  // THÊM
  }]);
};
```

#### 2. Cập nhật `CategoryBasedItemsCheck` để truyền `item_type`

**File:** `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx`

```typescript
// Dòng 243-249: Thêm item_type vào damageInfo
case 'damaged':
  onMarkDamaged(item, {
    damage_type: action.damageType,
    damage_cost: action.damageCost,
    notes: action.notes,
    item_type: item.item_type,  // THÊM - item đã có item_type từ ExtendedRoomItem
  })
  break
```

#### 3. Cập nhật props interface

**File:** `src/components/rooms/check-steps/CategoryBasedItemsCheck.tsx`

```typescript
// Cập nhật type cho onMarkDamaged trong interface
onMarkDamaged: (
  item: RoomItemWithDetails, 
  damageInfo: { 
    damage_type: 'repairable' | 'replacement_needed'; 
    damage_cost: number; 
    notes?: string;
    item_type?: ItemType;  // THÊM
  }
) => void
```

---

### THAY ĐỔI CHI TIẾT

| # | File | Thay đổi |
|---|------|----------|
| 1 | `ItemsCheckStep.tsx` | Thêm `item_type` vào `handleMarkDamaged` và object DamagedItem |
| 2 | `CategoryBasedItemsCheck.tsx` | Truyền `item.item_type` khi gọi `onMarkDamaged` |
| 3 | `CategoryBasedItemsCheck.tsx` | Cập nhật interface props cho `onMarkDamaged` |
| 4 | `EquipmentTab.tsx` (nếu dùng) | Truyền `item_type` tương tự |
| 5 | `FurnitureTab.tsx` (nếu dùng) | Truyền `item_type` tương tự |

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| `items_damaged` không có `item_type` | `items_damaged` có `item_type: "equipment"` |
| `maintenanceItems.length = 0` | `maintenanceItems.length > 0` |
| Không tạo maintenance request | Tạo maintenance request thành công |
| Không có thông báo bảo trì | Có thông báo Telegram/Push/In-app |

**Flow sau khi sửa:**

```text
Nhân viên đánh dấu "Điện thoại bàn" hỏng
    ↓
DamagedItem = { item_name: "Điện thoại bàn", item_type: "equipment", ... }
    ↓
room_checks.items_damaged lưu với item_type
    ↓
createMaintenanceForDamagedItems filter → maintenanceItems = [1 item]
    ↓
Tạo maintenance_request "Sửa chữa Điện thoại bàn - Phòng P103"
    ↓
Gửi thông báo đến manager qua Push/In-app/Telegram
```

