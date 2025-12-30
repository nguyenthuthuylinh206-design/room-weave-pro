import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Eye, Loader2 } from 'lucide-react'
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
            <TableHead className="text-xs">Mã phiếu</TableHead>
            <TableHead className="text-xs">Trạng thái</TableHead>
            <TableHead className="text-xs text-center">Tiến độ</TableHead>
            <TableHead className="text-xs text-center">Sản phẩm</TableHead>
            <TableHead className="text-xs">Người giao</TableHead>
            <TableHead className="text-xs">Người tạo</TableHead>
            <TableHead className="text-xs">Ngày tạo</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
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
            <TableHead className="text-xs">Mã phiếu</TableHead>
            <TableHead className="text-xs">Trạng thái</TableHead>
            <TableHead className="text-xs text-center">Tiến độ</TableHead>
            <TableHead className="text-xs text-center">Sản phẩm</TableHead>
            <TableHead className="text-xs">Người giao</TableHead>
            <TableHead className="text-xs">Người tạo</TableHead>
            <TableHead className="text-xs">Ngày tạo</TableHead>
            <TableHead className="w-16"></TableHead>
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
          <TableHead className="text-xs">Mã phiếu</TableHead>
          <TableHead className="text-xs">Trạng thái</TableHead>
          <TableHead className="text-xs text-center">Tiến độ</TableHead>
          <TableHead className="text-xs text-center">Sản phẩm</TableHead>
          <TableHead className="text-xs">Người giao</TableHead>
          <TableHead className="text-xs">Người tạo</TableHead>
          <TableHead className="text-xs">Ngày tạo</TableHead>
          <TableHead className="w-16"></TableHead>
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
              <TableCell className="font-mono font-medium text-sm py-2">
                {order.order_code}
              </TableCell>
              <TableCell className="py-2">
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="w-16 h-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {order.rooms_completed}/{order.total_rooms}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center text-sm py-2">{order.total_items}</TableCell>
              <TableCell className="text-sm py-2">{order.assigned_to_name || '-'}</TableCell>
              <TableCell className="text-sm py-2">{order.created_by_name}</TableCell>
              <TableCell className="text-sm py-2">
                {format(new Date(order.created_at), 'dd/MM HH:mm', { locale: vi })}
              </TableCell>
              <TableCell className="py-2">
                <Button variant="ghost" size="icon" className="h-7 w-7">
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