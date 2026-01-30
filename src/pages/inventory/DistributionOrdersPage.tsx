import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, ChevronLeft, ChevronRight, RefreshCw, Loader2, ChevronDown, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DistributionOrderCard } from '@/components/distribution/components/DistributionOrderCard'
import { DistributionOrderTable } from '@/components/distribution/components/DistributionOrderTable'
import { RouteFiltersCard } from '@/components/distribution/components/RouteFiltersCard'
import { PendingSupplementsBanner } from '@/components/distribution/components/PendingSupplementsBanner'
import { useRoutesWithFilters, useAvailableFloors } from '@/hooks/useRouteFilters'
import { usePendingSupplementCount } from '@/hooks/useSupplementRequests'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQueryClient } from '@tanstack/react-query'
import type { RouteFilters } from '@/types/route-batch.types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

export default function DistributionOrdersPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  
  const [filters, setFilters] = useState<RouteFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, isLoading } = useRoutesWithFilters(filters, page, PAGE_SIZE)
  const { data: availableFloors = [] } = useAvailableFloors()
  const { data: pendingSupplementCount = 0 } = usePendingSupplementCount()

  const orders = data?.data || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Filter by search query (client-side)
  const filteredOrders = searchQuery 
    ? orders.filter(o => o.order_code.toLowerCase().includes(searchQuery.toLowerCase()))
    : orders

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['distribution-routes'] })
    setIsRefreshing(false)
  }

  const handleFiltersChange = (newFilters: RouteFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleOrderClick = (orderId: string) => {
    navigate(`/inventory/distributions/${orderId}`)
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-10 w-10 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">Không có phiếu giao hàng nào</p>
      <Button size="sm" className="mt-3" onClick={() => navigate('/inventory/distributions/new')}>
        <Plus className="h-4 w-4 mr-1" />
        Tạo phiếu mới
      </Button>
    </div>
  )

  const Pagination = () => {
    if (totalPages <= 1) return null
    
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
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
        <div className="sticky top-0 z-10 bg-background border-b px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold">Phiếu giao hàng</h1>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              <CreateDropdown 
                pendingCount={pendingSupplementCount} 
                onCreateManual={() => navigate('/inventory/distributions/new')}
                onCreateFromSupplements={() => navigate('/inventory/distributions/from-supplements')}
              />
            </div>
          </div>
          <RouteFiltersCard
            filters={filters}
            onFiltersChange={handleFiltersChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            floors={availableFloors}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            isMobile
          />
        </div>

        {/* Pending Supplements Banner */}
        {pendingSupplementCount > 0 && (
          <div className="px-3 pt-2">
            <PendingSupplementsBanner />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {filteredOrders.map(order => (
                <DistributionOrderCard
                  key={order.id}
                  order={order as any}
                  onClick={() => handleOrderClick(order.id)}
                />
              ))}
              {totalPages > 1 && (
                <div className="flex justify-center pt-2">
                  <Pagination />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Phiếu giao hàng</h1>
          <p className="text-sm text-muted-foreground">Quản lý các phiếu giao đồ đến phòng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <CreateDropdown 
            pendingCount={pendingSupplementCount} 
            onCreateManual={() => navigate('/inventory/distributions/new')}
            onCreateFromSupplements={() => navigate('/inventory/distributions/from-supplements')}
          />
        </div>
      </div>

      {/* Pending Supplements Banner */}
      <PendingSupplementsBanner />

      {/* Filters */}
      <RouteFiltersCard
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        floors={availableFloors}
      />

      {/* Table */}
      <div className="border rounded-lg">
        <DistributionOrderTable
          orders={filteredOrders as any}
          onRowClick={(order) => handleOrderClick(order.id)}
          isLoading={isLoading}
          emptyMessage={<EmptyState />}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <span className="text-xs text-muted-foreground">
              {filteredOrders.length}/{totalCount} phiếu
            </span>
            <Pagination />
          </div>
        )}
      </div>
    </div>
  )
}

// Quick Create Dropdown Component
interface CreateDropdownProps {
  pendingCount: number
  onCreateManual: () => void
  onCreateFromSupplements: () => void
}

function CreateDropdown({ pendingCount, onCreateManual, onCreateFromSupplements }: CreateDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo phiếu
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {pendingCount}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onCreateFromSupplements} className="gap-2">
          <FileText className="h-4 w-4" />
          <div className="flex-1">
            <span>Từ yêu cầu bổ sung</span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {pendingCount}
              </Badge>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateManual} className="gap-2">
          <Package className="h-4 w-4" />
          Tạo thủ công
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}