import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCreateStockAdjustment } from '@/hooks/useStockAdjustments'
import { useItems } from '@/hooks/useItems'

const adjustmentSchema = z.object({
  adjustment_type: z.enum(['inventory_check', 'damage', 'loss', 'correction']),
  scheduled_date: z.date({
    required_error: 'Vui lòng chọn ngày',
  }),
  assigned_to: z.array(z.string().uuid()).min(1, 'Phải chọn ít nhất 1 người'),
  scope: z.enum(['all', 'by_category', 'specific_items']),
  categories: z.array(z.string().uuid()).optional(),
  item_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
})

type AdjustmentFormData = z.infer<typeof adjustmentSchema>

export function CreateAdjustmentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const { mutate: createAdjustment, isPending } = useCreateStockAdjustment()
  
  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustment_type: 'inventory_check',
      scheduled_date: new Date(),
      assigned_to: [],
      scope: 'all',
      categories: [],
      item_ids: [],
      notes: '',
    },
  })
  
  const scope = form.watch('scope')
  const selectedCategories = form.watch('categories')
  const selectedItems = form.watch('item_ids')
  
  // Get items count based on scope
  const { data: itemsData } = useItems(
    scope === 'by_category' && selectedCategories
      ? { categoryId: selectedCategories[0] }
      : {},
    1,
    1000
  )
  
  const itemsCount = 
    scope === 'all' 
      ? itemsData?.total || 0
      : scope === 'specific_items'
      ? selectedItems?.length || 0
      : itemsData?.items.length || 0
  
  const onSubmit = (data: AdjustmentFormData) => {
    // Prepare item IDs based on scope
    let finalItemIds: string[] = []
    
    if (data.scope === 'all') {
      finalItemIds = itemsData?.items.map(i => i.id) || []
    } else if (data.scope === 'by_category') {
      finalItemIds = itemsData?.items.map(i => i.id) || []
    } else if (data.scope === 'specific_items') {
      finalItemIds = data.item_ids || []
    }
    
    createAdjustment(
      {
        adjustment_type: data.adjustment_type,
        scheduled_date: data.scheduled_date,
        assigned_to: data.assigned_to,
        item_ids: finalItemIds,
        notes: data.notes,
      },
      {
        onSuccess: (result: any) => {
          navigate(`/inventory/adjustments/${result.adjustment_id}`)
        },
      }
    )
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo phiếu kiểm kê"
        description="Lập phiếu kiểm kê tồn kho"
      >
        <Button variant="outline" onClick={() => navigate('/inventory/adjustments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </PageHeader>
      
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
          step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          1
        </div>
        <div className={`h-0.5 w-20 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
          step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          2
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <>
              {/* Step 1: Thông tin kiểm kê */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin kiểm kê</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Adjustment Type */}
                  <FormField
                    control={form.control}
                    name="adjustment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại kiểm kê *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="inventory_check">
                              📋 Kiểm kê định kỳ
                            </SelectItem>
                            <SelectItem value="damage">
                              ❌ Kiểm tra hư hỏng
                            </SelectItem>
                            <SelectItem value="loss">
                              🚫 Kiểm tra mất mát
                            </SelectItem>
                            <SelectItem value="correction">
                              🔧 Điều chỉnh số liệu
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Scheduled Date */}
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày lên kế hoạch *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Assigned To - Simplified for now */}
                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Người thực hiện *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="User IDs (comma separated)"
                            value={field.value.join(',')}
                            onChange={(e) => field.onChange(e.target.value.split(',').filter(Boolean))}
                          />
                        </FormControl>
                        <FormDescription>
                          Nhập user IDs cách nhau bởi dấu phẩy
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Mục đích, phạm vi, lưu ý khi kiểm kê..."
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    form.trigger(['adjustment_type', 'scheduled_date', 'assigned_to']).then(valid => {
                      if (valid) setStep(2)
                    })
                  }}
                >
                  Tiếp theo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          
          {step === 2 && (
            <>
              {/* Step 2: Chọn đồ dùng */}
              <Card>
                <CardHeader>
                  <CardTitle>Phạm vi kiểm kê</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scope */}
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chọn phạm vi *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                              <RadioGroupItem value="all" id="all" />
                              <label htmlFor="all" className="flex-1 cursor-pointer">
                                <div className="font-medium">Toàn bộ kho</div>
                                <div className="text-sm text-muted-foreground">
                                  Kiểm kê tất cả items trong kho
                                </div>
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                              <RadioGroupItem value="by_category" id="by_category" />
                              <label htmlFor="by_category" className="flex-1 cursor-pointer">
                                <div className="font-medium">Theo danh mục</div>
                                <div className="text-sm text-muted-foreground">
                                  Chọn các danh mục cần kiểm kê
                                </div>
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                              <RadioGroupItem value="specific_items" id="specific_items" />
                              <label htmlFor="specific_items" className="flex-1 cursor-pointer">
                                <div className="font-medium">Chọn items cụ thể</div>
                                <div className="text-sm text-muted-foreground">
                                  Tự chọn các items cần kiểm kê
                                </div>
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Preview */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Sẽ kiểm kê</p>
                        <p className="text-4xl font-bold">{itemsCount}</p>
                        <p className="text-sm text-muted-foreground">items</p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
              
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Quay lại
                </Button>
                <Button type="submit" disabled={isPending || itemsCount === 0}>
                  {isPending ? 'Đang tạo...' : 'Tạo phiếu kiểm kê'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  )
}
