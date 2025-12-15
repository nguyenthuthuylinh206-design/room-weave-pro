import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoomMultiSelect } from '@/components/distribution/RoomMultiSelect'
import { DistributionItemMatrix, RoomItemAllocation, StockValidation } from '@/components/distribution/DistributionItemMatrix'
import { useCreateDistributionOrder } from '@/hooks/useDistributionOrders'
import { useUsers } from '@/hooks/useUsers'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

export default function CreateDistributionPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { mutate: createOrder, isPending } = useCreateDistributionOrder()
  const { users = [] } = useUsers()

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [allocations, setAllocations] = useState<RoomItemAllocation[]>([])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [stockValidation, setStockValidation] = useState<StockValidation>({ isValid: true, overStockItems: [] })

  const handleStockValidationChange = useCallback((validation: StockValidation) => {
    setStockValidation(validation)
  }, [])

  const staffUsers = users.filter(u => 
    u.user_level_code === 'staff' || u.user_level_code === 'hotel_manager'
  )

  const handleSubmit = () => {
    if (selectedRoomIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một phòng')
      return
    }

    if (allocations.length === 0) {
      toast.error('Vui lòng thêm sản phẩm để giao')
      return
    }

    // Validate all selected rooms have items
    const roomsWithItems = allocations.filter(a => a.items.length > 0)
    if (roomsWithItems.length < selectedRoomIds.length) {
      toast.error('Một số phòng chưa có sản phẩm')
      return
    }

    createOrder({
      assigned_to: assignedTo || undefined,
      notes: notes || undefined,
      rooms: allocations.filter(a => a.items.length > 0),
    }, {
      onSuccess: (result) => {
        navigate(`/inventory/distributions/${result.order_id}`)
      }
    })
  }

  return (
    <div className={isMobile ? 'flex flex-col h-full' : 'container mx-auto py-6 space-y-6'}>
      {/* Header */}
      <div className={isMobile 
        ? 'sticky top-0 z-10 bg-background border-b p-4 flex items-center gap-3'
        : 'flex items-center gap-4'
      }>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className={isMobile ? 'text-lg font-semibold' : 'text-2xl font-bold'}>
            Tạo phiếu giao hàng
          </h1>
          {!isMobile && (
            <p className="text-muted-foreground">
              Xuất kho và giao đồ đến nhiều phòng cùng lúc
            </p>
          )}
        </div>
      </div>

      <div className={isMobile ? 'flex-1 overflow-auto p-4 space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {/* Left: Room Selection */}
        <Card className={isMobile ? '' : 'lg:col-span-1'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Chọn phòng
            </CardTitle>
            <CardDescription>Chọn các phòng cần giao đồ</CardDescription>
          </CardHeader>
          <CardContent>
            <RoomMultiSelect
              selectedRoomIds={selectedRoomIds}
              onSelectionChange={setSelectedRoomIds}
              maxHeight={isMobile ? '200px' : '400px'}
            />
          </CardContent>
        </Card>

        {/* Right: Item Matrix */}
        <Card className={isMobile ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Phân bổ sản phẩm
            </CardTitle>
            <CardDescription>Chọn số lượng sản phẩm cho mỗi phòng</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionItemMatrix
              selectedRoomIds={selectedRoomIds}
              allocations={allocations}
              onAllocationsChange={setAllocations}
              onStockValidationChange={handleStockValidationChange}
            />
            
            {/* Stock validation warning */}
            {!stockValidation.isValid && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Vượt quá tồn kho:</span>
                  <ul className="mt-1 list-disc list-inside">
                    {stockValidation.overStockItems.map(item => (
                      <li key={item.itemId}>
                        {item.itemName}: yêu cầu {item.requested}, tồn kho {item.available}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card className={isMobile ? '' : 'lg:col-span-3'}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Người giao hàng</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhân viên..." />
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
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className={isMobile 
        ? 'sticky bottom-0 bg-background border-t p-4 flex gap-3'
        : 'flex justify-end gap-3'
      }>
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className={isMobile ? 'flex-1' : ''}
        >
          Hủy
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || selectedRoomIds.length === 0 || allocations.length === 0 || !stockValidation.isValid}
          className={isMobile ? 'flex-1' : ''}
        >
          {isPending ? 'Đang tạo...' : 'Tạo phiếu giao hàng'}
        </Button>
      </div>
    </div>
  )
}
