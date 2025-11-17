import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter, Search, Package, DollarSign, AlertTriangle, XCircle, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileItemCard, PullToRefresh, StatScrollContainer, MobileStatCard } from '@/components/mobile'
import { useItems } from '@/hooks/useItems'
import { useCategories } from '@/hooks/useCategories'
import type { ItemFilters, StockStatus } from '@/types/items.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'

export function MobileItemsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ItemFilters>({
    status: 'active',
  })
  const [page, setPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  const { data, isLoading, refetch } = useItems(filters, page, 25)
  const { data: categories } = useCategories()
  
  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])
  
  const handleFilterChange = (newFilters: Partial<ItemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1)
  }
  
  const handleTabChange = (value: string) => {
    if (value === 'all') {
      handleFilterChange({ stockStatus: undefined })
    } else {
      handleFilterChange({ stockStatus: value as StockStatus })
    }
  }
  
  const activeStockStatus = filters.stockStatus || 'all'
  
  // Calculate stats
  const totalItems = data?.total || 0
  const totalValue = data?.items.reduce((sum, item) => 
    sum + ((item.unit_price || 0) * (item.quantity_total || 0)), 0
  ) || 0
  const lowStockCount = data?.items.filter(item => item.stock_status === 'low_stock').length || 0
  const outOfStockCount = data?.items.filter(item => item.stock_status === 'out_of_stock').length || 0
  const categoriesCount = categories?.length || 0
  
  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Tài sản</h1>
            <Button
              size="icon"
              onClick={() => navigate('/items/new')}
              className="rounded-full h-12 w-12"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, mã..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="pl-10 h-12 text-base"
            />
          </div>
          
          {/* Filters Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full h-12 gap-2">
                <Filter className="h-4 w-4" />
                Bộ lọc
                {(filters.categoryId || filters.stockStatus) && (
                  <Badge variant="secondary" className="ml-auto">
                    {[filters.categoryId, filters.stockStatus].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Bộ lọc</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Danh mục</label>
                  <Select
                    value={filters.categoryId || 'all'}
                    onValueChange={(value) => 
                      handleFilterChange({ categoryId: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Trạng thái</label>
                  <Select
                    value={filters.status || 'active'}
                    onValueChange={(value) => 
                      handleFilterChange({ status: value as any })
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="discontinued">Ngừng sử dụng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => {
                      setFilters({ status: 'active' })
                      setIsFilterOpen(false)
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Áp dụng
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Stats */}
        <StatScrollContainer className="px-4 pb-4">
          <MobileStatCard
            icon={Package}
            title="Tổng số"
            value={totalItems.toString()}
            variant="default"
          />
          <MobileStatCard
            icon={DollarSign}
            title="Tổng giá trị"
            value={formatCurrency(totalValue)}
            variant="success"
          />
          <MobileStatCard
            icon={AlertTriangle}
            title="Sắp hết"
            value={lowStockCount.toString()}
            variant="warning"
          />
          <MobileStatCard
            icon={XCircle}
            title="Hết hàng"
            value={outOfStockCount.toString()}
            variant="destructive"
          />
          <MobileStatCard
            icon={FolderOpen}
            title="Danh mục"
            value={categoriesCount.toString()}
            variant="default"
          />
        </StatScrollContainer>
        
        {/* Stock Status Tabs */}
        <Tabs value={activeStockStatus} onValueChange={handleTabChange} className="px-4 pb-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
            <TabsTrigger value="in_stock" className="text-xs">Còn hàng</TabsTrigger>
            <TabsTrigger value="low_stock" className="text-xs">Sắp hết</TabsTrigger>
            <TabsTrigger value="out_of_stock" className="text-xs">Hết</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Items List */}
      <div className="flex-1">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Không có tài sản nào</p>
            </div>
          ) : (
            <>
              {data?.items.map((item) => (
                <MobileItemCard
                  key={item.id}
                  item={item}
                  onView={() => navigate(`/items/${item.id}`)}
                  onEdit={() => navigate(`/items/${item.id}/edit`)}
                />
              ))}
              
              {/* Load More */}
              {data && data.page < data.totalPages && (
                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => setPage(p => p + 1)}
                >
                  Xem thêm
                </Button>
              )}
            </>
          )}
          </div>
        </PullToRefresh>
      </div>
    </div>
  )
}
