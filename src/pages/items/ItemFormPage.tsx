import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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

const ITEM_TYPES = ['linen', 'consumable', 'equipment', 'furniture'] as const

type ItemFormData = z.infer<ReturnType<typeof createItemSchema>>

function createItemSchema(t: (key: string) => string) {
  return z.object({
    code: z.string().min(1, t('items:validation.codeRequired')),
    name: z.string().min(1, t('items:validation.nameRequired')),
    name_en: z.string().optional(),
    description: z.string().optional(),
    category_id: z.string().uuid(t('items:validation.categoryRequired')),
    item_type: z.enum(['linen', 'consumable', 'equipment', 'furniture']),
    unit: z.string().min(1, t('items:validation.unitRequired')),
    unit_price: z.number().min(0, t('items:validation.priceMin')),
    minimum_stock: z.number().min(0, t('items:validation.stockMin')),
    reorder_point: z.number().min(0, t('items:validation.reorderMin')),
    brand: z.string().optional(),
    model: z.string().optional(),
    images: z.array(z.string()).optional(),
  })
}

export function ItemFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation(['items', 'common'])
  const isEdit = !!id
  const copyFrom = location.state?.copyFrom

  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: itemData, isLoading: itemLoading } = useItem(id)
  const item = itemData?.item
  const { data: itemImages = [] } = useItemImages(id)
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const addItemImage = useAddItemImage()
  const deleteItemImage = useDeleteItemImage()
  const quotaCheck = useQuotaCheck('item')
  
  const [images, setImages] = useState<string[]>([])

  const itemSchema = createItemSchema(t)

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
      minimum_stock: 10,
      reorder_point: 20,
      item_type: 'equipment',
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
      setValue('item_type', copyFrom.item_type || 'equipment')
      setValue('unit', copyFrom.unit || 'cái')
      setValue('unit_price', copyFrom.unit_price || 0)
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
      
      reset({
        code: item.code || '',
        name: item.name || '',
        name_en: item.name_en || '',
        description: item.description || '',
        category_id: item.category_id || '',
        item_type: item.item_type || 'equipment',
        unit: item.unit || 'cái',
        unit_price: item.unit_price || 0,
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
    if (isAllHotelsMode) {
      toast.error(t('items:alerts.selectHotelToCreate'))
      return
    }

    if (!selectedHotel?.id) {
      toast.error(t('items:alerts.selectHotelFirst'))
      return
    }

    if (!isEdit && !quotaCheck.checkQuota()) {
      return
    }

    try {
      console.log('Form data:', data)
      console.log('Images:', images)
      
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
        const result = await createItem.mutateAsync({
          ...itemDataWithoutImages,
          tenant_id: tenantId,
          hotel_id: selectedHotel.id,
          quantity_total: 0,
          quantity_in_stock: 0,
          quantity_in_use: 0,
          quantity_in_laundry: 0,
          quantity_damaged: 0,
          quantity_lost: 0,
          status: 'active',
        })
        savedItemId = result.id
      }
      
      if (images.length > 0) {
        const existingImageUrls = itemImages.map(img => img.url)
        
        const imagesToDelete = itemImages.filter(img => !images.includes(img.url))
        for (const img of imagesToDelete) {
          await deleteItemImage.mutateAsync(img.id)
        }
        
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
      
      toast.success(isEdit ? t('items:messages.updateSuccess') : t('items:messages.createSuccess'))
      
      navigate('/items')
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(t('items:messages.saveError'))
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
          <h1 className="text-3xl font-bold">{t('items:loading')}</h1>
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
              {isEdit ? t('items:editItem') : t('items:addNew')}
            </h1>
            {!isMobile && (
              <p className="text-muted-foreground">
                {isEdit ? t('items:form.subtitle.edit') : t('items:form.subtitle.create')}
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
              {t('items:alerts.allHotelsMode')}
            </AlertDescription>
          </Alert>
        )}

        {!isAllHotelsMode && !selectedHotel && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('items:alerts.noHotelSelected')}
            </AlertDescription>
          </Alert>
        )}

      <form key={item?.id || 'new'} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {isMobile ? (
          // Mobile: Accordion layout
          <Accordion type="multiple" defaultValue={['basic', 'product']} className="space-y-4">
            <AccordionItem value="basic" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                {t('items:form.sections.basicInfo')}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-base">{t('items:fields.code')} *</Label>
                  <Input id="code" {...register('code')} className="h-12 text-base" />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-base">{t('items:fields.category')} *</Label>
                  <Select
                    value={watch('category_id')}
                    onValueChange={(value) => setValue('category_id', value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={t('items:form.selectCategory')} />
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
                  <Label htmlFor="item_type" className="text-base">{t('items:fields.itemType')} *</Label>
                  <Select
                    value={watch('item_type')}
                    onValueChange={(value: any) => setValue('item_type', value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={t('items:form.selectItemType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex flex-col">
                            <span className="font-medium">{t(`items:itemType.${type}`)}</span>
                            <span className="text-xs text-muted-foreground">{t(`items:itemTypeDescription.${type}`)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">{t('items:fields.name')} *</Label>
                  <Input id="name" {...register('name')} className="h-12 text-base" />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_en" className="text-base">{t('items:fields.nameEn')}</Label>
                  <Input id="name_en" {...register('name_en')} className="h-12 text-base" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">{t('items:fields.description')}</Label>
                  <Textarea id="description" {...register('description')} rows={3} className="text-base" />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="product" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                {t('items:form.sections.productInfo')}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-base">{t('items:fields.brand')}</Label>
                  <Input id="brand" {...register('brand')} className="h-12 text-base" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-base">{t('items:fields.model')}</Label>
                  <Input id="model" {...register('model')} className="h-12 text-base" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-base">{t('items:fields.unit')} *</Label>
                  <Input id="unit" {...register('unit')} className="h-12 text-base" />
                  {errors.unit && (
                    <p className="text-sm text-destructive">{errors.unit.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price" className="text-base">{t('items:fields.unitPrice')} *</Label>
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
                  <Label htmlFor="minimum_stock" className="text-base">{t('items:fields.minimumStock')} *</Label>
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
                  <Label htmlFor="reorder_point" className="text-base">{t('items:fields.reorderPoint')} *</Label>
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
                {t('items:form.sections.images')}
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
          // Desktop: Card layout
          <>
        <Card>
          <CardHeader>
            <CardTitle>{t('items:form.sections.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t('items:fields.code')} *</Label>
                <Input id="code" {...register('code')} />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">{t('items:fields.category')} *</Label>
                <Select
                  value={watch('category_id')}
                  onValueChange={(value) => setValue('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('items:form.selectCategory')} />
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
                <Label htmlFor="item_type">{t('items:fields.itemType')} *</Label>
                <Select
                  value={watch('item_type')}
                  onValueChange={(value: any) => setValue('item_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('items:form.selectItemType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex flex-col">
                          <span className="font-medium">{t(`items:itemType.${type}`)}</span>
                          <span className="text-xs text-muted-foreground">{t(`items:itemTypeDescription.${type}`)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('items:fields.name')} *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">{t('items:fields.nameEn')}</Label>
                <Input id="name_en" {...register('name_en')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('items:fields.description')}</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('items:form.sections.productInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">{t('items:fields.brand')}</Label>
                <Input id="brand" {...register('brand')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">{t('items:fields.model')}</Label>
                <Input id="model" {...register('model')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">{t('items:fields.unit')} *</Label>
                <Input id="unit" {...register('unit')} />
                {errors.unit && (
                  <p className="text-sm text-destructive">{errors.unit.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">{t('items:fields.unitPrice')} *</Label>
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
                <Label htmlFor="minimum_stock">{t('items:fields.minimumStock')} *</Label>
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
                <Label htmlFor="reorder_point">{t('items:fields.reorderPoint')} *</Label>
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
            <CardTitle>{t('items:form.sections.images')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={images}
              onChange={setImages}
              maxImages={10}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('items:form.imageHint')}
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
            {t('items:form.buttons.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isAllHotelsMode || !selectedHotel}
            className={isMobile ? 'flex-1 h-12' : ''}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? t('items:form.buttons.saving') : isEdit ? t('items:form.buttons.update') : t('items:form.buttons.create')}
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}