import { useMemo } from 'react'
import { Plus, Minus, Trash2 } from 'lucide-react'
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
import { useItems } from '@/hooks/useItems'
import { useRooms } from '@/hooks/useRooms'

export interface RoomItemAllocation {
  room_id: string
  items: {
    item_id: string
    quantity: number
  }[]
}

interface DistributionItemMatrixProps {
  selectedRoomIds: string[]
  allocations: RoomItemAllocation[]
  onAllocationsChange: (allocations: RoomItemAllocation[]) => void
}

export function DistributionItemMatrix({
  selectedRoomIds,
  allocations,
  onAllocationsChange,
}: DistributionItemMatrixProps) {
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

  const availableItems = items.filter(
    item => item.quantity_in_stock > 0 && !allocatedItemIds.includes(item.id)
  )

  const getTotalForItem = (itemId: string) => {
    return allocations.reduce((sum, a) => {
      const item = a.items.find(i => i.item_id === itemId)
      return sum + (item?.quantity || 0)
    }, 0)
  }

  const getItemStock = (itemId: string) => {
    return items.find(i => i.id === itemId)?.quantity_in_stock || 0
  }

  if (selectedRoomIds.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        Vui lòng chọn phòng trước
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add item selector */}
      <div className="flex items-center gap-2">
        <select
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={(e) => {
            if (e.target.value) {
              addItemToAllRooms(e.target.value, 1)
              e.target.value = ''
            }
          }}
          defaultValue=""
        >
          <option value="">+ Thêm sản phẩm...</option>
          {availableItems.map(item => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.code}) - Tồn: {item.quantity_in_stock}
            </option>
          ))}
        </select>
      </div>

      {allocatedItemIds.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Chưa có sản phẩm nào được thêm
        </div>
      ) : (
        <ScrollArea className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                  Sản phẩm
                </TableHead>
                <TableHead className="text-center min-w-[100px]">Tất cả</TableHead>
                {selectedRooms.map(room => (
                  <TableHead key={room.id} className="text-center min-w-[80px]">
                    {room.room_number}
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

                return (
                  <TableRow key={itemId}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeItemFromAll(itemId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Tồn: {stock} | Tổng: <span className={isOverStock ? 'text-destructive' : ''}>{total}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    {selectedRooms.map(room => (
                      <TableCell key={room.id}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setQuantity(room.id, itemId, getQuantity(room.id, itemId) - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            className="w-12 h-6 text-center text-xs p-1"
                            value={getQuantity(room.id, itemId) || ''}
                            onChange={(e) => setQuantity(room.id, itemId, parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setQuantity(room.id, itemId, getQuantity(room.id, itemId) + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      {/* Summary */}
      {allocatedItemIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Badge variant="outline">{selectedRoomIds.length} phòng</Badge>
          <Badge variant="outline">{allocatedItemIds.length} loại sản phẩm</Badge>
          <Badge variant="secondary">
            Tổng: {allocations.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0), 0)} đơn vị
          </Badge>
        </div>
      )}
    </div>
  )
}
