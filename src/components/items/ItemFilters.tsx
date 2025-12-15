import { Search, FileDown, FileUp, QrCode } from 'lucide-react'
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
import { downloadItemsTemplate, parseItemsExcel, type ItemImportRow } from '@/lib/importUtils'
import { ImportExcelDialog } from '@/components/shared/ImportExcelDialog'
import { toast } from '@/hooks/use-toast'
import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useQueryClient } from '@tanstack/react-query'

interface ItemFiltersProps {
  filters: IItemFilters
  onFilterChange: (filters: Partial<IItemFilters>) => void
}

export function ItemFilters({ filters, onFilterChange }: ItemFiltersProps) {
  const { data: categories } = useCategories()
  const { tenantId, hotelId } = useUser()
  const { selectedHotel } = useHotelContext()
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  
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
    toast({
      title: 'Tính năng đang phát triển',
      description: 'Chức năng quét QR sẽ sớm được bổ sung',
    })
  }

  const handleImportItems = async (data: ItemImportRow[]): Promise<{ success: number; failed: number }> => {
    let success = 0
    let failed = 0

    const targetHotelId = selectedHotel?.id || hotelId
    if (!tenantId || !targetHotelId) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn khách sạn trước khi import',
        variant: 'destructive',
      })
      return { success: 0, failed: data.length }
    }

    // Build category name to id map
    const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) || [])

    for (const item of data) {
      try {
        // Generate unique code
        const code = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        
        // Find category id by name
        const categoryId = item.category_name 
          ? categoryMap.get(item.category_name.toLowerCase()) 
          : null

        const { error } = await supabase.from('items').insert({
          tenant_id: tenantId,
          hotel_id: targetHotelId,
          code,
          name: item.name,
          name_en: item.name_en || null,
          category_id: categoryId || null,
          unit: item.unit,
          unit_price: item.unit_price,
          brand: item.brand || null,
          model: item.model || null,
          quantity_total: item.quantity_total,
          quantity_in_stock: item.quantity_total,
          minimum_stock: item.minimum_stock,
          reorder_point: item.reorder_point || null,
          description: item.description || null,
          status: 'active',
        })

        if (error) {
          console.error('Import item error:', error)
          failed++
        } else {
          success++
        }
      } catch {
        failed++
      }
    }

    // Refresh items list
    queryClient.invalidateQueries({ queryKey: ['items'] })
    
    return { success, failed }
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
        <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
          <FileUp className="mr-2 h-4 w-4" />
          Import Excel
        </Button>
        
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

      <ImportExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Tài sản từ Excel"
        description="Tải file mẫu, điền thông tin và upload để import hàng loạt"
        onDownloadTemplate={downloadItemsTemplate}
        onParseFile={parseItemsExcel}
        onImport={handleImportItems}
      />
    </div>
  )
}
