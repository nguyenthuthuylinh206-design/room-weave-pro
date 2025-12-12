import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { useQuotaCheck } from '@/hooks/useQuotaCheck'
import { QuotaExceededDialog } from '@/components/settings/usage/QuotaExceededDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { useItem, useCreateItem, useUpdateItem } from '@/hooks/useItems'
import { useItemImages, useAddItemImage, useDeleteItemImage } from '@/hooks/useItemImages'
import { useCategories } from '@/hooks/useCategories'
import { useUser } from '@/hooks/useUser'
import { useBreakpoint } from '@/lib/breakpoints'
import { useHotelContext } from '@/contexts/HotelContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { HotelBadge } from '@/components/layout/HotelBadge'
import { toast } from 'sonner'

const itemSchema = z.object({
  code: z.string().min(1, 'Mã tài sản là bắt buộc'),
  name: z.string().min(1, 'Tên tài sản là bắt buộc'),
  name_en: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().uuid('Vui lòng chọn danh mục'),
  unit: z.string().min(1, 'Đơn vị là bắt buộc'),
  unit_price: z.number().min(0, 'Đơn giá phải >= 0'),
  quantity_total: z.number().int().min(0, 'Số lượng phải >= 0'),
  minimum_stock: z.number().min(0, 'Tồn kho tối thiểu phải >= 0'),
  reorder_point: z.number().min(0, 'Điểm đặt hàng phải >= 0'),
  brand: z.string().optional(),
  model: z.string().optional(),
  images: z.array(z.string()).optional(),
})

type ItemFormData = z.infer<typeof itemSchema>

