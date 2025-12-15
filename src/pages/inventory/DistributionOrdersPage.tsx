import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Search, Filter, Eye, Truck, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useDistributionOrders } from '@/hooks/useDistributionOrders'
import { useIsMobile } from '@/hooks/use-mobile'
import type { DistributionOrderStatus } from '@/types/distribution.types'

const STATUS_CONFIG: Record<DistributionOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Chờ giao', variant: 'outline', icon: Clock },
  in_progress: { label: 'Đang giao', variant: 'default', icon: Truck },
  completed: { label: 'Hoàn thành', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', variant: 'destructive', icon: XCircle },
}

export default function DistributionOrdersPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useDistributionOrders(
    { status: statusFilter as DistributionOrderStatus || undefined },
    page,
    25
  )

  const orders = data?.data || []
  const totalCount = data?.totalCount || 0

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Phiếu giao hàng</h1>
            <Button size="sm" onClick={() => navigate('/inventory/distributions/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Tạo mới
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ giao</SelectItem>
              <SelectItem value="in_progress">Đang giao</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có phiếu giao hàng nào
            </div>
          ) : (
            orders.map(order => {
              const config = STATUS_CONFIG[order.status]
              const progress = order.total_rooms > 0 
                ? Math.round((order.rooms_completed / order.total_rooms) * 100)
                : 0

              return (
                <Card 
                  key={order.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/inventory/distributions/${order.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">{order.order_code}</span>
                      <Badge variant={config.variant}>
                        <config.icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Phòng:</span>{' '}
                        <span className="font-medium">{order.rooms_completed}/{order.total_rooms}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sản phẩm:</span>{' '}
                        <span className="font-medium">{order.total_items}</span>
                      </div>
                    </div>

                    {order.status === 'in_progress' && (
                      <Progress value={progress} className="h-2" />
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Giao: {order.assigned_to_name || 'Chưa phân công'}</span>
                      <span>{format(new Date(order.created_at), 'dd/MM HH:mm', { locale: vi })}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phiếu giao hàng</h1>
          <p className="text-muted-foreground">Quản lý giao đồ từ kho đến các phòng</p>
        </div>
        <Button onClick={() => navigate('/inventory/distributions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo phiếu giao hàng
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm mã phiếu..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ giao</SelectItem>
                <SelectItem value="in_progress">Đang giao</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Chưa có phiếu giao hàng nào
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => {
                const config = STATUS_CONFIG[order.status]
                const progress = order.total_rooms > 0 
                  ? Math.round((order.rooms_completed / order.total_rooms) * 100)
                  : 0

                return (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/inventory/distributions/${order.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {order.order_code}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>
                        <config.icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
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
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
