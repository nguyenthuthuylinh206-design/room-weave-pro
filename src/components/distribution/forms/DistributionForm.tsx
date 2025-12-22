import { Users, Truck, AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoomMultiSelect } from '@/components/distribution/RoomMultiSelect'
import { ItemAllocator } from './ItemAllocator'
import { useUsers } from '@/hooks/useUsers'
import { useIsMobile } from '@/hooks/use-mobile'
import type { DistributionFormReturn } from '../hooks/useDistributionForm'

interface DistributionFormProps {
  form: DistributionFormReturn
  showHeader?: boolean
}

export function DistributionForm({ form, showHeader = true }: DistributionFormProps) {
  const isMobile = useIsMobile()
  const { users = [] } = useUsers()
  
  const {
    selectedRoomIds,
    setSelectedRoomIds,
    assignedTo,
    setAssignedTo,
    notes,
    setNotes,
    stockValidation,
  } = form

  const staffUsers = users.filter(u => 
    u.user_level_code === 'staff' || u.user_level_code === 'hotel_manager'
  )

  return (
    <div className={isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
      {/* Room Selection */}
      <Card className={isMobile ? '' : 'lg:col-span-1'}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Chọn phòng
            </CardTitle>
            <CardDescription>Chọn các phòng cần giao đồ</CardDescription>
          </CardHeader>
        )}
        <CardContent className={!showHeader ? 'pt-6' : ''}>
          <RoomMultiSelect
            selectedRoomIds={selectedRoomIds}
            onSelectionChange={setSelectedRoomIds}
            maxHeight={isMobile ? '200px' : '400px'}
          />
        </CardContent>
      </Card>

      {/* Item Allocation */}
      <Card className={isMobile ? '' : 'lg:col-span-2'}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Phân bổ sản phẩm
            </CardTitle>
            <CardDescription>Chọn số lượng sản phẩm cho mỗi phòng</CardDescription>
          </CardHeader>
        )}
        <CardContent className={!showHeader ? 'pt-6' : ''}>
          <ItemAllocator form={form} />
          
          {/* Stock validation warning for desktop */}
          {!isMobile && !stockValidation.isValid && (
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
  )
}
