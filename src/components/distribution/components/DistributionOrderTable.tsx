import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderStatusText } from './DistributionStatusBadge'
import type { DistributionOrder } from '@/types/distribution.types'

interface DistributionOrderTableProps {
  orders: DistributionOrder[]
  onRowClick?: (order: DistributionOrder) => void
  isLoading?: boolean
  emptyMessage?: React.ReactNode
}

const TABLE_HEADERS = (
  <TableRow>
    <TableHead className="text-xs">Mã phiếu</TableHead>
    <TableHead className="text-xs">Trạng thái</TableHead>
    <TableHead className="text-xs text-center">Tiến độ</TableHead>
    <TableHead className="text-xs">Người giao</TableHead>
    <TableHead className="text-xs">Ngày tạo</TableHead>
  </TableRow>
)

export function DistributionOrderTable({ 
  orders, 
  onRowClick, 
  isLoading,
  emptyMessage
}: DistributionOrderTableProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>{TABLE_HEADERS}</TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
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
        <TableHeader>{TABLE_HEADERS}</TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12">
              {emptyMessage}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  return (
    <Table>
      <TableHeader>{TABLE_HEADERS}</TableHeader>
      <TableBody>
        {orders.map(order => (
          <TableRow 
            key={order.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick?.(order)}
          >
            <TableCell className="font-mono font-medium text-sm py-2">
              {order.order_code}
            </TableCell>
            <TableCell className="py-2">
              <OrderStatusText status={order.status} />
            </TableCell>
            <TableCell className="text-center text-sm py-2">
              <span className="text-muted-foreground">
                {order.rooms_completed}/{order.total_rooms}
              </span>
            </TableCell>
            <TableCell className="text-sm py-2">{order.assigned_to_name || '-'}</TableCell>
            <TableCell className="text-sm py-2">
              {format(new Date(order.created_at), 'dd/MM HH:mm', { locale: vi })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
