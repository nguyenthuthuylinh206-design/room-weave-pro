import { useState, useEffect, useMemo } from 'react'
import { Search, CheckCircle2, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { CategoryGroup } from './item-type-tabs/CategoryGroup'
import { CategoryItemRow, type ItemAction } from './item-type-tabs/CategoryItemRow'
import { BulkActionsHeader } from './item-type-tabs/BulkActionsHeader'
import type { 
  RoomItemWithDetails, 
  LaundryItem, 
  ConsumedItem, 
  LostItem, 
  ReplacedItem,
  DamagedItem
} from '@/types/rooms.types'
import type { ItemType } from '@/types/items.types'
import { getCheckTypeConfig, type CheckType } from '@/lib/roomCheckConfig'
import { useToast } from '@/hooks/use-toast'

interface ExtendedRoomItem extends RoomItemWithDetails {
  item_type: ItemType
  category_name: string | null
  category_id: string | null
}

interface CategoryInfo {
  id: string
  name: string
  color: string | null
  icon: string | null
  items: ExtendedRoomItem[]
}

interface CategoryBasedItemsCheckProps {
  items: RoomItemWithDetails[]
  roomId: string
  hotelId: string
  tenantId: string
  bookingId?: string | null
  checkType: CheckType
  phase?: 1 | 2
  // State handlers from parent
  laundryItems: LaundryItem[]
  consumedItems: ConsumedItem[]
  lostItems: LostItem[]
  replacedItems: ReplacedItem[]
  damagedItems: DamagedItem[]
  onLinenStatusChange: (item: RoomItemWithDetails, status: 'ok' | 'laundry' | 'add' | 'change' | 'lost' | 'missing', quantity: number) => void
  onMarkConsumed: (item: RoomItemWithDetails, quantity: number, needRefill: boolean) => void
  onEquipmentLost: (item: RoomItemWithDetails, quantity: number, estimatedValue?: number) => void
  onMarkDamaged: (item: RoomItemWithDetails, damageInfo: { damage_type: 'repairable' | 'replacement_needed'; damage_cost: number; notes?: string }) => void
  onResetLinen: (itemId: string) => void
  onRemoveFromLaundry: (itemId: string) => void
  onRemoveFromLost: (itemId: string) => void
  onRemoveFromReplaced: (itemId: string) => void
  onRemoveFromConsumed: (itemId: string) => void
  onRemoveFromDamaged: (itemId: string) => void
}

export function CategoryBasedItemsCheck({
  items,
  roomId,
  hotelId,
  tenantId,
  bookingId,
  checkType,
  phase,
  laundryItems,
  consumedItems,
  lostItems,
  replacedItems,
  damagedItems,
  onLinenStatusChange,
  onMarkConsumed,
  onEquipmentLost,
  onMarkDamaged,
  onResetLinen,
  onRemoveFromLaundry,
  onRemoveFromLost,
  onRemoveFromReplaced,
  onRemoveFromConsumed,
  onRemoveFromDamaged,
}: CategoryBasedItemsCheckProps) {
  const { toast } = useToast()
  const config = getCheckTypeConfig(checkType)
  
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [itemsWithDetails, setItemsWithDetails] = useState<ExtendedRoomItem[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [priceMap, setPriceMap] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  // Fetch item details (item_type, category, stock, price)
  useEffect(() => {
    const fetchItemDetails = async () => {
      if (items.length === 0) {
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      const itemIds = items.map(i => i.item_id)
      
      const { data } = await supabase
        .from('items')
        .select('id, item_type, quantity_in_stock, unit_price, category_id, item_categories(id, name, color, icon)')
        .in('id', itemIds)
      
      if (data) {
        const newStockMap: Record<string, number> = {}
        const newPriceMap: Record<string, number> = {}
        
        const enrichedItems = items.map(item => {
          const itemData = data.find(d => d.id === item.item_id)
          const category = itemData?.item_categories as { id: string; name: string; color: string | null; icon: string | null } | null
          
          newStockMap[item.item_id] = itemData?.quantity_in_stock || 0
          newPriceMap[item.item_id] = itemData?.unit_price || 0
          
          return {
            ...item,
            item_type: (itemData?.item_type as ItemType) || 'equipment',
            category_name: category?.name || 'Khác',
            category_id: category?.id || null,
          }
        })
        
        setStockMap(newStockMap)
        setPriceMap(newPriceMap)
        setItemsWithDetails(enrichedItems)
      } else {
        setItemsWithDetails(items.map(item => ({
          ...item,
          item_type: 'equipment' as ItemType,
          category_name: 'Khác',
          category_id: null,
        })))
      }
      setIsLoading(false)
    }

    fetchItemDetails()
  }, [items])

  // Group items by category
  const categories = useMemo(() => {
    const categoryMap = new Map<string, CategoryInfo>()
    
    itemsWithDetails.forEach(item => {
      const categoryName = item.category_name || 'Khác'
      const existing = categoryMap.get(categoryName)
      
      if (existing) {
        existing.items.push(item)
      } else {
        categoryMap.set(categoryName, {
          id: item.category_id || categoryName,
          name: categoryName,
          color: null,
          icon: null,
          items: [item],
        })
      }
    })
    
    // Sort categories by name
    return Array.from(categoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name, 'vi')
    )
  }, [itemsWithDetails])

  // Get allowed actions based on phase and checkType
  const getAllowedActions = (itemType: ItemType): string[] => {
    if (checkType === 'checkout' && phase && config.phase1Actions && config.phase2Actions) {
      const phaseActions = phase === 1 ? config.phase1Actions : config.phase2Actions
      switch (itemType) {
        case 'linen': return phaseActions.linen || []
        case 'consumable': return phaseActions.consumable || []
        case 'equipment': return phaseActions.equipment || []
        case 'furniture': return phaseActions.furniture || []
      }
    }
    
    switch (itemType) {
      case 'linen': return config.linenActions || []
      case 'consumable': return config.consumableActions || []
      case 'equipment': return config.equipmentActions || []
      case 'furniture': return config.furnitureActions || []
    }
  }

  // Get item status
  const getItemStatus = (itemId: string, itemType: ItemType) => {
    const inLaundry = laundryItems.some(i => i.item_id === itemId)
    const inReplaced = replacedItems.some(i => i.item_id === itemId)
    const inLost = lostItems.some(i => i.item_id === itemId)
    const inDamaged = damagedItems.some(i => i.item_id === itemId)
    const inConsumed = consumedItems.some(i => i.item_id === itemId)
    
    if (inLaundry && inReplaced) return 'change' as const
    if (inLaundry && !inReplaced) return 'laundry' as const
    if (!inLaundry && inReplaced) return 'add' as const
    if (inLost) return 'lost' as const
    if (inDamaged) return 'damaged' as const
    if (inConsumed) return 'consumed' as const
    if (checkedItems.has(itemId)) return 'ok' as const
    return 'pending' as const
  }

  // Handle item action
  const handleItemAction = (item: ExtendedRoomItem, action: ItemAction) => {
    switch (action.type) {
      case 'ok':
        setCheckedItems(prev => new Set(prev).add(item.item_id))
        break
      case 'laundry':
        onLinenStatusChange(item, 'laundry', action.quantity)
        toast({ title: 'Lấy giặt', description: `${action.quantity}x ${item.item_name}` })
        break
      case 'add':
        onLinenStatusChange(item, 'add', action.quantity)
        toast({ title: 'Bổ sung đồ', description: `${action.quantity}x ${item.item_name}` })
        break
      case 'change':
        onLinenStatusChange(item, 'change', action.quantity)
        toast({ title: 'Thay đổi', description: `${action.quantity}x ${item.item_name}` })
        break
      case 'lost':
        onEquipmentLost(item, action.quantity, action.estimatedValue)
        toast({ title: 'Đã đánh dấu mất', description: item.item_name, variant: 'destructive' })
        break
      case 'damaged':
        onMarkDamaged(item, {
          damage_type: action.damageType,
          damage_cost: action.damageCost,
          notes: action.notes,
        })
        toast({ title: 'Đã đánh dấu hỏng', description: item.item_name })
        break
      case 'missing':
        onLinenStatusChange(item, 'missing', action.quantity)
        toast({ title: 'Thiếu đồ', description: `${item.item_name}: thiếu ${action.quantity}` })
        break
      case 'consumed':
        onMarkConsumed(item, action.quantity, action.needRefill)
        toast({ title: 'Đã ghi nhận', description: `${action.quantity}x ${item.item_name}` })
        break
    }
  }

  // Handle reset item
  const handleResetItem = (item: ExtendedRoomItem) => {
    const status = getItemStatus(item.item_id, item.item_type)
    
    if (item.item_type === 'linen') {
      onResetLinen(item.item_id)
    } else {
      if (status === 'lost') onRemoveFromLost(item.item_id)
      if (status === 'damaged') onRemoveFromDamaged(item.item_id)
      if (status === 'consumed') onRemoveFromConsumed(item.item_id)
    }
    
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(item.item_id)
      return newSet
    })
  }

  // Filter items by search
  const filterBySearch = (categoryItems: ExtendedRoomItem[]) => {
    if (!search) return categoryItems
    return categoryItems.filter(item => 
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Calculate progress
  const getCheckedCount = () => {
    const allTrackedIds = new Set([
      ...laundryItems.map(i => i.item_id),
      ...consumedItems.map(i => i.item_id),
      ...lostItems.map(i => i.item_id),
      ...replacedItems.map(i => i.item_id),
      ...damagedItems.map(i => i.item_id),
      ...checkedItems,
    ])
    return allTrackedIds.size
  }

  const totalItems = itemsWithDetails.length
  const checkedCount = getCheckedCount()
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0

  // Handle mark all OK in a category
  const handleCategoryMarkAllOk = (categoryItems: ExtendedRoomItem[]) => {
    categoryItems.forEach(item => {
      const status = getItemStatus(item.item_id, item.item_type)
      if (status === 'pending') {
        setCheckedItems(prev => new Set(prev).add(item.item_id))
      }
    })
  }

  // Get filtered items for active tab
  const getFilteredItems = () => {
    if (activeTab === 'all') {
      return filterBySearch(itemsWithDetails)
    }
    const category = categories.find(c => c.id === activeTab || c.name === activeTab)
    return category ? filterBySearch(category.items) : []
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Sticky Progress Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur -mx-4 px-4 py-1.5 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${progressPercent === 100 ? 'text-green-600' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium tabular-nums">
              {checkedCount}/{totalItems}
            </span>
            <Progress value={progressPercent} className="w-16 h-1.5" />
          </div>
          
          {/* Compact summary badges */}
          <div className="flex items-center gap-1 text-xs">
            {laundryItems.length > 0 && (
              <span className="text-blue-600">{laundryItems.length} giặt</span>
            )}
            {lostItems.length > 0 && (
              <span className="text-destructive">{lostItems.length} mất</span>
            )}
            {damagedItems.length > 0 && (
              <span className="text-amber-600">{damagedItems.length} hỏng</span>
            )}
            {progressPercent === 100 && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs border-green-500 text-green-600 bg-green-50">
                ✓
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Compact Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Tabs by Category */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-0.5 bg-transparent p-0">
          <TabsTrigger 
            value="all" 
            className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-muted"
          >
            <Package className="h-3.5 w-3.5" />
            Tất cả
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {totalItems}
            </Badge>
          </TabsTrigger>
          
          {categories.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-muted"
            >
              {category.name}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {category.items.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All items tab */}
        <TabsContent value="all" className="mt-4">
          <div className="space-y-3">
            <BulkActionsHeader
              totalItems={totalItems}
              checkedCount={checkedCount}
              onMarkAllOk={() => {
                itemsWithDetails.forEach(item => {
                  const status = getItemStatus(item.item_id, item.item_type)
                  if (status === 'pending') {
                    setCheckedItems(prev => new Set(prev).add(item.item_id))
                  }
                })
              }}
            />

            {categories.map((category) => {
              const filteredItems = filterBySearch(category.items)
              if (filteredItems.length === 0) return null
              
              const categoryCheckedCount = category.items.filter(item => 
                getItemStatus(item.item_id, item.item_type) !== 'pending'
              ).length
              
              return (
                <CategoryGroup
                  key={category.id}
                  categoryName={category.name}
                  itemCount={category.items.length}
                  checkedCount={categoryCheckedCount}
                  actions={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-green-600"
                      onClick={() => handleCategoryMarkAllOk(category.items)}
                    >
                      Tất cả OK
                    </Button>
                  }
                >
                  <div className="divide-y-0">
                    {filteredItems.map(item => {
                      const status = getItemStatus(item.item_id, item.item_type)
                      const allowedActions = getAllowedActions(item.item_type)
                      
                      return (
                        <CategoryItemRow
                          key={item.item_id}
                          item={item}
                          itemType={item.item_type}
                          status={status}
                          availableStock={stockMap[item.item_id]}
                          unitPrice={priceMap[item.item_id]}
                          allowedActions={allowedActions}
                          onAction={(action) => handleItemAction(item, action)}
                          onReset={() => handleResetItem(item)}
                        />
                      )
                    })}
                  </div>
                </CategoryGroup>
              )
            })}
          </div>
        </TabsContent>

        {/* Individual category tabs */}
        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-4">
            <div className="space-y-3">
              <BulkActionsHeader
                totalItems={category.items.length}
                checkedCount={category.items.filter(item => 
                  getItemStatus(item.item_id, item.item_type) !== 'pending'
                ).length}
                onMarkAllOk={() => handleCategoryMarkAllOk(category.items)}
              />

              <div className="border rounded-lg divide-y-0">
                {filterBySearch(category.items).map(item => {
                  const status = getItemStatus(item.item_id, item.item_type)
                  const allowedActions = getAllowedActions(item.item_type)
                  
                  return (
                    <CategoryItemRow
                      key={item.item_id}
                      item={item}
                      itemType={item.item_type}
                      status={status}
                      availableStock={stockMap[item.item_id]}
                      unitPrice={priceMap[item.item_id]}
                      allowedActions={allowedActions}
                      onAction={(action) => handleItemAction(item, action)}
                      onReset={() => handleResetItem(item)}
                    />
                  )
                })}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
