import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useItem, useCreateItem, useUpdateItem } from '@/hooks/useItems'
import { useCategories } from '@/hooks/useCategories'
import { useUser } from '@/hooks/useUser'
import { toast } from 'sonner'

const itemSchema = z.object({
  code: z.string().min(1, 'Mã tài sản là bắt buộc'),
  name: z.string().min(1, 'Tên tài sản là bắt buộc'),
  name_en: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().uuid('Vui lòng chọn danh mục'),
  unit: z.string().min(1, 'Đơn vị là bắt buộc'),
  unit_price: z.number().min(0, 'Đơn giá phải >= 0'),
  minimum_stock: z.number().min(0, 'Tồn kho tối thiểu phải >= 0'),
  reorder_point: z.number().min(0, 'Điểm đặt hàng phải >= 0'),
  brand: z.string().optional(),
  model: z.string().optional(),
  max_wash_cycles: z.number().min(0).optional(),
  expected_lifetime_days: z.number().min(0).optional(),
})

type ItemFormData = z.infer<typeof itemSchema>

export function ItemFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { tenantId, hotelId } = useUser()
  const { data: item, isLoading: itemLoading } = useItem(id)
  const { data: categories } = useCategories()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      unit: 'cái',
      unit_price: 0,
      minimum_stock: 10,
      reorder_point: 20,
    },
  })

  useEffect(() => {
    if (item && isEdit && typeof item === 'object' && 'code' in item) {
      const itemData = item as any
      setValue('code', itemData.code || '')
      setValue('name', itemData.name || '')
      setValue('name_en', itemData.name_en || '')
      setValue('description', itemData.description || '')
      setValue('category_id', itemData.category_id || '')
      setValue('unit', itemData.unit || 'cái')
      setValue('unit_price', itemData.unit_price || 0)
      setValue('minimum_stock', itemData.minimum_stock || 10)
      setValue('reorder_point', itemData.reorder_point || 20)
      setValue('brand', itemData.brand || '')
      setValue('model', itemData.model || '')
      setValue('max_wash_cycles', itemData.max_wash_cycles || undefined)
      setValue('expected_lifetime_days', itemData.expected_lifetime_days || undefined)
    }
  }, [item, isEdit, setValue])

  const onSubmit = async (data: ItemFormData) => {
    try {
      if (isEdit) {
        await updateItem.mutateAsync({
          id: id!,
          data: {
            ...data,
            updated_at: new Date().toISOString(),
          },
        })
      } else {
        await createItem.mutateAsync({
          ...data,
          tenant_id: tenantId,
          hotel_id: hotelId,
          quantity_total: 0,
          quantity_in_stock: 0,
          quantity_in_use: 0,
          quantity_in_laundry: 0,
          quantity_damaged: 0,
          quantity_lost: 0,
          status: 'active',
        })
      }
      navigate('/items')
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (itemLoading && isEdit) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/items')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Chỉnh sửa tài sản' : 'Thêm tài sản mới'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Cập nhật thông tin tài sản' : 'Nhập thông tin tài sản mới'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle>Thông tin vòng đời (Cho đồ vải)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_wash_cycles">Số lần giặt tối đa</Label>
                <Input
                  id="max_wash_cycles"
                  type="number"
                  {...register('max_wash_cycles', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_lifetime_days">Tuổi thọ dự kiến (ngày)</Label>
                <Input
                  id="expected_lifetime_days"
                  type="number"
                  {...register('expected_lifetime_days', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/items')}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </div>
  )
}
