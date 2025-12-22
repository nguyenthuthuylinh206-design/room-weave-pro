import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Package, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DistributionOrderCard } from '@/components/distribution/components/DistributionOrderCard'
import { DistributionOrderTable } from '@/components/distribution/components/DistributionOrderTable'
import { useDistributionOrders } from '@/hooks/useDistributionOrders'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQueryClient } from '@tanstack/react-query'
import type { DistributionOrderStatus } from '@/types/distribution.types'

const PAGE_SIZE = 25

export default function DistributionOrdersPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, isLoading } = useDistributionOrders(
    { status: statusFilter === 'all' ? undefined : statusFilter as DistributionOrderStatus },
    page,
    PAGE_SIZE
  )

  const orders = data?.data || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Filter by search query (client-side)
  const filteredOrders = searchQuery 
    ? orders.filter(o => o.order_code.toLowerCase().includes(searchQuery.toLowerCase()))
    : orders

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
    setIsRefreshing(false)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleOrderClick = (orderId: string) => {
    navigate(`/inventory/distributions/${orderId}`)
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground">Không có phiếu giao hàng nào</p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => navigate('/inventory/distributions/new')}
      >
        <Plus className="h-4 w-4 mr-2" />
        Tạo phiếu mới
      </Button>
    </div>
  )

  const Pagination = () => {
    if (totalPages <= 1) return null
    
    return (
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Trước</span>}
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          {!isMobile && <span className="mr-1">Sau</span>}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Phiếu giao hàng</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" onClick={() => navigate('/inventory/distributions/new')}>
                <Plus className="h-4 w-4 mr-1" />
                Tạo mới
              </Button>
            </div>
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ giao</SelectItem>
              <SelectItem value="in_progress">Đang giao</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {filteredOrders.map(order => (
                <DistributionOrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order.id)}
                />
              ))}
              <Pagination />
            </>
          )}
        </div>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phiếu giao hàng</h1>
          <p className="text-muted-foreground">Quản lý các phiếu giao đồ đến phòng</p>
        </div>
        <Button onClick={() => navigate('/inventory/distributions/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo phiếu mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm theo mã phiếu..."
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ giao</SelectItem>
                <SelectItem value="in_progress">Đang giao</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <DistributionOrderTable
          orders={filteredOrders}
          onRowClick={(order) => handleOrderClick(order.id)}
          isLoading={isLoading}
          emptyMessage={<EmptyState />}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Hiển thị {filteredOrders.length} / {totalCount} phiếu
            </span>
            <Pagination />
          </div>
        )}
      </Card>
    </div>
  )
}
