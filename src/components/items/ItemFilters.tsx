import { Search, FileDown, QrCode } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/useCategories'
import type { ItemFilters as IItemFilters } from '@/types/items.types'
import { supabase } from '@/integrations/supabase/client'
import { exportItemsToExcel } from '@/lib/exportUtils'
import { toast } from '@/hooks/use-toast'
import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ItemFiltersProps {
  filters: IItemFilters
  onFilterChange: (filters: Partial<IItemFilters>) => void
}

export function ItemFilters({ filters, onFilterChange }: ItemFiltersProps) {
  const { data: categories } = useCategories()
  const { tenantId, hotelId } = useUser()
  const [isExporting, setIsExporting] = useState(false)
  
  const handleExport = async () => {
    try {
      if (!tenantId) {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy thông tin tenant',
          variant: 'destructive',
        })
        return
      }

      setIsExporting(true)
      
      // Fetch items with current filters
      const { data, error } = await supabase.rpc('get_items_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: filters.hotelId || hotelId || null,
        p_category_id: filters.categoryId || null,
        p_stock_status: filters.stockStatus || null,
        p_status: filters.status || 'active',
        p_search: filters.search || null,
        p_limit: 10000, // Export all matching items
        p_offset: 0,
      })
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        toast({
          title: 'Không có dữ liệu',
          description: 'Không tìm thấy items phù hợp với bộ lọc',
        })
        return
      }
      
      const filename = exportItemsToExcel(data, 'items-export')
      
      toast({
        title: 'Thành công',
        description: `Đã xuất ${data.length} items ra file ${filename}`,
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  const handleScanQR = () => {
    // TODO: Implement QR scanner
    toast({
      title: 'Tính năng đang phát triển',
      description: 'Chức năng quét QR sẽ sớm được bổ sung',
    })
  }
  
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background pb-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        
        {/* Category Filter */}
        <Select
          value={filters.categoryId || 'all'}
          onValueChange={(value) => 
            onFilterChange({ categoryId: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger className="w-full sm:w-48">
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
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trạng thái kho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="in_stock">Đủ hàng</SelectItem>
            <SelectItem value="low_stock">Thấp</SelectItem>
            <SelectItem value="out_of_stock">Hết hàng</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Item Status Filter */}
        <Select
          value={filters.status || 'active'}
          onValueChange={(value) => 
            onFilterChange({ status: value as any })
          }
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Đang dùng</SelectItem>
            <SelectItem value="discontinued">Ngừng dùng</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <div className="mr-2">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Xuất Excel
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleScanQR}>
          <QrCode className="mr-2 h-4 w-4" />
          Quét QR
        </Button>
      </div>
    </div>
  )
}
