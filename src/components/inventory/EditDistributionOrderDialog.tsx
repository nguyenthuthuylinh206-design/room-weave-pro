import { useState, useEffect, useCallback } from 'react'
import { Pencil, Truck, Users, X, AlertTriangle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RoomMultiSelect } from '@/components/distribution/RoomMultiSelect'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUsers } from '@/hooks/useUsers'
import { useItems } from '@/hooks/useItems'
import { useRooms } from '@/hooks/useRooms'
import { useUpdateDistributionOrder } from '@/hooks/useDistributionOrders'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import type { DistributionOrderDetail } from '@/types/distribution.types'

interface RoomItemAllocation {
  room_id: string
  items: { item_id: string; quantity: number }[]
}

interface EditDistributionOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: DistributionOrderDetail | null
}

export default function EditDistributionOrderDialog({
  open,
  onOpenChange,
  order,
}: EditDistributionOrderDialogProps) {
  const isMobile = useIsMobile()
  const { users = [] } = useUsers()
  const { selectedHotel } = useHotelContext()
  const { data: itemsData } = useItems({ hotelId: selectedHotel?.id })
  const items = Array.isArray(itemsData) ? itemsData : itemsData?.items || []
  const { data: roomsData = [] } = useRooms()
  const { mutate: updateOrder, isPending } = useUpdateDistributionOrder()

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [allocations, setAllocations] = useState<RoomItemAllocation[]>([])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [showAddItemPopover, setShowAddItemPopover] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState('')

  // Staff users for assignment
  const staffUsers = users.filter(u => 
    u.user_level_code === 'staff' || u.user_level_code === 'hotel_manager'
  )

  // Initialize from order when dialog opens
  useEffect(() => {
    if (open && order) {
      // Extract room IDs
      const roomIds = order.rooms?.map(r => r.room_id) || []
      setSelectedRoomIds(roomIds)
      
      // Extract allocations
      const allocs: RoomItemAllocation[] = order.rooms?.map(room => ({
        room_id: room.room_id,
        items: room.items?.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
        })) || [],
      })) || []
      setAllocations(allocs)
      
      // Set other fields
      setAssignedTo(order.assigned_to || '')
      setNotes(order.notes || '')
      setSelectedRoom(roomIds[0] || null)
    }
  }, [open, order])

  // Handle room selection change
  const handleRoomSelectionChange = (newRoomIds: string[]) => {
    setSelectedRoomIds(newRoomIds)
    
    // Add allocations for new rooms
    const existingRoomIds = allocations.map(a => a.room_id)
    const addedRooms = newRoomIds.filter(id => !existingRoomIds.includes(id))
    const removedRooms = existingRoomIds.filter(id => !newRoomIds.includes(id))
    
    let newAllocations = allocations.filter(a => !removedRooms.includes(a.room_id))
    addedRooms.forEach(roomId => {
      newAllocations.push({ room_id: roomId, items: [] })
    })
    
    setAllocations(newAllocations)
    
    // Update selected room if needed
    if (selectedRoom && removedRooms.includes(selectedRoom)) {
      setSelectedRoom(newRoomIds[0] || null)
    } else if (!selectedRoom && newRoomIds.length > 0) {
      setSelectedRoom(newRoomIds[0])
    }
  }

  // Get room allocation
  const getRoomAllocation = (roomId: string) => {
    return allocations.find(a => a.room_id === roomId) || { room_id: roomId, items: [] }
  }

  // Update item quantity for a room
  const updateItemQuantity = (roomId: string, itemId: string, quantity: number) => {
    setAllocations(prev => {
      const existing = prev.find(a => a.room_id === roomId)
      if (existing) {
        const existingItem = existing.items.find(i => i.item_id === itemId)
        if (existingItem) {
          if (quantity <= 0) {
            // Remove item
            return prev.map(a => 
              a.room_id === roomId 
                ? { ...a, items: a.items.filter(i => i.item_id !== itemId) }
                : a
            )
          }
          // Update quantity
          return prev.map(a =>
            a.room_id === roomId
              ? { ...a, items: a.items.map(i => i.item_id === itemId ? { ...i, quantity } : i) }
              : a
          )
        } else if (quantity > 0) {
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
  }

  // Get item info
  const getItemInfo = (itemId: string) => items.find(i => i.id === itemId)

  // Get allocated items for a room
  const getAllocatedItems = (roomId: string) => {
    const alloc = getRoomAllocation(roomId)
    return alloc.items
      .filter(i => i.quantity > 0)
      .map(i => ({ ...i, item: getItemInfo(i.item_id) }))
      .filter(i => i.item)
  }

  // Get available items to add (not yet allocated to this room)
  const getAvailableItemsForRoom = (roomId: string | null) => {
    if (!roomId) return []
    const alloc = getRoomAllocation(roomId)
    const allocatedItemIds = alloc.items.filter(i => i.quantity > 0).map(i => i.item_id)
    const searchLower = itemSearchTerm.toLowerCase().trim()
    return items
      .filter(i => i.status === 'active' && !allocatedItemIds.includes(i.id))
      .filter(i => !searchLower || i.name.toLowerCase().includes(searchLower))
  }

  // Add item to room
  const addItemToRoom = (roomId: string, itemId: string) => {
    updateItemQuantity(roomId, itemId, 1)
    setShowAddItemPopover(false)
    setItemSearchTerm('')
  }

  // Get room name from order rooms or roomsData
  const getRoomName = (roomId: string): string => {
    // Priority: get from order.rooms (already has room_number)
    const orderRoom = order?.rooms?.find(r => r.room_id === roomId)
    if (orderRoom?.room_number) return orderRoom.room_number
    
    // Fallback: get from roomsData (for newly added rooms)
    const room = roomsData.find(r => r.id === roomId)
    return room?.room_number || `Phòng ${roomId.substring(0, 6)}...`
  }

  // Calculate stock validation
  const calculateStockValidation = useCallback(() => {
    const itemTotals: Record<string, number> = {}
    const originalTotals: Record<string, number> = {}
    
    // Sum up all requested quantities
    allocations.forEach(alloc => {
      alloc.items.forEach(item => {
        itemTotals[item.item_id] = (itemTotals[item.item_id] || 0) + item.quantity
      })
    })
    
    // Sum up original quantities (already deducted from stock)
    order?.rooms?.forEach(room => {
      room.items?.forEach(item => {
        originalTotals[item.item_id] = (originalTotals[item.item_id] || 0) + item.quantity
      })
    })
    
    const overStockItems: { itemId: string; itemName: string; requested: number; available: number }[] = []
    
    Object.entries(itemTotals).forEach(([itemId, requested]) => {
      const item = getItemInfo(itemId)
      if (item) {
        const originalQty = originalTotals[itemId] || 0
        // Available = current stock + original (already reserved)
        const available = (item.quantity_in_stock || 0) + originalQty
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
    
    return { isValid: overStockItems.length === 0, overStockItems }
  }, [allocations, order, items])

  const stockValidation = calculateStockValidation()

  const handleSubmit = () => {
    if (selectedRoomIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một phòng')
      return
    }

    const roomsWithItems = allocations.filter(a => a.items.length > 0)
    if (roomsWithItems.length === 0) {
      toast.error('Vui lòng thêm sản phẩm để giao')
      return
    }

    if (!stockValidation.isValid) {
      toast.error('Số lượng yêu cầu vượt quá tồn kho')
      return
    }

    updateOrder({
      orderId: order!.id,
      assignedTo: assignedTo || undefined,
      notes: notes || undefined,
      rooms: roomsWithItems,
    }, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success('Cập nhật phiếu giao hàng thành công')
      },
    })
  }

  const Content = () => (
    <div className="space-y-4">
      {/* Assigned To */}
      <div className="space-y-2">
        <Label>Người giao hàng</Label>
        <Select value={assignedTo || 'unassigned'} onValueChange={(val) => setAssignedTo(val === 'unassigned' ? '' : val)}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn nhân viên..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Chưa phân công</SelectItem>
            {staffUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Ghi chú</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ghi chú..."
          rows={2}
        />
      </div>

      <Separator />

      {/* Room Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Chọn phòng
        </Label>
        <RoomMultiSelect
          selectedRoomIds={selectedRoomIds}
          onSelectionChange={handleRoomSelectionChange}
          maxHeight="150px"
        />
      </div>

      {/* Room Item Allocation */}
      {selectedRoomIds.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Phân bổ sản phẩm
          </Label>
          
          {/* Room tabs */}
          <div className="flex gap-2 flex-wrap">
            {selectedRoomIds.map(roomId => {
              const alloc = getRoomAllocation(roomId)
              const itemCount = alloc.items.reduce((sum, i) => sum + i.quantity, 0)
              return (
                <Badge
                  key={roomId}
                  variant={selectedRoom === roomId ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedRoom(roomId)}
                >
                  {getRoomName(roomId)}
                  {itemCount > 0 && <span className="ml-1">({itemCount})</span>}
                </Badge>
              )
            })}
          </div>

          {/* Items for selected room */}
          {selectedRoom && (
            <div className="border rounded-md p-3 space-y-3">
              {/* Allocated items */}
              {getAllocatedItems(selectedRoom).length > 0 ? (
                <div className="space-y-2">
                  {getAllocatedItems(selectedRoom).map(({ item_id, quantity, item }) => (
                    <div key={item_id} className="flex items-center justify-between gap-2 p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tồn: {item?.quantity_in_stock || 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(selectedRoom, item_id, quantity - 1)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => updateItemQuantity(selectedRoom, item_id, parseInt(e.target.value) || 0)}
                          className="w-14 h-7 text-center"
                          min={0}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateItemQuantity(selectedRoom, item_id, quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có sản phẩm nào được giao cho phòng này
                </p>
              )}

              {/* Add item button */}
              <Popover open={showAddItemPopover} onOpenChange={setShowAddItemPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm sản phẩm
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm sản phẩm..."
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <ScrollArea className="h-[200px] pr-3">
                      <div className="space-y-1 pr-1">
                        {getAvailableItemsForRoom(selectedRoom).length > 0 ? (
                          getAvailableItemsForRoom(selectedRoom).map(item => (
                            <Button
                              key={item.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-auto py-2"
                              onClick={() => addItemToRoom(selectedRoom, item.id)}
                            >
                              <div className="text-left">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Tồn: {item.quantity_in_stock || 0}
                                </p>
                              </div>
                            </Button>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Không còn sản phẩm nào
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      {/* Stock validation warning */}
      {!stockValidation.isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Vượt quá tồn kho:</span>
            <ul className="mt-1 list-disc list-inside text-sm">
              {stockValidation.overStockItems.map(item => (
                <li key={item.itemId}>
                  {item.itemName}: yêu cầu {item.requested}, khả dụng {item.available}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )

  const Footer = () => (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
        Hủy
      </Button>
      <Button 
        onClick={handleSubmit} 
        disabled={isPending || !stockValidation.isValid}
        className="flex-1"
      >
        <Pencil className="h-4 w-4 mr-2" />
        {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] min-h-0">
          <DrawerHeader>
            <DrawerTitle>Chỉnh sửa phiếu giao hàng</DrawerTitle>
            <DrawerDescription>
              Mã phiếu: {order?.order_code}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-4 pb-4 max-h-[60vh] overflow-y-auto">
            <Content />
          </div>
          <DrawerFooter>
            <Footer />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa phiếu giao hàng</DialogTitle>
          <DialogDescription>
            Mã phiếu: {order?.order_code}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 pr-4 overflow-y-auto">
          <Content />
        </div>
        <DialogFooter className="pt-4">
          <Footer />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
