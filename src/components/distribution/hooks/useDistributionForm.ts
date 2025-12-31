import { useState, useMemo, useCallback, useEffect } from 'react'
import { useItems } from '@/hooks/useItems'
import { useRooms } from '@/hooks/useRooms'
import { useHotelContext } from '@/contexts/HotelContext'
import type { DistributionOrderDetail } from '@/types/distribution.types'

export interface RoomItemAllocation {
  room_id: string
  items: { item_id: string; quantity: number }[]
}

export interface StockValidation {
  isValid: boolean
  overStockItems: { itemId: string; itemName: string; requested: number; available: number }[]
}

interface UseDistributionFormOptions {
  initialOrder?: DistributionOrderDetail | null
}

export function useDistributionForm(options: UseDistributionFormOptions = {}) {
  const { initialOrder } = options
  const { selectedHotel } = useHotelContext()
  
  // Data hooks
  const { data: itemsData } = useItems({ hotelId: selectedHotel?.id })
  const items = useMemo(() => {
    return Array.isArray(itemsData) ? itemsData : itemsData?.items || []
  }, [itemsData])
  
  const { data: rooms = [] } = useRooms()
  
  // Form state
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [allocations, setAllocations] = useState<RoomItemAllocation[]>([])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [notes, setNotes] = useState('')
  
  // Memoized maps for quick lookup
  const itemsMap = useMemo(() => {
    const map = new Map<string, typeof items[0]>()
    items.forEach(item => map.set(item.id, item))
    return map
  }, [items])
  
  const roomsMap = useMemo(() => {
    const map = new Map<string, typeof rooms[0]>()
    rooms.forEach(room => map.set(room.id, room))
    return map
  }, [rooms])
  
  // Selected rooms sorted by floor and room number
  const selectedRooms = useMemo(() => {
    return selectedRoomIds
      .map(id => roomsMap.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.floor !== b!.floor) return a!.floor - b!.floor
        return a!.room_number.localeCompare(b!.room_number)
      }) as typeof rooms
  }, [selectedRoomIds, roomsMap])
  
  // Available items (has stock - regardless of status)
  const availableItems = useMemo(() => {
    return items.filter(item => (item.quantity_in_stock || 0) > 0)
  }, [items])
  
  // Initialize form from order
  const initFromOrder = useCallback((order: DistributionOrderDetail) => {
    const roomIds = order.rooms?.map(r => r.room_id) || []
    setSelectedRoomIds(roomIds)
    
    const allocs: RoomItemAllocation[] = order.rooms?.map(room => ({
      room_id: room.room_id,
      items: room.items?.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
      })) || [],
    })) || []
    setAllocations(allocs)
    
    setAssignedTo(order.assigned_to || '')
    setNotes(order.notes || '')
  }, [])
  
  // Initialize on mount if initial order provided
  useEffect(() => {
    if (initialOrder) {
      initFromOrder(initialOrder)
    }
  }, [initialOrder, initFromOrder])
  
  // Get room allocation
  const getRoomAllocation = useCallback((roomId: string): RoomItemAllocation => {
    return allocations.find(a => a.room_id === roomId) || { room_id: roomId, items: [] }
  }, [allocations])
  
  // Get item info
  const getItemInfo = useCallback((itemId: string) => {
    return itemsMap.get(itemId)
  }, [itemsMap])
  
  // Get room info
  const getRoomInfo = useCallback((roomId: string) => {
    return roomsMap.get(roomId)
  }, [roomsMap])
  
  // Update item quantity for a room
  const updateItemQuantity = useCallback((roomId: string, itemId: string, quantity: number) => {
    setAllocations(prev => {
      const existing = prev.find(a => a.room_id === roomId)
      
      if (existing) {
        const itemIndex = existing.items.findIndex(i => i.item_id === itemId)
        
        if (quantity <= 0) {
          // Remove item
          return prev.map(a => 
            a.room_id === roomId 
              ? { ...a, items: a.items.filter(i => i.item_id !== itemId) }
              : a
          )
        }
        
        if (itemIndex >= 0) {
          // Update quantity
          return prev.map(a =>
            a.room_id === roomId
              ? { ...a, items: a.items.map(i => i.item_id === itemId ? { ...i, quantity } : i) }
              : a
          )
        } else {
          // Add new item
          return prev.map(a =>
            a.room_id === roomId
              ? { ...a, items: [...a.items, { item_id: itemId, quantity }] }
              : a
          )
        }
      } else if (quantity > 0) {
        // Add new room allocation
        return [...prev, { room_id: roomId, items: [{ item_id: itemId, quantity }] }]
      }
      
      return prev
    })
  }, [])
  
  // Add item to all selected rooms
  const addItemToAllRooms = useCallback((itemId: string, quantity = 1) => {
    setAllocations(prev => {
      return selectedRoomIds.map(roomId => {
        const existing = prev.find(a => a.room_id === roomId)
        const existingItems = existing?.items || []
        const itemExists = existingItems.find(i => i.item_id === itemId)
        
        return {
          room_id: roomId,
          items: itemExists 
            ? existingItems 
            : [...existingItems, { item_id: itemId, quantity }]
        }
      }).filter(a => a.items.length > 0)
    })
  }, [selectedRoomIds])
  
  // Remove item from all rooms
  const removeItemFromAllRooms = useCallback((itemId: string) => {
    setAllocations(prev => 
      prev.map(a => ({
        ...a,
        items: a.items.filter(i => i.item_id !== itemId)
      })).filter(a => a.items.length > 0)
    )
  }, [])
  
  // Set quantity for all rooms
  const setQuantityForAllRooms = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromAllRooms(itemId)
      return
    }
    
    setAllocations(() => 
      selectedRoomIds.map(roomId => {
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
    )
  }, [selectedRoomIds, allocations, removeItemFromAllRooms])
  
  // Handle room selection change
  const handleRoomSelectionChange = useCallback((newRoomIds: string[]) => {
    setSelectedRoomIds(newRoomIds)
    
    // Keep allocations for existing rooms, add empty for new rooms
    setAllocations(prev => {
      const existingRoomIds = prev.map(a => a.room_id)
      const removedRooms = existingRoomIds.filter(id => !newRoomIds.includes(id))
      
      // Filter out removed rooms
      let newAllocations = prev.filter(a => !removedRooms.includes(a.room_id))
      
      // Add empty allocations for new rooms
      const addedRooms = newRoomIds.filter(id => !existingRoomIds.includes(id))
      addedRooms.forEach(roomId => {
        newAllocations.push({ room_id: roomId, items: [] })
      })
      
      return newAllocations
    })
  }, [])
  
  // Get available items for room (not yet allocated)
  const getAvailableItemsForRoom = useCallback((roomId: string, searchTerm = '') => {
    const alloc = getRoomAllocation(roomId)
    const allocatedItemIds = alloc.items.filter(i => i.quantity > 0).map(i => i.item_id)
    const searchLower = searchTerm.trim().toLowerCase()
    
    return availableItems
      .filter(i => !allocatedItemIds.includes(i.id))
      .filter(i => {
        if (!searchLower) return true
        const nameLower = (i?.name ?? '').toLowerCase()
        const codeLower = (i?.code ?? '').toLowerCase()
        return nameLower.includes(searchLower) || codeLower.includes(searchLower)
      })
  }, [availableItems, getRoomAllocation])
  
  // Get total quantity for an item across all rooms
  const getTotalForItem = useCallback((itemId: string) => {
    return allocations.reduce((sum, a) => {
      const item = a.items.find(i => i.item_id === itemId)
      return sum + (item?.quantity || 0)
    }, 0)
  }, [allocations])
  
  // Get unique allocated item IDs
  const allocatedItemIds = useMemo(() => {
    const ids = new Set<string>()
    allocations.forEach(a => a.items.forEach(i => ids.add(i.item_id)))
    return Array.from(ids)
  }, [allocations])
  
  // Calculate stock validation
  const stockValidation = useMemo<StockValidation>(() => {
    const overStockItems: StockValidation['overStockItems'] = []
    
    // Get original quantities if editing
    const originalTotals: Record<string, number> = {}
    initialOrder?.rooms?.forEach(room => {
      room.items?.forEach(item => {
        originalTotals[item.item_id] = (originalTotals[item.item_id] || 0) + item.quantity
      })
    })
    
    allocatedItemIds.forEach(itemId => {
      const item = getItemInfo(itemId)
      if (!item) return
      
      const total = getTotalForItem(itemId)
      const originalQty = originalTotals[itemId] || 0
      // Available = current stock + original (already reserved when editing)
      const available = (item.quantity_in_stock || 0) + originalQty
      
      if (total > available) {
        overStockItems.push({
          itemId,
          itemName: item.name,
          requested: total,
          available,
        })
      }
    })
    
    return {
      isValid: overStockItems.length === 0,
      overStockItems,
    }
  }, [allocatedItemIds, getTotalForItem, getItemInfo, initialOrder])
  
  // Calculate summary
  const summary = useMemo(() => {
    const roomCount = selectedRoomIds.length
    const roomsWithItems = allocations.filter(a => a.items.length > 0).length
    const totalItems = allocations.reduce((sum, a) => 
      sum + a.items.reduce((s, i) => s + i.quantity, 0), 0
    )
    const itemTypesCount = allocatedItemIds.length
    
    return {
      roomCount,
      roomsWithItems,
      totalItems,
      itemTypesCount,
    }
  }, [selectedRoomIds, allocations, allocatedItemIds])
  
  // Reset form
  const reset = useCallback(() => {
    setSelectedRoomIds([])
    setAllocations([])
    setAssignedTo('')
    setNotes('')
  }, [])
  
  // Check form validity
  const isValid = useMemo(() => {
    return (
      selectedRoomIds.length > 0 &&
      allocations.filter(a => a.items.length > 0).length > 0 &&
      stockValidation.isValid
    )
  }, [selectedRoomIds, allocations, stockValidation])
  
  return {
    // State
    selectedRoomIds,
    setSelectedRoomIds: handleRoomSelectionChange,
    allocations,
    setAllocations,
    assignedTo,
    setAssignedTo,
    notes,
    setNotes,
    
    // Data
    items,
    rooms,
    itemsMap,
    roomsMap,
    selectedRooms,
    availableItems,
    allocatedItemIds,
    
    // Helpers
    getRoomAllocation,
    getItemInfo,
    getRoomInfo,
    updateItemQuantity,
    addItemToAllRooms,
    removeItemFromAllRooms,
    setQuantityForAllRooms,
    getAvailableItemsForRoom,
    getTotalForItem,
    
    // Validation
    stockValidation,
    isValid,
    
    // Summary
    summary,
    
    // Actions
    initFromOrder,
    reset,
  }
}

export type DistributionFormReturn = ReturnType<typeof useDistributionForm>
