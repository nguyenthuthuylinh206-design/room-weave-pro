import { useState, useMemo, useEffect } from 'react'
import { Plus, Minus, ChevronDown, ChevronUp, Package, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useItems } from '@/hooks/useItems'
import { useRooms } from '@/hooks/useRooms'
import type { RoomItemAllocation, StockValidation } from './DistributionItemMatrix'

interface MobileDistributionItemAllocationProps {
  selectedRoomIds: string[]
  allocations: RoomItemAllocation[]
  onAllocationsChange: (allocations: RoomItemAllocation[]) => void
  onStockValidationChange?: (validation: StockValidation) => void
}

export function MobileDistributionItemAllocation({
  selectedRoomIds,
  allocations,
  onAllocationsChange,
  onStockValidationChange,
}: MobileDistributionItemAllocationProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set(selectedRoomIds.slice(0, 1)))
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

  const availableItems = useMemo(() => {
    return items.filter(item => item.quantity_in_stock > 0)
  }, [items])

  const getRoomAllocation = (roomId: string) => {
    return allocations.find(a => a.room_id === roomId)
  }

  const getItemQuantity = (roomId: string, itemId: string) => {
    const alloc = getRoomAllocation(roomId)
    return alloc?.items.find(i => i.item_id === itemId)?.quantity || 0
  }

  const setItemQuantity = (roomId: string, itemId: string, quantity: number) => {
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

    const cleaned = newAllocations.filter(a => a.items.length > 0)
    onAllocationsChange(cleaned)
  }

  const addItemToRoom = (roomId: string, itemId: string) => {
    if (!itemId) return
    setItemQuantity(roomId, itemId, 1)
  }

  const getTotalForItem = (itemId: string) => {
    return allocations.reduce((sum, a) => {
      const item = a.items.find(i => i.item_id === itemId)
      return sum + (item?.quantity || 0)
    }, 0)
  }

  // Calculate stock validation
  const stockValidation = useMemo<StockValidation>(() => {
    const overStockItems: StockValidation['overStockItems'] = []
    const checkedItems = new Set<string>()
    
    allocations.forEach(alloc => {
      alloc.items.forEach(allocItem => {
        if (checkedItems.has(allocItem.item_id)) return
        checkedItems.add(allocItem.item_id)
        
        const item = items.find(i => i.id === allocItem.item_id)
        if (!item) return
        
        const total = getTotalForItem(allocItem.item_id)
        if (total > item.quantity_in_stock) {
          overStockItems.push({
            itemId: allocItem.item_id,
            itemName: item.name,
            requested: total,
            available: item.quantity_in_stock,
          })
        }
      })
    })
    
    return {
      isValid: overStockItems.length === 0,
      overStockItems,
    }
  }, [allocations, items])

  useEffect(() => {
    onStockValidationChange?.(stockValidation)
  }, [stockValidation, onStockValidationChange])

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms)
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId)
    } else {
      newExpanded.add(roomId)
    }
    setExpandedRooms(newExpanded)
  }

  if (selectedRoomIds.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        Vui lòng chọn phòng trước
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stock validation warning */}
      {!stockValidation.isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Vượt tồn kho:</span>
            <ul className="mt-1 list-disc list-inside text-sm">
              {stockValidation.overStockItems.map(item => (
                <li key={item.itemId}>
                  {item.itemName}: {item.requested}/{item.available}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Room accordions */}
      {selectedRooms.map(room => {
        const roomAlloc = getRoomAllocation(room.id)
        const itemCount = roomAlloc?.items.length || 0
        const totalQty = roomAlloc?.items.reduce((s, i) => s + i.quantity, 0) || 0
        const isExpanded = expandedRooms.has(room.id)

        return (
          <Collapsible key={room.id} open={isExpanded} onOpenChange={() => toggleRoom(room.id)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>Phòng {room.room_number}</span>
                      <Badge variant="outline" className="text-xs">Tầng {room.floor}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {itemCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {itemCount} SP • {totalQty} đvị
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {/* Add item selector */}
                  <Select onValueChange={(val) => addItemToRoom(room.id, val)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="+ Thêm sản phẩm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableItems
                        .filter(item => !roomAlloc?.items.find(i => i.item_id === item.id))
                        .map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="text-muted-foreground text-xs">
                                (Tồn: {item.quantity_in_stock})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Item list */}
                  {roomAlloc?.items.map(allocItem => {
                    const item = items.find(i => i.id === allocItem.item_id)
                    if (!item) return null
                    
                    const total = getTotalForItem(allocItem.item_id)
                    const isOverStock = total > item.quantity_in_stock

                    return (
                      <div 
                        key={allocItem.item_id}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          isOverStock ? 'border-destructive bg-destructive/5' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Tồn: {item.quantity_in_stock} | Tổng giao: {total}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setItemQuantity(room.id, allocItem.item_id, allocItem.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            className="w-14 h-8 text-center text-sm"
                            value={allocItem.quantity}
                            onChange={(e) => setItemQuantity(room.id, allocItem.item_id, parseInt(e.target.value) || 0)}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setItemQuantity(room.id, allocItem.item_id, allocItem.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {(!roomAlloc || roomAlloc.items.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Chưa có sản phẩm
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}

      {/* Summary */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
        <Badge variant="outline">{selectedRoomIds.length} phòng</Badge>
        <Badge variant="secondary">
          {allocations.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0), 0)} đơn vị
        </Badge>
      </div>
    </div>
  )
}
