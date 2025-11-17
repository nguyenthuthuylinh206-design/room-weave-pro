import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { useCreateItem, useUpdateItem, useItem } from '@/hooks/useItems'
import { useItemCategories } from '@/hooks/useItemCategories'
import { ChevronLeft, ChevronRight, Check, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { compressImage } from '@/lib/imageCompression'

const itemSchema = z.object({
  code: z.string().min(1, 'Mã là bắt buộc'),
  name: z.string().min(1, 'Tên là bắt buộc'),
  name_en: z.string().optional(),
  category_id: z.string().min(1, 'Danh mục là bắt buộc'),
  unit: z.string().min(1, 'Đơn vị là bắt buộc'),
  unit_price: z.number().min(0, 'Đơn giá phải >= 0'),
  minimum_stock: z.number().min(0, 'Tồn tối thiểu phải >= 0'),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
})

type ItemFormData = z.infer<typeof itemSchema>

const STEPS = [
  { id: 1, title: 'Thông tin cơ bản' },
  { id: 2, title: 'Chi tiết' },
  { id: 3, title: 'Hình ảnh' },
]

export const MobileItemFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const { data: existingItem, isLoading: itemLoading } = useItem(id)
  const { data: categories = [] } = useItemCategories()

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      code: '',
      name: '',
      name_en: '',
      category_id: '',
      unit: 'cái',
      unit_price: 0,
      minimum_stock: 0,
      description: '',
      images: [],
    },
  })

  useEffect(() => {
    if (id && existingItem) {
      const item = (existingItem as any).item
      form.reset({
        code: item.code,
        name: item.name,
        name_en: item.name_en || '',
        category_id: item.category_id || '',
        unit: item.unit,
        unit_price: item.unit_price || 0,
        minimum_stock: item.minimum_stock || 0,
        description: item.description || '',
      })
      if (item.item_images?.length > 0) {
        setUploadedImages(item.item_images.map((img: any) => img.url))
      }
    }
  }, [id, existingItem, form])

  const onSubmit = async (data: ItemFormData) => {
    try {
      const payload = { ...data, images: uploadedImages }
      if (id) {
        await updateItem.mutateAsync({ id, data: payload })
      } else {
        await createItem.mutateAsync(payload)
      }
      navigate('/items')
    } catch (error) {
      console.error('Error submitting item:', error)
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      form.handleSubmit(onSubmit)()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(-1)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const compressed = await Promise.all(
      Array.from(files).map((file) => compressImage(file))
    )
    setUploadedImages([...uploadedImages, ...compressed])
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  if (itemLoading && id) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader
          title={id ? 'Chỉnh sửa tài sản' : 'Tạo tài sản mới'}
          showBack
        />
        <div className="p-4">
          <Card className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-96 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title={id ? 'Chỉnh sửa tài sản' : 'Tạo tài sản mới'}
        showBack
        onBack={handleBack}
      />

      <div className="p-4 space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span className="text-xs mt-1 text-center">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 transition-colors',
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Mã tài sản *</Label>
                  <Input
                    placeholder="Ví dụ: FAB-001"
                    {...form.register('code')}
                  />
                  {form.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tên tài sản *</Label>
                  <Input
                    placeholder="Ví dụ: Khăn tắm trắng"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tên tiếng Anh</Label>
                  <Input
                    placeholder="Ví dụ: Bath Towel White"
                    {...form.register('name_en')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Danh mục *</Label>
                  <Select
                    value={form.watch('category_id')}
                    onValueChange={(value) => form.setValue('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category_id && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.category_id.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Đơn vị *</Label>
                  <Select
                    value={form.watch('unit')}
                    onValueChange={(value) => form.setValue('unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cái">Cái</SelectItem>
                      <SelectItem value="chiếc">Chiếc</SelectItem>
                      <SelectItem value="bộ">Bộ</SelectItem>
                      <SelectItem value="hộp">Hộp</SelectItem>
                      <SelectItem value="chai">Chai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Đơn giá *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    {...form.register('unit_price', { valueAsNumber: true })}
                  />
                  {form.formState.errors.unit_price && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.unit_price.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tồn tối thiểu *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    {...form.register('minimum_stock', { valueAsNumber: true })}
                  />
                  {form.formState.errors.minimum_stock && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.minimum_stock.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    placeholder="Mô tả chi tiết về tài sản"
                    rows={4}
                    {...form.register('description')}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Images */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Hình ảnh</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={img}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">
                        Thêm ảnh
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 sticky bottom-20 bg-background py-3 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {currentStep === 1 ? 'Hủy' : 'Quay lại'}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleNext}
              disabled={createItem.isPending || updateItem.isPending}
            >
              {currentStep === STEPS.length ? (
                createItem.isPending || updateItem.isPending ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Hoàn thành
                  </>
                )
              ) : (
                <>
                  Tiếp theo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
