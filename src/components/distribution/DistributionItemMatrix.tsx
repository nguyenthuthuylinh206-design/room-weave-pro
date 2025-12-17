import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Minus, Trash2, Package, Shirt, Zap, Armchair, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useItems } from '@/hooks/useItems'
import { useRooms } from '@/hooks/useRooms'
import { cn } from '@/lib/utils'
import type { ItemType } from '@/types/items.types'

export interface RoomItemAllocation {
  room_id: string
  items: {
    item_id: string
    quantity: number
  }[]
}

export interface StockValidation {
  isValid: boolean
  overStockItems: { itemId: string; itemName: string; requested: number; available: number }[]
}

interface DistributionItemMatrixProps {
  selectedRoomIds: string[]
  allocations: RoomItemAllocation[]
  onAllocationsChange: (allocations: RoomItemAllocation[]) => void
  onStockValidationChange?: (validation: StockValidation) => void
}

const ITEM_TYPE_CONFIG: Record<ItemType, { label: string; icon: typeof Package; color: string }> = {
  linen: { label: 'Đồ vải', icon: Shirt, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  consumable: { label: 'Tiêu hao', icon: Package, color: 'bg-green-500/10 text-green-600 border-green-200' },
  equipment: { label: 'Thiết bị', icon: Zap, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  furniture: { label: 'Nội thất', icon: Armchair, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
}

export function DistributionItemMatrix({
  selectedRoomIds,
  allocations,
  onAllocationsChange,
  onStockValidationChange,
}: DistributionItemMatrixProps) {
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [selectedType, setSelectedType] = useState<ItemType | 'all'>('all')
  
  const { data: itemsData } = useItems()
  const items = itemsData?.items || []
  const { data: rooms = [] } = useRooms()

  const roomsMap = useMemo(() => {
    const map = new Map<string, typeof rooms[0]>()
    rooms.forEach(r => map.set(r.id, r))
    return map
  }, [rooms])

  const selectedRooms = useMemo(() => {
    return selectedRoomIds
      .map(id => roomsMap.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.floor !== b!.floor) return a!.floor - b!.floor
        return a!.room_number.localeCompare(b!.room_number)
      }) as typeof rooms
  }, [selectedRoomIds, roomsMap])

  // Get unique items across all allocations
  const allocatedItemIds = useMemo(() => {
    const ids = new Set<string>()
    allocations.forEach(a => a.items.forEach(i => ids.add(i.item_id)))
    return Array.from(ids)
  }, [allocations])

  const getQuantity = (roomId: string, itemId: string): number => {
    const roomAlloc = allocations.find(a => a.room_id === roomId)
    const item = roomAlloc?.items.find(i => i.item_id === itemId)
    return item?.quantity || 0
  }

  const setQuantity = (roomId: string, itemId: string, quantity: number) => {
    const newAllocations = [...allocations]
    let roomAlloc = newAllocations.find(a => a.room_id === roomId)
    
    if (!roomAlloc) {
      roomAlloc = { room_id: roomId, items: [] }
      newAllocations.push(roomAlloc)
    }

    const itemIndex = roomAlloc.items.findIndex(i => i.item_id === itemId)
    
    if (quantity <= 0) {
      if (itemIndex >= 0) {
        roomAlloc.items.splice(itemIndex, 1)
      }
    } else {
      if (itemIndex >= 0) {
        roomAlloc.items[itemIndex].quantity = quantity
      } else {
        roomAlloc.items.push({ item_id: itemId, quantity })
      }
    }

    // Clean up empty allocations
    const cleaned = newAllocations.filter(a => a.items.length > 0)
    onAllocationsChange(cleaned)
  }

  const addItemToAllRooms = (itemId: string, quantity = 1) => {
    const newAllocations = selectedRoomIds.map(roomId => {
      const existing = allocations.find(a => a.room_id === roomId)
      const existingItems = existing?.items || []
      const itemExists = existingItems.find(i => i.item_id === itemId)
      
      return {
        room_id: roomId,
        items: itemExists 
          ? existingItems 
          : [...existingItems, { item_id: itemId, quantity }]
      }
    })
    onAllocationsChange(newAllocations.filter(a => a.items.length > 0))
    setItemSelectorOpen(false)
    setItemSearch('')
  }

  const removeItemFromAll = (itemId: string) => {
    const newAllocations = allocations.map(a => ({
      ...a,
      items: a.items.filter(i => i.item_id !== itemId)
    })).filter(a => a.items.length > 0)
    onAllocationsChange(newAllocations)
  }

  const setQuantityForAll = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromAll(itemId)
      return
    }

    const newAllocations = selectedRoomIds.map(roomId => {
      const existing = allocations.find(a => a.room_id === roomId)
      const existingItems = existing?.items || []
      const itemIndex = existingItems.findIndex(i => i.item_id === itemId)
      
      const newItems = [...existingItems]
      if (itemIndex >= 0) {
        newItems[itemIndex] = { ...newItems[itemIndex], quantity }
      } else {
        newItems.push({ item_id: itemId, quantity })
      }
      
      return { room_id: roomId, items: newItems }
    })
    onAllocationsChange(newAllocations)
  }

  // Filter available items (not yet allocated and has stock)
  const availableItems = useMemo(() => {
    return items
      .filter(item => item.quantity_in_stock > 0 && !allocatedItemIds.includes(item.id))
      .filter(item => selectedType === 'all' || item.item_type === selectedType)
      .filter(item => {
        if (!itemSearch) return true
        const search = itemSearch.toLowerCase()
        return (
          item.name.toLowerCase().includes(search) ||
          item.code.toLowerCase().includes(search) ||
          item.category_name?.toLowerCase().includes(search)
        )
      })
  }, [items, allocatedItemIds, selectedType, itemSearch])

  // Group available items by type
  const groupedItems = useMemo(() => {
    const groups: Record<ItemType, typeof items> = {
      linen: [],
      consumable: [],
      equipment: [],
      furniture: [],
    }
    availableItems.forEach(item => {
      const type = item.item_type as ItemType
      if (groups[type]) {
        groups[type].push(item)
      }
    })
    return groups
  }, [availableItems])

  const getTotalForItem = (itemId: string) => {
    return allocations.reduce((sum, a) => {
      const item = a.items.find(i => i.item_id === itemId)
      return sum + (item?.quantity || 0)
    }, 0)
  }

  const getItemStock = (itemId: string) => {
    return items.find(i => i.id === itemId)?.quantity_in_stock || 0
  }

  // Calculate stock validation
  const stockValidation = useMemo<StockValidation>(() => {
    const overStockItems: StockValidation['overStockItems'] = []
    
    allocatedItemIds.forEach(itemId => {
      const item = items.find(i => i.id === itemId)
      if (!item) return
      
      const total = getTotalForItem(itemId)
      if (total > item.quantity_in_stock) {
        overStockItems.push({
          itemId,
          itemName: item.name,
          requested: total,
          available: item.quantity_in_stock,
        })
      }
    })
    
    return {
      isValid: overStockItems.length === 0,
      overStockItems,
    }
  }, [allocatedItemIds, allocations, items])

  // Notify parent of validation changes - use ref to prevent infinite loop
  const prevValidationRef = useRef<string>('')
  useEffect(() => {
    const validationKey = JSON.stringify({
      isValid: stockValidation.isValid,
      items: stockValidation.overStockItems.map(i => i.itemId)
    })
    if (validationKey !== prevValidationRef.current) {
      prevValidationRef.current = validationKey
      onStockValidationChange?.(stockValidation)
    }
  }, [stockValidation, onStockValidationChange])

  if (selectedRoomIds.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        Vui lòng chọn phòng trước
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Item selector with Combobox */}
      <Popover open={itemSelectorOpen} onOpenChange={setItemSelectorOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Thêm sản phẩm...
            {availableItems.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {availableItems.length} sẵn có
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex flex-col">
            {/* Search input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm sản phẩm..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
            </div>
            
            {/* Type filter tabs */}
            <div className="border-b px-2 py-2">
              <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as ItemType | 'all')}>
                <TabsList className="h-8 w-full grid grid-cols-5">
                  <TabsTrigger value="all" className="text-xs px-2">Tất cả</TabsTrigger>
                  <TabsTrigger value="linen" className="text-xs px-2">
                    <Shirt className="h-3 w-3 mr-1" />
                    Vải
                  </TabsTrigger>
                  <TabsTrigger value="consumable" className="text-xs px-2">
                    <Package className="h-3 w-3 mr-1" />
                    TH
                  </TabsTrigger>
                  <TabsTrigger value="equipment" className="text-xs px-2">
                    <Zap className="h-3 w-3 mr-1" />
                    TB
                  </TabsTrigger>
                  <TabsTrigger value="furniture" className="text-xs px-2">
                    <Armchair className="h-3 w-3 mr-1" />
                    NT
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Items list - native scroll */}
            <ScrollArea className="max-h-[300px]">
              {availableItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Không tìm thấy sản phẩm
                </div>
              ) : selectedType === 'all' ? (
                // Show grouped by type
                Object.entries(groupedItems).map(([type, typeItems]) => {
                  if (typeItems.length === 0) return null
                  const config = ITEM_TYPE_CONFIG[type as ItemType]
                  const Icon = config.icon
                  
                  return (
                    <div key={type}>
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2 sticky top-0">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </div>
                      {typeItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => addItemToAllRooms(item.id, 1)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{item.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{item.code}</span>
                              {item.category_name && (
                                <>
                                  <span>•</span>
                                  <span>{item.category_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            Tồn: {item.quantity_in_stock}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )
                })
              ) : (
                // Show flat list for selected type
                availableItems.map(item => {
                  const config = ITEM_TYPE_CONFIG[item.item_type as ItemType]
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => addItemToAllRooms(item.id, 1)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{item.code}</span>
                          {item.category_name && (
                            <>
                              <span>•</span>
                              <span>{item.category_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", config?.color)}>
                        Tồn: {item.quantity_in_stock}
                      </Badge>
                    </div>
                  )
                })
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {allocatedItemIds.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Chưa có sản phẩm nào được thêm
        </div>
      ) : (
        <ScrollArea className="border rounded-lg">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px] border-r">
                    Sản phẩm
                  </TableHead>
                  <TableHead className="text-center min-w-[120px] bg-muted/30">
                    Tất cả phòng
                  </TableHead>
                  {selectedRooms.map(room => (
                    <TableHead key={room.id} className="text-center min-w-[90px]">
                      <div className="font-medium">{room.room_number}</div>
                      <div className="text-xs font-normal text-muted-foreground">T{room.floor}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedItemIds.map(itemId => {
                  const item = items.find(i => i.id === itemId)
                  if (!item) return null

                  const total = getTotalForItem(itemId)
                  const stock = getItemStock(itemId)
                  const isOverStock = total > stock
                  const config = ITEM_TYPE_CONFIG[item.item_type as ItemType]
                  const Icon = config?.icon || Package

                  return (
                    <TableRow key={itemId} className={isOverStock ? 'bg-destructive/5' : ''}>
                      <TableCell className="sticky left-0 bg-background z-10 border-r">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive shrink-0"
                            onClick={() => removeItemFromAll(itemId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={cn("h-5 px-1.5 shrink-0", config?.color)}>
                                <Icon className="h-3 w-3" />
                              </Badge>
                              <span className="font-medium text-sm truncate">{item.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Tồn: {stock} | Tổng: <span className={isOverStock ? 'text-destructive font-medium' : 'text-primary font-medium'}>{total}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="bg-muted/30">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const currentMin = Math.min(...selectedRoomIds.map(rid => getQuantity(rid, itemId)))
                              setQuantityForAll(itemId, Math.max(0, currentMin - 1))
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            className="w-14 h-7 text-center text-sm"
                            value={getQuantity(selectedRoomIds[0], itemId) || ''}
                            onChange={(e) => setQuantityForAll(itemId, parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const currentMax = Math.max(...selectedRoomIds.map(rid => getQuantity(rid, itemId)), 0)
                              setQuantityForAll(itemId, currentMax + 1)
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      {selectedRooms.map(room => {
                        const qty = getQuantity(room.id, itemId)
                        return (
                          <TableCell key={room.id}>
                            <div className="flex items-center justify-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setQuantity(room.id, itemId, qty - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={0}
                                className={cn(
                                  "w-12 h-6 text-center text-xs p-1",
                                  qty > 0 && "border-primary/50 bg-primary/5"
                                )}
                                value={qty || ''}
                                onChange={(e) => setQuantity(room.id, itemId, parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setQuantity(room.id, itemId, qty + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      )}

      {/* Summary */}
      {allocatedItemIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg flex-wrap">
          <Badge variant="outline">{selectedRoomIds.length} phòng</Badge>
          <Badge variant="outline">{allocatedItemIds.length} loại SP</Badge>
          <Badge variant="secondary">
            Tổng: {allocations.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0), 0)} đơn vị
          </Badge>
          {!stockValidation.isValid && (
            <Badge variant="destructive" className="ml-auto">
              ⚠ Vượt tồn kho
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
