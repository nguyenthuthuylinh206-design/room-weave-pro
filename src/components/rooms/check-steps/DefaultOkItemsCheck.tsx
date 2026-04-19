import { useEffect, useMemo, useState } from 'react'
import { Search, Check, AlertCircle, X, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { ReportIssueSheet, type IssueAction } from './ReportIssueSheet'
import type {
  RoomItemWithDetails,
  LaundryItem,
  ConsumedItem,
  LostItem,
  ReplacedItem,
  DamagedItem,
} from '@/types/rooms.types'
import type { ItemType } from '@/types/items.types'
import { getCheckTypeConfig, type CheckType } from '@/lib/roomCheckConfig'

interface ExtendedRoomItem extends RoomItemWithDetails {
  item_type: ItemType
  category_name: string | null
  category_id: string | null
}

interface CategoryGroup {
  id: string
  name: string
  items: ExtendedRoomItem[]
}

export interface DefaultOkItemsCheckProps {
  items: RoomItemWithDetails[]
  checkType: CheckType
  phase?: 1 | 2
  // State from parent
  laundryItems: LaundryItem[]
  consumedItems: ConsumedItem[]
  lostItems: LostItem[]
  replacedItems: ReplacedItem[]
  damagedItems: DamagedItem[]
  missingItems?: { item_id: string; quantity?: number; missing_quantity?: number }[]
  // Handlers (mirror CategoryBasedItemsCheck)
  onLinenStatusChange: (item: RoomItemWithDetails, status: 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'missing', quantity: number) => void
  onMarkConsumed: (item: RoomItemWithDetails, quantity: number, needRefill: boolean) => void
  onEquipmentLost: (item: RoomItemWithDetails, quantity: number, estimatedValue?: number) => void
  onMarkDamaged: (item: RoomItemWithDetails, info: { damage_type: 'repairable' | 'replacement_needed'; damage_cost: number; notes?: string; quantity?: number; item_type?: ItemType }) => void
  onResetLinen: (itemId: string) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromConsumed: (itemId: string) => void
  onRemoveFromDamaged: (itemId: string) => void
}

type ItemStatus = 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'damaged' | 'missing' | 'consumed'

const STATUS_LABELS: Record<ItemStatus, { label: string; color: string }> = {
  ok:       { label: 'OK',     color: 'text-green-600' },
  laundry:  { label: 'Giặt',   color: 'text-blue-600' },
  add:      { label: 'Thêm',   color: 'text-green-600' },
  change:   { label: 'Đổi',    color: 'text-primary' },
  lost:     { label: 'Mất',    color: 'text-destructive' },
  damaged:  { label: 'Hỏng',   color: 'text-amber-600' },
  missing:  { label: 'Thiếu',  color: 'text-amber-700' },
  consumed: { label: 'Đã dùng', color: 'text-cyan-600' },
}

export function DefaultOkItemsCheck({
  items,
  checkType,
  phase,
  laundryItems,
  consumedItems,
  lostItems,
  replacedItems,
  damagedItems,
  missingItems = [],
  onLinenStatusChange,
  onMarkConsumed,
  onEquipmentLost,
  onMarkDamaged,
  onResetLinen,
  onRemoveFromLost,
  onRemoveFromConsumed,
  onRemoveFromDamaged,
}: DefaultOkItemsCheckProps) {
  const config = getCheckTypeConfig(checkType)
  const [enriched, setEnriched] = useState<ExtendedRoomItem[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sheetItem, setSheetItem] = useState<ExtendedRoomItem | null>(null)

  // Fetch item details
  useEffect(() => {
    const fetchDetails = async () => {
      if (items.length === 0) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      const ids = items.map(i => i.item_id)
      const { data } = await supabase
        .from('items')
        .select('id, item_type, quantity_in_stock, category_id, item_categories(id, name, default_item_type)')
        .in('id', ids)

      const newStock: Record<string, number> = {}
      const enrichedItems: ExtendedRoomItem[] = items.map(item => {
        const d = data?.find(x => x.id === item.item_id)
        const cat = d?.item_categories as { id: string; name: string; default_item_type: ItemType | null } | null
        newStock[item.item_id] = d?.quantity_in_stock || 0
        return {
          ...item,
          item_type: (d?.item_type as ItemType) ?? (cat?.default_item_type as ItemType) ?? 'equipment',
          category_name: cat?.name || 'Khác',
          category_id: cat?.id || null,
        }
      })
      setStockMap(newStock)
      setEnriched(enrichedItems)
      setIsLoading(false)
    }
    fetchDetails()
  }, [items])

  // Group by category
  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, CategoryGroup>()
    enriched.forEach(item => {
      const key = item.category_name || 'Khác'
      const ex = map.get(key)
      if (ex) ex.items.push(item)
      else map.set(key, { id: item.category_id || key, name: key, items: [item] })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [enriched])

  // Compute status per item
  const getStatus = (itemId: string): ItemStatus | null => {
    const inLaundry = laundryItems.some(i => i.item_id === itemId)
    const inReplaced = replacedItems.some(i => i.item_id === itemId)
    if (inLaundry && inReplaced) return 'change'
    if (inLaundry) return 'laundry'
    if (inReplaced) return 'add'
    if (lostItems.some(i => i.item_id === itemId)) return 'lost'
    if (damagedItems.some(i => i.item_id === itemId)) return 'damaged'
    if (consumedItems.some(i => i.item_id === itemId)) return 'consumed'
    if (missingItems.some(i => i.item_id === itemId)) return 'missing'
    return null // null = mặc định OK
  }

  const getReportedQty = (itemId: string, status: ItemStatus): number => {
    switch (status) {
      case 'laundry': return laundryItems.find(i => i.item_id === itemId)?.quantity ?? 1
      case 'add':
      case 'change': return replacedItems.find(i => i.item_id === itemId)?.quantity ?? 1
      case 'lost': return lostItems.find(i => i.item_id === itemId)?.quantity ?? 1
      case 'damaged': return damagedItems.find(i => i.item_id === itemId)?.quantity ?? 1
      case 'consumed': return consumedItems.find(i => i.item_id === itemId)?.quantity ?? 1
      case 'missing': return missingItems.find(i => i.item_id === itemId)?.missing_quantity ?? missingItems.find(i => i.item_id === itemId)?.quantity ?? 1
      default: return 1
    }
  }

  // Get allowed actions per item
  const getAllowedActions = (itemType: ItemType): string[] => {
    if (checkType === 'checkout' && phase && config.phase1Actions && config.phase2Actions) {
      const p = phase === 1 ? config.phase1Actions : config.phase2Actions
      return (p[itemType] || []) as string[]
    }
    switch (itemType) {
      case 'linen': return config.linenActions
      case 'consumable': return config.consumableActions
      case 'equipment': return config.equipmentActions
      case 'furniture': return config.furnitureActions
    }
  }

  // Reset item về OK
  const resetItem = (item: ExtendedRoomItem) => {
    const status = getStatus(item.item_id)
    if (!status) return
    if (item.item_type === 'linen') {
      onResetLinen(item.item_id)
      return
    }
    if (status === 'lost') onRemoveFromLost(item.item_id)
    if (status === 'damaged') onRemoveFromDamaged(item.item_id)
    if (status === 'consumed') onRemoveFromConsumed(item.item_id)
    if (status === 'missing') onResetLinen(item.item_id)
  }

  // Apply issue from sheet
  const applyIssue = (item: ExtendedRoomItem, action: IssueAction) => {
    // Reset trước nếu đã có sự cố trước đó (cho phép sửa)
    const existing = getStatus(item.item_id)
    if (existing) resetItem(item)

    switch (action.type) {
      case 'laundry':
      case 'add':
      case 'change':
      case 'missing':
        onLinenStatusChange(item, action.type, action.quantity)
        break
      case 'lost':
        onEquipmentLost(item, action.quantity)
        break
      case 'damaged':
        onMarkDamaged(item, {
          damage_type: 'replacement_needed',
          damage_cost: 0,
          notes: action.notes,
          quantity: action.quantity,
          item_type: item.item_type,
        })
        break
      case 'consumed':
        onMarkConsumed(item, action.quantity, action.needRefill)
        break
      case 'empty':
        // 'empty' = consumable hết, dùng cùng flow consumed
        onMarkConsumed(item, action.quantity, action.needRefill)
        break
    }
  }

  // Filter by search
  const filterItems = (list: ExtendedRoomItem[]) => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(i =>
      i.item_name.toLowerCase().includes(q) ||
      (i.item_code || '').toLowerCase().includes(q)
    )
  }

  // Stats
  const totalItems = enriched.length
  const reportedCount = enriched.filter(i => getStatus(i.item_id) !== null).length
  const okCount = totalItems - reportedCount

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (totalItems === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Chưa có đồ dùng nào trong phòng này.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Banner trạng thái */}
      {reportedCount === 0 ? (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
          <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
            <Check className="h-5 w-5" strokeWidth={3} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-900">Mặc định: Tất cả OK</p>
            <p className="text-xs text-green-700 mt-0.5 leading-snug">
              Chạm vào món nào để báo sự cố. Không có vấn đề? Nhấn "Xác nhận phòng OK" bên dưới.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
          <div className="w-9 h-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-destructive">
              Đã ghi nhận {reportedCount} sự cố
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Các món khác mặc định OK. Chạm vào sự cố để sửa, hoặc tiếp tục.
            </p>
          </div>
        </div>
      )}

      {/* Search khi nhiều đồ */}
      {totalItems > 8 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm đồ dùng..."
            className="pl-9 h-10"
          />
        </div>
      )}

      {/* Groups by category */}
      {groups.map(group => {
        const filtered = filterItems(group.items)
        if (filtered.length === 0) return null
        const groupReported = group.items.filter(i => getStatus(i.item_id) !== null).length

        return (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.name}
              </h3>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {groupReported > 0 ? `${groupReported} sự cố` : `${group.items.length} món`}
              </span>
            </div>

            <div className="space-y-2">
              {filtered.map(item => {
                const status = getStatus(item.item_id)
                const isOk = status === null
                const reportedQty = status ? getReportedQty(item.item_id, status) : 0
                const stdQty = item.standard_quantity || 1
                const statusInfo = status ? STATUS_LABELS[status] : null
                const allowedActions = getAllowedActions(item.item_type)

                return (
                  <button
                    key={item.item_id}
                    type="button"
                    onClick={() => setSheetItem(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 min-h-[64px] rounded-xl border text-left transition-all active:scale-[0.99]',
                      isOk && 'bg-card border-border hover:bg-muted/40',
                      !isOk && (status === 'damaged' || status === 'missing'
                        ? 'bg-amber-50/60 border-amber-300'
                        : status === 'lost'
                        ? 'bg-destructive/5 border-destructive/40'
                        : 'bg-blue-50/40 border-blue-300')
                    )}
                  >
                    {/* Status circle */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2',
                        isOk && 'bg-green-50 border-green-500 text-green-600',
                        !isOk && (status === 'damaged' || status === 'missing'
                          ? 'bg-amber-100 border-amber-500 text-amber-700'
                          : status === 'lost'
                          ? 'bg-destructive/10 border-destructive text-destructive'
                          : 'bg-blue-100 border-blue-500 text-blue-700')
                      )}
                    >
                      {isOk ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : status === 'lost' ? (
                        <X className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[15px] font-semibold leading-tight truncate">
                          {item.item_name}
                        </p>
                        {stdQty > 1 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            ×{stdQty}
                          </span>
                        )}
                      </div>
                      {isOk ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Mặc định OK · Chạm để báo sự cố
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-5 px-1.5 text-[10px] font-bold border-current',
                              statusInfo?.color
                            )}
                          >
                            {statusInfo?.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {reportedQty}/{stdQty}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: action hint or reset */}
                    {isOk ? (
                      <div className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-md shrink-0">
                        Báo sự cố
                      </div>
                    ) : (
                      <div
                        role="button"
                        aria-label="Bỏ báo cáo"
                        onClick={(e) => {
                          e.stopPropagation()
                          resetItem(item)
                        }}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted active:bg-muted/80"
                      >
                        <X className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Tóm tắt cuối */}
      <div className="text-center text-[11px] text-muted-foreground py-2">
        {okCount} món OK · {reportedCount} sự cố · Tổng {totalItems}
      </div>

      {/* Bottom sheet báo sự cố */}
      <ReportIssueSheet
        open={!!sheetItem}
        onOpenChange={(open) => !open && setSheetItem(null)}
        itemName={sheetItem?.item_name || ''}
        itemType={sheetItem?.item_type || 'equipment'}
        standardQuantity={sheetItem?.standard_quantity || 1}
        availableStock={sheetItem ? stockMap[sheetItem.item_id] : 0}
        allowedActions={sheetItem ? getAllowedActions(sheetItem.item_type) : []}
        onSubmit={(action) => sheetItem && applyIssue(sheetItem, action)}
      />
    </div>
  )
}
