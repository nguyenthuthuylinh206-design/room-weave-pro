import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Users, Package, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RoomMultiSelect } from './RoomMultiSelect'
import { SimpleItemSelector } from './SimpleItemSelector'
import { AllocationTable } from './AllocationTable'
import { useItems } from '@/hooks/useItems'
import { useUsers } from '@/hooks/useUsers'
import { useTranslation } from 'react-i18next'

export interface RoomItemAllocation {
  room_id: string
  items: {
    item_id: string
    quantity: number
  }[]
}

export interface StockValidation {
  isValid: boolean
  overStockItems: {
    itemId: string
    itemName: string
    requested: number
    available: number
  }[]
}

interface DistributionPanelProps {
  onAllocationsChange: (allocations: RoomItemAllocation[]) => void
  onValidationChange: (validation: StockValidation) => void
  onAssignedToChange?: (userId: string) => void
  onNotesChange?: (notes: string) => void
}

export function DistributionPanel({
  onAllocationsChange,
  onValidationChange,
  onAssignedToChange,
  onNotesChange,
}: DistributionPanelProps) {
  const { t } = useTranslation(['distribution', 'common'])
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [allocations, setAllocations] = useState<RoomItemAllocation[]>([])
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')
  
  const { data: itemsData } = useItems()
  const { users } = useUsers()
  const items = itemsData?.items || []
  
  const staffUsers = users?.filter(u => 
    u.user_level_code === 'staff' || u.user_level_code === 'manager'
  ) || []
  
  const itemsMap = useMemo(() => {
    const map = new Map<string, typeof items[0]>()
    items.forEach(i => map.set(i.id, i))
    return map
  }, [items])
  
  // Get all allocated item IDs
  const allocatedItemIds = useMemo(() => {
    const ids = new Set<string>()
    allocations.forEach(a => a.items.forEach(i => ids.add(i.item_id)))
    return Array.from(ids)
  }, [allocations])
  
  // Calculate stock validation
  const stockValidation = useMemo<StockValidation>(() => {
    const totals = new Map<string, number>()
    allocations.forEach(a => {
      a.items.forEach(i => {
        totals.set(i.item_id, (totals.get(i.item_id) || 0) + i.quantity)
      })
    })
    
    const overStockItems: StockValidation['overStockItems'] = []
    totals.forEach((requested, itemId) => {
      const item = itemsMap.get(itemId)
      if (item) {
        const available = item.quantity_in_stock ?? 0
        if (requested > available) {
          overStockItems.push({
            itemId,
            itemName: item.name,
            requested,
            available,
          })
        }
      }
    })
    
    return {
      isValid: overStockItems.length === 0,
      overStockItems,
    }
  }, [allocations, itemsMap])
  
  // Notify parent of changes
  const prevValidationRef = useRef<StockValidation>()
  useEffect(() => {
    onAllocationsChange(allocations)
  }, [allocations, onAllocationsChange])
  
  useEffect(() => {
    if (JSON.stringify(prevValidationRef.current) !== JSON.stringify(stockValidation)) {
      prevValidationRef.current = stockValidation
      onValidationChange(stockValidation)
    }
  }, [stockValidation, onValidationChange])
  
  // Handle room selection change
  const handleRoomSelectionChange = useCallback((roomIds: string[]) => {
    setSelectedRoomIds(roomIds)
    
    // Update allocations: remove rooms that are no longer selected, add new rooms
    setAllocations(prev => {
      const existingRoomIds = new Set(prev.map(a => a.room_id))
      const newRoomIds = new Set(roomIds)
      
      // Keep allocations for rooms still selected
      const kept = prev.filter(a => newRoomIds.has(a.room_id))
      
      // Add empty allocations for new rooms
      const added = roomIds
        .filter(id => !existingRoomIds.has(id))
        .map(room_id => ({ room_id, items: [] }))
      
      return [...kept, ...added]
    })
  }, [])
  
  // Add item to all selected rooms
  const handleSelectItem = useCallback((itemId: string) => {
    setAllocations(prev => {
      return prev.map(allocation => {
        // Check if item already exists in this room
        const existingItem = allocation.items.find(i => i.item_id === itemId)
        if (existingItem) return allocation
        
        return {
          ...allocation,
          items: [...allocation.items, { item_id: itemId, quantity: 1 }]
        }
      })
    })
  }, [])
  
  // Update quantity for specific room and item
  const handleQuantityChange = useCallback((roomId: string, itemId: string, quantity: number) => {
    setAllocations(prev => {
      return prev.map(allocation => {
        if (allocation.room_id !== roomId) return allocation
        
        if (quantity <= 0) {
          // Remove item if quantity is 0
          return {
            ...allocation,
            items: allocation.items.filter(i => i.item_id !== itemId)
          }
        }
        
        const existingItem = allocation.items.find(i => i.item_id === itemId)
        if (existingItem) {
          return {
            ...allocation,
            items: allocation.items.map(i => 
              i.item_id === itemId ? { ...i, quantity } : i
            )
          }
        }
        
        return {
          ...allocation,
          items: [...allocation.items, { item_id: itemId, quantity }]
        }
      })
    })
  }, [])
  
  // Remove item from all rooms
  const handleRemoveItem = useCallback((itemId: string) => {
    setAllocations(prev => {
      return prev.map(allocation => ({
        ...allocation,
        items: allocation.items.filter(i => i.item_id !== itemId)
      }))
    })
  }, [])
  
  // Set quantity for all rooms
  const handleSetQuantityForAll = useCallback((itemId: string, quantity: number) => {
    setAllocations(prev => {
      return prev.map(allocation => {
        if (quantity <= 0) {
          return {
            ...allocation,
            items: allocation.items.filter(i => i.item_id !== itemId)
          }
        }
        
        const existingItem = allocation.items.find(i => i.item_id === itemId)
        if (existingItem) {
          return {
            ...allocation,
            items: allocation.items.map(i => 
              i.item_id === itemId ? { ...i, quantity } : i
            )
          }
        }
        
        return {
          ...allocation,
          items: [...allocation.items, { item_id: itemId, quantity }]
        }
      })
    })
  }, [])
  
  // Calculate summary stats
  const summary = useMemo(() => {
    const roomCount = selectedRoomIds.length
    const itemTypes = new Set<string>()
    let totalUnits = 0
    
    allocations.forEach(a => {
      a.items.forEach(i => {
        const item = itemsMap.get(i.item_id)
        if (item?.item_type) itemTypes.add(item.item_type)
        totalUnits += i.quantity
      })
    })
    
    return {
      roomCount,
      itemTypeCount: itemTypes.size,
      totalUnits,
    }
  }, [selectedRoomIds, allocations, itemsMap])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('distribution:createOrder.title')}
        </CardTitle>
        <CardDescription>
          {t('distribution:createOrder.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Chọn phòng *</Label>
          <RoomMultiSelect
            selectedRoomIds={selectedRoomIds}
            onSelectionChange={handleRoomSelectionChange}
            maxHeight="250px"
          />
        </div>
        
        {/* Item Selector */}
        {selectedRoomIds.length > 0 && (
          <SimpleItemSelector
            allocatedItemIds={allocatedItemIds}
            onSelectItem={handleSelectItem}
            disabled={selectedRoomIds.length === 0}
          />
        )}
        
        {/* Allocation Table */}
        {selectedRoomIds.length > 0 && allocatedItemIds.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bảng phân bổ
            </Label>
            <AllocationTable
              selectedRoomIds={selectedRoomIds}
              allocations={allocations}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
              onSetQuantityForAll={handleSetQuantityForAll}
            />
          </div>
        )}
        
        {/* Stock Validation Warnings */}
        {!stockValidation.isValid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Vượt quá tồn kho:</div>
              <ul className="text-sm space-y-1">
                {stockValidation.overStockItems.map(item => (
                  <li key={item.itemId}>
                    {item.itemName}: yêu cầu {item.requested}, tồn {item.available}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Assignment and Notes */}
        {selectedRoomIds.length > 0 && allocatedItemIds.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Giao cho nhân viên</Label>
              <Select
                value={assignedTo}
                onValueChange={(value) => {
                  setAssignedTo(value)
                  onAssignedToChange?.(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  onNotesChange?.(e.target.value)
                }}
                placeholder="Ghi chú cho đơn phân bổ..."
                rows={2}
              />
            </div>
          </div>
        )}
        
        {/* Summary */}
        {selectedRoomIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {summary.roomCount} phòng
              </Badge>
              <Badge variant="secondary">
                {summary.itemTypeCount} loại SP
              </Badge>
              <Badge variant="secondary">
                {summary.totalUnits} đơn vị
              </Badge>
            </div>
            {stockValidation.isValid && summary.totalUnits > 0 ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Hợp lệ
              </div>
            ) : summary.totalUnits === 0 ? (
              <div className="text-muted-foreground text-sm">
                Chưa có sản phẩm
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
