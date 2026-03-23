import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/useCategories'
import type { ItemFilters as IItemFilters } from '@/types/items.types'
import { WarehouseSelect } from '@/components/warehouse/WarehouseSelect'
import { useWarehouses } from '@/hooks/useWarehouses'

interface ItemFiltersProps {
  filters: IItemFilters
  onFilterChange: (filters: Partial<IItemFilters>) => void
}

export function ItemFilters({ filters, onFilterChange }: ItemFiltersProps) {
  const { data: categories } = useCategories()
  const { data: warehouses } = useWarehouses()
  
  const hasMultipleWarehouses = (warehouses?.length || 0) > 1
  
  return (
    <div className="sticky top-0 z-10 bg-background pb-3 pt-1">
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="h-9 pl-8 text-sm"
          />
        </div>
        
        {/* Category Filter */}
        <Select
          value={filters.categoryId || 'all'}
          onValueChange={(value) => 
            onFilterChange({ categoryId: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-40">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Stock Status Filter */}
        <Select
          value={filters.stockStatus || 'all'}
          onValueChange={(value) => 
            onFilterChange({ stockStatus: value === 'all' ? undefined : value as any })
          }
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-36">
            <SelectValue placeholder="Tồn kho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="in_stock">Đủ hàng</SelectItem>
            <SelectItem value="low_stock">Thấp</SelectItem>
            <SelectItem value="out_of_stock">Hết hàng</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Warehouse Filter - only show when >1 warehouse */}
        {hasMultipleWarehouses && (
          <WarehouseSelect
            value={filters.warehouseId || ''}
            onValueChange={(value) => 
              onFilterChange({ warehouseId: value || undefined })
            }
            placeholder="Tất cả kho"
            showAllOption
            className="h-9 w-full text-sm sm:w-40"
          />
        )}
      </div>
    </div>
  )
}
