import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter, Search, Package, DollarSign, AlertTriangle, XCircle, FolderOpen, SlidersHorizontal, X } from 'lucide-react'
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
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b">
        <div className="p-4 space-y-3">
          {/* Title & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Tài sản</h1>
              <p className="text-xs text-muted-foreground">{totalItems} sản phẩm</p>
            </div>
            <Button
              size="icon"
              onClick={() => navigate('/items/new')}
              className="rounded-full h-11 w-11 shadow-lg"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className={cn(
              "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
              searchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
              placeholder="Tìm theo tên, mã sản phẩm..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="pl-10 pr-10 h-11 text-base rounded-xl bg-muted/50 border-0 focus-visible:ring-2"
            />
            <AnimatePresence>
              {filters.search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          {/* Filters Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full h-11 gap-2 rounded-xl">
                <SlidersHorizontal className="h-4 w-4" />
                Bộ lọc
                {activeFiltersCount > 0 && (
                  <Badge className="ml-auto rounded-full h-5 w-5 p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left">Bộ lọc nâng cao</SheetTitle>
              </SheetHeader>
              <div className="space-y-5">
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Danh mục</label>
                  <Select
                    value={filters.categoryId || 'all'}
                    onValueChange={(value) => 
                      handleFilterChange({ categoryId: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
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
                  <label className="text-sm font-medium mb-2 block">Trạng thái hoạt động</label>
                  <Select
                    value={filters.status || 'active'}
                    onValueChange={(value) => 
                      handleFilterChange({ status: value as any })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Đang hoạt động</SelectItem>
                      <SelectItem value="discontinued">Ngừng sử dụng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => {
                      setFilters({ status: 'active' })
                      setIsFilterOpen(false)
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl"
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
        <StatScrollContainer className="px-4 pb-3">
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
            variant={lowStockCount > 0 ? "warning" : "default"}
          />
          <MobileStatCard
            icon={XCircle}
            title="Hết hàng"
            value={outOfStockCount.toString()}
            variant={outOfStockCount > 0 ? "destructive" : "default"}
          />
          <MobileStatCard
            icon={FolderOpen}
            title="Danh mục"
            value={categoriesCount.toString()}
            variant="default"
          />
        </StatScrollContainer>
        
        {/* Stock Status Tabs */}
        <div className="px-4 pb-3">
          <Tabs value={activeStockStatus} onValueChange={handleTabChange}>
            <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-xs rounded-lg data-[state=active]:shadow-sm">
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="in_stock" className="text-xs rounded-lg data-[state=active]:shadow-sm">
                Còn hàng
              </TabsTrigger>
              <TabsTrigger value="low_stock" className="text-xs rounded-lg data-[state=active]:shadow-sm">
                Sắp hết
              </TabsTrigger>
              <TabsTrigger value="out_of_stock" className="text-xs rounded-lg data-[state=active]:shadow-sm">
                Hết
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Items List */}
      <div className="flex-1 overflow-auto">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="p-4 space-y-3 pb-24">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              </div>
            ) : data?.items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">Không có tài sản nào</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filters.search ? 'Thử tìm kiếm với từ khóa khác' : 'Bắt đầu thêm tài sản mới'}
                </p>
                {!filters.search && (
                  <Button onClick={() => navigate('/items/new')} className="mt-4 rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm tài sản
                  </Button>
                )}
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {data?.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <MobileItemCard
                        item={item}
                        onView={() => navigate(`/items/${item.id}`)}
                        onEdit={() => navigate(`/items/${item.id}/edit`)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Load More */}
                {data && data.page < data.totalPages && (
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl mt-4"
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
