import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Package, Sparkles, FileUp, FileDown, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { ItemFilters } from '@/components/items/ItemFilters'
import { ItemTable } from '@/components/items/ItemTable'
import { BulkActionsBar } from '@/components/items/BulkActionsBar'
import { MobileItemsPage } from '@/components/items/MobileItemsPage'
import { ServiceListTab } from '@/components/services/ServiceListTab'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { ImportExcelDialog } from '@/components/shared/ImportExcelDialog'
import { useItems } from '@/hooks/useItems'
import { useBreakpoint } from '@/lib/breakpoints'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncCategories } from '@/hooks/useSyncCategories'
import { supabase } from '@/integrations/supabase/client'
import { exportItemsToExcel } from '@/lib/exportUtils'
import { downloadItemsTemplate, parseItemsExcel, type ItemImportRow } from '@/lib/importUtils'
import { toast } from '@/hooks/use-toast'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ItemFilters as IItemFilters } from '@/types/items.types'

export function ItemsPage() {
  const { t } = useTranslation('items')
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [mainTab, setMainTab] = useState<string>('items')
  const { tenantId, hotelId } = useUser()
  const { selectedHotel } = useHotelContext()
  const queryClient = useQueryClient()
  const { syncCategories } = useSyncCategories()
  const [isExporting, setIsExporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  
  const [filters, setFilters] = useState<IItemFilters>(() => ({
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    stockStatus: (searchParams.get('stockStatus') as any) || undefined,
    status: (searchParams.get('status') as any) || 'active',
  }))
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1)
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || 25)
  
  useEffect(() => {
    if (isMobile) return
    
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.stockStatus) params.set('stockStatus', filters.stockStatus)
    if (filters.status) params.set('status', filters.status)
    if (page !== 1) params.set('page', page.toString())
    if (pageSize !== 25) params.set('pageSize', pageSize.toString())
    setSearchParams(params, { replace: true })
  }, [filters, page, pageSize, setSearchParams, isMobile])
  
  const { data, isLoading, error } = useItems(filters, page, pageSize)
  
  if (error) {
    console.error('Items loading error:', error)
  }
  
  const handleFilterChange = (newFilters: Partial<IItemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1)
  }

  const handleExport = async () => {
    try {
      if (!tenantId) {
        toast({ title: 'Lỗi', description: 'Không tìm thấy thông tin tenant', variant: 'destructive' })
        return
      }
      setIsExporting(true)
      const { data, error } = await supabase.rpc('get_items_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: filters.hotelId || hotelId || null,
        p_category_id: filters.categoryId || null,
        p_stock_status: filters.stockStatus || null,
        p_status: filters.status || 'active',
        p_search: filters.search || null,
        p_limit: 10000,
        p_offset: 0,
      })
      if (error) throw error
      if (!data || data.length === 0) {
        toast({ title: 'Không có dữ liệu', description: 'Không tìm thấy items phù hợp với bộ lọc' })
        return
      }
      const filename = exportItemsToExcel(data, 'items-export')
      toast({ title: 'Thành công', description: `Đã xuất ${data.length} items ra file ${filename}` })
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportItems = async (data: ItemImportRow[]): Promise<{ success: number; failed: number; updated?: number }> => {
    let created = 0
    let updated = 0
    let failed = 0

    const targetHotelId = selectedHotel?.id || hotelId
    if (!tenantId || !targetHotelId) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn khách sạn trước khi import', variant: 'destructive' })
      return { success: 0, failed: data.length }
    }

    const [categoriesResult, itemsResult] = await Promise.all([
      supabase.from('item_categories').select('id, name').eq('tenant_id', tenantId).eq('hotel_id', targetHotelId),
      supabase.from('items').select('id, name, code').eq('tenant_id', tenantId).eq('hotel_id', targetHotelId)
    ])

    const categoryMap = new Map(categoriesResult.data?.map(c => [c.name.toLowerCase().trim(), c.id]) || [])
    const existingItemsMap = new Map(itemsResult.data?.map(item => [item.name.toLowerCase().trim(), item]) || [])

    const uniqueCategoryNames = [...new Set(data.map(item => item.category_name).filter(Boolean))] as string[]
    const missingCategories = uniqueCategoryNames.filter(name => !categoryMap.has(name.toLowerCase().trim()))

    if (missingCategories.length > 0) {
      const categoriesToInsert = missingCategories.map((name, idx) => ({
        tenant_id: tenantId,
        hotel_id: targetHotelId,
        name,
        code: name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15) + '_' + (Date.now() + idx).toString().slice(-4),
        status: 'active'
      }))

      const { data: newCategories, error } = await supabase
        .from('item_categories')
        .insert(categoriesToInsert)
        .select('id, name')

      if (error) {
        console.error('Batch create categories error:', error)
      } else if (newCategories) {
        newCategories.forEach(c => categoryMap.set(c.name.toLowerCase().trim(), c.id))
        toast({ title: 'Đã tạo danh mục mới', description: `Tự động tạo ${newCategories.length} danh mục` })
        queryClient.invalidateQueries({ queryKey: ['item-categories'] })
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      }
    }

    const itemsToInsert: any[] = []
    const itemsToUpdate: { id: string; data: any }[] = []

    data.forEach((item, idx) => {
      const categoryId = item.category_name ? categoryMap.get(item.category_name.toLowerCase().trim()) : null
      const itemNameKey = item.name.toLowerCase().trim()
      const existingItem = existingItemsMap.get(itemNameKey)

      if (existingItem) {
        itemsToUpdate.push({
          id: existingItem.id,
          data: {
            name: item.name,
            name_en: item.name_en || null,
            category_id: categoryId,
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
            updated_at: new Date().toISOString(),
          }
        })
      } else {
        itemsToInsert.push({
          tenant_id: tenantId,
          hotel_id: targetHotelId,
          code: `ITEM-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
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
        existingItemsMap.set(itemNameKey, { id: '', name: item.name, code: '' })
      }
    })

    if (itemsToInsert.length > 0) {
      const { data: insertedItems, error } = await supabase.from('items').insert(itemsToInsert).select('id')
      if (error) {
        console.error('Batch insert items error:', error)
        failed += itemsToInsert.length
      } else {
        created = insertedItems?.length || 0
      }
    }

    const CHUNK_SIZE = 50
    for (let i = 0; i < itemsToUpdate.length; i += CHUNK_SIZE) {
      const chunk = itemsToUpdate.slice(i, i + CHUNK_SIZE)
      const updatePromises = chunk.map(({ id, data: updateData }) =>
        supabase.from('items').update(updateData).eq('id', id)
      )
      const results = await Promise.all(updatePromises)
      results.forEach(result => {
        if (result.error) { failed++ } else { updated++ }
      })
    }

    if (tenantId && targetHotelId) {
      await syncCategories(tenantId, targetHotelId)
    }

    queryClient.invalidateQueries({ queryKey: ['items'] })
    
    const messages = []
    if (created > 0) messages.push(`Tạo mới: ${created}`)
    if (updated > 0) messages.push(`Cập nhật: ${updated}`)
    if (failed > 0) messages.push(`Lỗi: ${failed}`)
    
    if (messages.length > 0) {
      toast({
        title: 'Import hoàn tất',
        description: messages.join(' | '),
        variant: failed > 0 ? 'destructive' : 'default',
      })
    }
    
    return { success: created + updated, failed, updated }
  }
  
  if (isMobile) {
    return <MobileItemsPage />
  }
  
  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        description={t('description', 'Quản lý tất cả tài sản và đồ dùng trong khách sạn')}
      >
        {mainTab === 'items' && (
          <>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setImportDialogOpen(true)}>
              <FileUp className="mr-1.5 h-3.5 w-3.5" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
              )}
              Xuất Excel
            </Button>
            <PermissionGate module="items" action="create">
              <Button onClick={() => navigate('/items/new')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addNew')}
              </Button>
            </PermissionGate>
          </>
        )}
      </PageHeader>
      
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="h-9">
          <TabsTrigger value="items" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Tài sản
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Dịch vụ
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="space-y-4 mt-3">
          <ItemFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          
          <ItemTable
            items={data?.items || []}
            isLoading={isLoading}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            page={page}
            pageSize={pageSize}
            total={data?.total || 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          
          {selectedItems.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedItems.length}
              selectedItems={selectedItems}
              onClearSelection={() => setSelectedItems([])}
            />
          )}
        </TabsContent>
        
        <TabsContent value="services" className="mt-3">
          <ServiceListTab />
        </TabsContent>
      </Tabs>

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
