import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderStatusBadge } from './DistributionStatusBadge'
import type { DistributionOrder } from '@/types/distribution.types'

interface DistributionOrderTableProps {
  orders: DistributionOrder[]
  onRowClick?: (order: DistributionOrder) => void
  isLoading?: boolean
  emptyMessage?: React.ReactNode
}

export function DistributionOrderTable({ 
  orders, 
  onRowClick, 
  isLoading,
  emptyMessage
}: DistributionOrderTableProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã phiếu</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-center">Tiến độ</TableHead>
            <TableHead className="text-center">Sản phẩm</TableHead>
            <TableHead>Người giao</TableHead>
            <TableHead>Người tạo</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              Đang tải...
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  if (orders.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã phiếu</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-center">Tiến độ</TableHead>
            <TableHead className="text-center">Sản phẩm</TableHead>
            <TableHead>Người giao</TableHead>
            <TableHead>Người tạo</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12">
              {emptyMessage}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã phiếu</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="text-center">Tiến độ</TableHead>
          <TableHead className="text-center">Sản phẩm</TableHead>
          <TableHead>Người giao</TableHead>
          <TableHead>Người tạo</TableHead>
          <TableHead>Ngày tạo</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(order => {
          const progress = order.total_rooms > 0 
            ? Math.round((order.rooms_completed / order.total_rooms) * 100)
            : 0

          return (
            <TableRow 
              key={order.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick?.(order)}
            >
              <TableCell className="font-mono font-medium">
                {order.order_code}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="w-20 h-2" />
                  <span className="text-sm text-muted-foreground">
                    {order.rooms_completed}/{order.total_rooms}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">{order.total_items}</TableCell>
              <TableCell>{order.assigned_to_name || '-'}</TableCell>
              <TableCell>{order.created_by_name}</TableCell>
              <TableCell>
                {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
