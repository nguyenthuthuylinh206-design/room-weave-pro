import { Plus, X, AlertTriangle, Package, Home, Wrench, TruckIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ResponsiveDialog } from '@/components/mobile/ResponsiveDialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TouchButton } from '@/components/mobile/TouchOptimized'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ItemSelect } from '@/components/shared/ItemSelect'
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const quickOutboundSchema = z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    available_quantity: z.number(),
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
}).refine(
  (data) => data.items.every(item => item.quantity <= item.available_quantity),
  {
    message: 'Số lượng xuất không được vượt quá tồn kho',
    path: ['items'],
  }
)

type QuickOutboundFormData = z.infer<typeof quickOutboundSchema>

interface QuickOutboundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryOptions = [
  { value: 'room_assign', label: 'Phòng', icon: Home, description: 'Cấp phát cho phòng' },
  { value: 'laundry', label: 'Giặt là', icon: Package, description: 'Gửi giặt là' },
  { value: 'maintenance', label: 'Bảo trì', icon: Wrench, description: 'Sửa chữa, bảo trì' },
  { value: 'other', label: 'Khác', icon: TruckIcon, description: 'Lý do khác' },
]

export function QuickOutboundDialog({ open, onOpenChange }: QuickOutboundDialogProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction()
  
  const form = useForm<QuickOutboundFormData>({
    resolver: zodResolver(quickOutboundSchema),
    defaultValues: {
      transaction_category: 'room_assign',
      from_location: 'Kho tầng 1',
      to_location: '',
      items: [{ item_id: '', quantity: 1, available_quantity: 0 }],
    },
  })
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })
  
  const onSubmit = (data: QuickOutboundFormData) => {
    createOutbound(data as any, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }
  
  const items = form.watch('items')
  const hasOverstock = items.some(item => item.available_quantity > 0 && item.quantity > item.available_quantity)
  const lowStockWarnings = items.filter(
    item => item.available_quantity > 0 && 
    (item.available_quantity - item.quantity) < 10 && 
    item.quantity <= item.available_quantity
  )
  
  const selectedCategory = form.watch('transaction_category')
  
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Xuất kho nhanh"
      description={isMobile ? undefined : "Ghi nhận xuất kho đơn giản"}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Category Selection */}
          <FormField
            control={form.control}
            name="transaction_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loại xuất *</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <TouchButton
                          key={option.value}
                          type="button"
                          variant={field.value === option.value ? 'default' : 'outline'}
                          className={cn(
                            'h-auto py-3 flex-col gap-1.5',
                            isMobile && 'min-h-[72px]'
                          )}
                          onClick={() => field.onChange(option.value)}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{option.label}</span>
                        </TouchButton>
                      )
                    })}
                  </div>
                </FormControl>
                {isMobile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {categoryOptions.find(o => o.value === selectedCategory)?.description}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="from_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Từ đâu *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Kho tầng 1"
                      className={isMobile ? 'min-h-[48px]' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="to_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đến đâu *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Phòng, vị trí..."
                      className={isMobile ? 'min-h-[48px]' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>Đồ dùng *</FormLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ item_id: '', quantity: 1, available_quantity: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm
              </Button>
            </div>
            
            {fields.map((field, index) => {
              const item = items[index]
              const isOverstock = item.available_quantity > 0 && item.quantity > item.available_quantity
              
              return (
                <div 
                  key={field.id} 
                  className={cn(
                    'space-y-2 p-3 border rounded-lg',
                    isOverstock ? 'bg-destructive/5 border-destructive' : 'bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.item_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ItemSelect
                            value={field.value}
                            onChange={(value, itemData) => {
                              field.onChange(value)
                              if (itemData) {
                                form.setValue(
                                  `items.${index}.available_quantity`,
                                  itemData.quantity_in_stock || 0
                                )
                              }
                            }}
                            placeholder="Chọn đồ dùng"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {item.available_quantity > 0 && (
                    <div className={cn(
                      'flex items-center justify-between p-2 rounded text-sm',
                      isOverstock 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-muted'
                    )}>
                      <span>Tồn kho:</span>
                      <span className="font-bold">{item.available_quantity}</span>
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Số lượng xuất"
                            className={cn(
                              isMobile && 'min-h-[48px]',
                              isOverstock && 'border-destructive'
                            )}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isOverstock && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Vượt quá tồn kho!
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Warnings */}
          {lowStockWarnings.length > 0 && !hasOverstock && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Cảnh báo:</strong> {lowStockWarnings.length} item sẽ còn dưới 10 sau khi xuất
              </AlertDescription>
            </Alert>
          )}
          
          {hasOverstock && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">
                Không thể xuất vượt quá số lượng tồn kho!
              </AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <TouchButton
              type="submit"
              disabled={isLoading || hasOverstock}
              className={cn('w-full', isMobile && 'min-h-[48px]')}
            >
              {isLoading ? 'Đang xử lý...' : 'Xuất kho'}
            </TouchButton>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate('/inventory/outbound/new')
              }}
            >
              Dùng form đầy đủ →
            </Button>
          </div>
        </form>
      </Form>
    </ResponsiveDialog>
  )
}
