import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToggleItemVerification } from '@/hooks/useRoomItems'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface RoomItemsListProps {
  items: RoomItemWithDetails[]
  roomId: string
}

type ItemStatus = {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
  color: string
}

export function RoomItemsList({ items }: RoomItemsListProps) {
  const toggleVerification = useToggleItemVerification()

  const handleToggleVerification = (roomItemId: string, currentStatus: boolean) => {
    toggleVerification.mutate({ 
      roomItemId, 
      isVerified: !currentStatus 
    })
  }

  const getItemStatus = (current: number, standard?: number): ItemStatus => {
    if (!standard) return { label: 'Không xác định', variant: 'secondary', color: 'text-muted-foreground' }
    if (current === standard) return { label: 'Đầy đủ', variant: 'default', color: 'text-green-600' }
    if (current > standard) return { label: 'Dư', variant: 'secondary', color: 'text-blue-600' }
    return { label: 'Thiếu', variant: 'destructive', color: 'text-red-600' }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Không có đồ dùng nào
        </p>
      </div>
    )
  }

  // Calculate unverified and missing items
  const unverifiedItems = items.filter(item => !item.is_verified)
  const missingItems = items.filter(item => {
    const standardQty = item.standard_quantity || 0
    const currentQty = item.quantity || 0
    return standardQty > currentQty
  })
  
  // Calculate total missing quantity
  const totalMissingQuantity = missingItems.reduce((sum, item) => {
    return sum + Math.max(0, (item.standard_quantity || 0) - item.quantity)
  }, 0)
  
  return (
    <div className="space-y-4">
      {unverifiedItems.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Còn {unverifiedItems.length} loại đồ chưa được xác nhận.
            {missingItems.length > 0 && (
              <span className="font-semibold">
                {' '}Thiếu {missingItems.length} loại đồ ({totalMissingQuantity} món).
              </span>
            )}
            {' '}Hãy tích vào các đồ đã có trong phòng để xác nhận.
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Xác nhận</TableHead>
            <TableHead className="w-16">Ảnh</TableHead>
            <TableHead>Tên đồ dùng</TableHead>
            <TableHead className="text-center">Số lượng chuẩn</TableHead>
            <TableHead className="text-center">Số lượng hiện có</TableHead>
            <TableHead className="text-center">Còn thiếu</TableHead>
            <TableHead>Tình trạng</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const missing = item.standard_quantity 
              ? item.standard_quantity - item.quantity
              : 0
            const isVerified = item.is_verified || false
            const status = getItemStatus(item.quantity, item.standard_quantity)
            
            return (
              <TableRow 
                key={item.id}
                className={!isVerified && missing > 0 ? 'bg-destructive/5' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={isVerified}
                    onCheckedChange={() => handleToggleVerification(item.id, isVerified)}
                    disabled={toggleVerification.isPending}
                  />
                </TableCell>
                <TableCell>
                  {item.item_thumbnail ? (
                    <img
                      src={item.item_thumbnail}
                      alt={item.item_name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Link 
                      to={`/items/${item.item_id}`}
                      className="font-medium hover:underline flex items-center gap-2"
                    >
                      {item.item_name}
                      {isVerified && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {!isVerified && missing > 0 && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.item_code}</p>
                    {item.category_name && (
                      <Badge variant="outline" className="text-xs">
                        {item.category_name}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {item.standard_quantity || '-'}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">{item.quantity}</span>
                    <Badge variant={status.variant} className={status.color}>
                      {status.label}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {missing > 0 ? (
                    <span className="font-medium text-red-600">-{missing}</span>
                  ) : missing < 0 ? (
                    <span className="font-medium text-blue-600">+{Math.abs(missing)}</span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.condition === 'good' ? 'default' :
                      item.condition === 'damaged' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {item.condition === 'good' && 'Tốt'}
                    {item.condition === 'fair' && 'Khá'}
                    {item.condition === 'poor' && 'Kém'}
                    {item.condition === 'damaged' && 'Hỏng'}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