export function ItemFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useBreakpoint()
  const isEdit = !!id
  const copyFrom = location.state?.copyFrom

  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: itemData, isLoading: itemLoading } = useItem(id)
  const item = itemData?.item // Extract item from response structure
  const { data: itemImages = [] } = useItemImages(id)
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const addItemImage = useAddItemImage()
  const deleteItemImage = useDeleteItemImage()
  const quotaCheck = useQuotaCheck('item')
  
  const [images, setImages] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      unit: 'cái',
      unit_price: 0,
      quantity_total: 0,
      minimum_stock: 10,
      reorder_point: 20,
    },
  })

  // Handle copy mode
  useEffect(() => {
    if (copyFrom) {
      setValue('code', `${copyFrom.code}-COPY-${Date.now().toString().slice(-4)}`)
      setValue('name', `${copyFrom.name} (Copy)`)
      setValue('name_en', copyFrom.name_en || '')
      setValue('description', copyFrom.description || '')
      setValue('category_id', copyFrom.category_id || '')
      setValue('unit', copyFrom.unit || 'cái')
      setValue('unit_price', copyFrom.unit_price || 0)
      setValue('quantity_total', 0) // Reset quantity for copy
      setValue('minimum_stock', copyFrom.minimum_stock || 10)
      setValue('reorder_point', copyFrom.reorder_point || 20)
      setValue('brand', copyFrom.brand || '')
      setValue('model', copyFrom.model || '')
    }
  }, [copyFrom, setValue])

  // Load item data for edit mode
  useEffect(() => {
    if (item && isEdit && !copyFrom) {
      console.log('Loading item data:', item)
      
      // Reset form với tất cả dữ liệu
      reset({
        code: item.code || '',
        name: item.name || '',
        name_en: item.name_en || '',
        description: item.description || '',
        category_id: item.category_id || '',
        unit: item.unit || 'cái',
        unit_price: item.unit_price || 0,
        quantity_total: item.quantity_total || 0,
        minimum_stock: item.minimum_stock || 10,
        reorder_point: item.reorder_point || 20,
        brand: item.brand || '',
        model: item.model || '',
      })
    }
  }, [item, isEdit, copyFrom, reset])
  
  // Load images from item_images table when editing
  useEffect(() => {
    if (itemImages && itemImages.length > 0) {
      const imageUrls = itemImages.map(img => img.url)
      setImages(imageUrls)
    }
  }, [itemImages])

  const onSubmit = async (data: ItemFormData) => {
    // Prevent creation when in All Hotels mode
    if (isAllHotelsMode) {
      toast.error('Vui lòng chọn một khách sạn cụ thể trước khi tạo sản phẩm')
      return
    }

    // Check if hotel is selected
    if (!selectedHotel?.id) {
      toast.error('Vui lòng chọn khách sạn trước khi tạo sản phẩm')
      return
    }

    // Check quota for new items
    if (!isEdit && !quotaCheck.checkQuota()) {
      return
    }

    try {
      console.log('Form data:', data)
      console.log('Images:', images)
      
      // Remove images from itemData since they're now in separate table
      const { images: _, ...itemDataWithoutImages } = data as any
      
      let savedItemId: string
      
      if (isEdit) {
        await updateItem.mutateAsync({
          id: id!,
          data: {
            ...itemDataWithoutImages,
            updated_at: new Date().toISOString(),
          },
        })
        savedItemId = id!
      } else {
        const initialQuantity = itemDataWithoutImages.quantity_total || 0
        const result = await createItem.mutateAsync({
          ...itemDataWithoutImages,
          tenant_id: tenantId,
          hotel_id: selectedHotel.id,
          quantity_total: initialQuantity,
          quantity_in_stock: initialQuantity, // Set initial stock = quantity_total
          quantity_in_use: 0,
          quantity_in_laundry: 0,
          quantity_damaged: 0,
          quantity_lost: 0,
          status: 'active',
        })
        savedItemId = result.id
      }
      
      // Handle images in separate table
      if (images.length > 0) {
        // Get existing image URLs for this item
        const existingImageUrls = itemImages.map(img => img.url)
        
        // Delete images that are no longer in the list
        const imagesToDelete = itemImages.filter(img => !images.includes(img.url))
        for (const img of imagesToDelete) {
          await deleteItemImage.mutateAsync(img.id)
        }
        
        // Add new images (chỉ thêm ảnh chưa có trong database)
        const newImages = images.filter(url => !existingImageUrls.includes(url))
        for (let i = 0; i < newImages.length; i++) {
          await addItemImage.mutateAsync({
            itemId: savedItemId,
            tenantId: tenantId,
            url: newImages[i],
            isPrimary: i === 0 && existingImageUrls.length === 0,
          })
        }
      }
      
      toast.success(isEdit ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm mới')
      
      navigate('/items')
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Lỗi khi lưu sản phẩm')
    }
  }

  // Wait for item and categories to load in edit mode
  if (isEdit && (itemLoading || categoriesLoading || !item)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/items')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Đang tải...</h1>
        </div>
      </div>
    )
  }

  return (
    <>
      <QuotaExceededDialog
        open={quotaCheck.showDialog}
        onOpenChange={quotaCheck.setShowDialog}
        resourceType="item"
        currentUsage={quotaCheck.currentUsage}
        limit={quotaCheck.limit}
      />
      <div className="space-y-6 pb-24">
        {/* Header - Sticky on mobile */}
        <div className={`flex items-center gap-4 ${isMobile ? 'sticky top-0 z-10 bg-background py-4 -mx-4 px-4 border-b' : ''}`}>
          <Button variant="ghost" size="icon" onClick={() => navigate('/items')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className={`font-bold truncate ${isMobile ? 'text-xl' : 'text-3xl'}`}>
              {isEdit ? 'Chỉnh sửa tài sản' : 'Thêm tài sản mới'}
            </h1>
            {!isMobile && (
              <p className="text-muted-foreground">
                {isEdit ? 'Cập nhật thông tin tài sản' : 'Nhập thông tin tài sản mới'}
              </p>
            )}
          </div>
          {!isMobile && <HotelBadge />}
        </div>

        {/* Alert for All Hotels Mode */}
        {isAllHotelsMode && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn đang ở chế độ xem tất cả khách sạn. Vui lòng chọn một khách sạn cụ thể để tạo sản phẩm mới.
            </AlertDescription>
          </Alert>
        )}

        {!isAllHotelsMode && !selectedHotel && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Chưa chọn khách sạn. Vui lòng chọn khách sạn từ menu trên cùng.
            </AlertDescription>
          </Alert>
        )}

      <form key={item?.id || 'new'} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {isMobile ? (
          // Mobile: Accordion layout
          <Accordion type="multiple" defaultValue={['basic', 'product']} className="space-y-4">
            <AccordionItem value="basic" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Thông tin cơ bản
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-base">Mã tài sản *</Label>
                  <Input id="code" {...register('code')} className="h-12 text-base" />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-base">Danh mục *</Label>
                  <Select
                    value={watch('category_id')}
                    onValueChange={(value) => setValue('category_id', value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Chọn danh mục..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && (
                    <p className="text-sm text-destructive">{errors.category_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">Tên tài sản *</Label>
                  <Input id="name" {...register('name')} className="h-12 text-base" />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_en" className="text-base">Tên tiếng Anh</Label>
                  <Input id="name_en" {...register('name_en')} className="h-12 text-base" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">Mô tả</Label>
                  <Textarea id="description" {...register('description')} rows={3} className="text-base" />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="product" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Thông tin sản phẩm
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-base">Thương hiệu</Label>
                  <Input id="brand" {...register('brand')} className="h-12 text-base" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-base">Model</Label>
                  <Input id="model" {...register('model')} className="h-12 text-base" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-base">Đơn vị *</Label>
                  <Input id="unit" {...register('unit')} className="h-12 text-base" />
                  {errors.unit && (
                    <p className="text-sm text-destructive">{errors.unit.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price" className="text-base">Đơn giá (₫) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    {...register('unit_price', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {errors.unit_price && (
                    <p className="text-sm text-destructive">{errors.unit_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_stock" className="text-base">Tồn kho tối thiểu *</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    {...register('minimum_stock', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {errors.minimum_stock && (
                    <p className="text-sm text-destructive">{errors.minimum_stock.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity_total" className="text-base">Số lượng hiện tại</Label>
                  <Input
                    id="quantity_total"
                    type="number"
                    {...register('quantity_total', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {errors.quantity_total && (
                    <p className="text-sm text-destructive">{errors.quantity_total.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_point" className="text-base">Điểm đặt hàng *</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    {...register('reorder_point', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {errors.reorder_point && (
                    <p className="text-sm text-destructive">{errors.reorder_point.message}</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="images" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Hình ảnh
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <ImageUpload
                  images={images}
                  onChange={setImages}
                  maxImages={5}
                  className="grid-cols-2"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          // Desktop: Card layout (keep existing)
          <>
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã tài sản *</Label>
                <Input id="code" {...register('code')} />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Danh mục *</Label>
                <Select
                  value={watch('category_id')}
                  onValueChange={(value) => setValue('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-sm text-destructive">{errors.category_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên tài sản *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">Tên tiếng Anh</Label>
                <Input id="name_en" {...register('name_en')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Thương hiệu</Label>
                <Input id="brand" {...register('brand')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...register('model')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Đơn vị *</Label>
                <Input id="unit" {...register('unit')} />
                {errors.unit && (
                  <p className="text-sm text-destructive">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Đơn giá (₫) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  {...register('unit_price', { valueAsNumber: true })}
                />
                {errors.unit_price && (
                  <p className="text-sm text-destructive">{errors.unit_price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity_total">Số lượng hiện tại</Label>
                <Input
                  id="quantity_total"
                  type="number"
                  {...register('quantity_total', { valueAsNumber: true })}
                />
                {errors.quantity_total && (
                  <p className="text-sm text-destructive">{errors.quantity_total.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_stock">Tồn kho tối thiểu *</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  {...register('minimum_stock', { valueAsNumber: true })}
                />
                {errors.minimum_stock && (
                  <p className="text-sm text-destructive">{errors.minimum_stock.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorder_point">Điểm đặt hàng *</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  {...register('reorder_point', { valueAsNumber: true })}
                />
                {errors.reorder_point && (
                  <p className="text-sm text-destructive">{errors.reorder_point.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hình ảnh sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={images}
              onChange={setImages}
              maxImages={10}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Ảnh sẽ được upload lên Supabase Storage. Tối đa 10 ảnh, mỗi ảnh không quá 5MB.
            </p>
          </CardContent>
        </Card>

          </>
        )}

        {/* Submit buttons - Fixed at bottom on mobile */}
        <div className={`flex gap-3 ${isMobile ? 'fixed bottom-16 left-0 right-0 p-4 bg-background border-t z-30 safe-area-inset-bottom' : 'justify-end'}`}>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/items')}
            className={isMobile ? 'flex-1 h-12' : ''}
          >
            Hủy
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isAllHotelsMode || !selectedHotel}
            className={isMobile ? 'flex-1 h-12' : ''}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}
