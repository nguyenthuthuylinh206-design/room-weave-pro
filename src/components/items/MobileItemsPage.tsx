import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Package, DollarSign, AlertTriangle, XCircle, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useHasPermission } from '@/hooks/usePermission'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileItemCard, PullToRefresh } from '@/components/mobile'
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
  const [searchFocused, setSearchFocused] = useState(false)
  
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
  
  const clearSearch = () => {
    handleFilterChange({ search: '' })
  }
  
  const activeStockStatus = filters.stockStatus || 'all'
  const activeFiltersCount = [filters.categoryId, filters.stockStatus].filter(Boolean).length
  
  // Calculate stats
  const totalItems = data?.total || 0
  const totalValue = data?.items.reduce((sum, item) => 
    sum + ((item.unit_price || 0) * (item.quantity_total || 0)), 0
  ) || 0
  const lowStockCount = data?.items.filter(item => item.stock_status === 'low_stock').length || 0
  const outOfStockCount = data?.items.filter(item => item.stock_status === 'out_of_stock').length || 0
  const categoriesCount = categories?.length || 0
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="p-3 space-y-2">
          {/* Title & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Tài sản</h1>
              <p className="text-xs text-muted-foreground">{totalItems} sản phẩm</p>
            </div>
            <PermissionGate module="items" action="create">
              <Button
                size="sm"
                onClick={() => navigate('/items/new')}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Thêm
              </Button>
            </PermissionGate>
          </div>
          
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, mã..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="h-9 pl-8 pr-8 text-sm"
              />
              {filters.search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-2.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 text-xs">{activeFiltersCount}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-2xl">
                <SheetHeader className="pb-3">
                  <SheetTitle className="text-left text-base">Bộ lọc</SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Danh mục</label>
                    <Select
                      value={filters.categoryId || 'all'}
                      onValueChange={(value) => 
                        handleFilterChange({ categoryId: value === 'all' ? undefined : value })
                      }
                    >
                      <SelectTrigger className="h-9">
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
                  
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Trạng thái</label>
                    <Select
                      value={filters.status || 'active'}
                      onValueChange={(value) => 
                        handleFilterChange({ status: value as any })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Đang dùng</SelectItem>
                        <SelectItem value="discontinued">Ngừng dùng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setFilters({ status: 'active' })
                        setIsFilterOpen(false)
                      }}
                    >
                      Xóa lọc
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      Áp dụng
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex gap-4 px-3 pb-2 text-xs overflow-x-auto">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{totalItems}</span>
            <span className="text-muted-foreground">sản phẩm</span>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatCurrency(totalValue)}</span>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1 whitespace-nowrap text-yellow-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">{lowStockCount}</span>
              <span>thấp</span>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-1 whitespace-nowrap text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{outOfStockCount}</span>
              <span>hết</span>
            </div>
          )}
        </div>
        
        {/* Stock Status Tabs */}
        <div className="px-3 pb-2">
          <Tabs value={activeStockStatus} onValueChange={handleTabChange}>
            <TabsList className="w-full grid grid-cols-4 h-8 p-0.5">
              <TabsTrigger value="all" className="text-xs h-7">Tất cả</TabsTrigger>
              <TabsTrigger value="in_stock" className="text-xs h-7">Đủ</TabsTrigger>
              <TabsTrigger value="low_stock" className="text-xs h-7">Thấp</TabsTrigger>
              <TabsTrigger value="out_of_stock" className="text-xs h-7">Hết</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Items List */}
      <div className="flex-1 overflow-auto">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="p-3 space-y-2 pb-20">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <LoadingSpinner />
                <p className="text-xs text-muted-foreground mt-2">Đang tải...</p>
              </div>
            ) : data?.items.length === 0 ? (
              <div className="text-center py-10">
                <Package className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Không có tài sản nào</p>
                {!filters.search && (
                  <Button size="sm" onClick={() => navigate('/items/new')} className="mt-3">
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm tài sản
                  </Button>
                )}
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
                
                {data && data.page < data.totalPages && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setPage(p => p + 1)}
                  >
                    Xem thêm ({data.total - data.items.length} còn lại)
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
