import { Plus, X, AlertTriangle, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ItemSelect } from '@/components/shared/ItemSelect'
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions'

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

export function QuickOutboundDialog({ open, onOpenChange }: QuickOutboundDialogProps) {
  const navigate = useNavigate()
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
  const lowStockWarnings = items.filter(
    item => item.available_quantity > 0 && 
    (item.available_quantity - item.quantity) < 10
  )
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xuất kho nhanh</DialogTitle>
          <DialogDescription>
            Ghi nhận xuất kho đơn giản. Để xuất chi tiết hơn với chữ ký và ảnh,{' '}
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => {
                onOpenChange(false)
                navigate('/inventory/outbound/new')
              }}
            >
              dùng form đầy đủ
            </Button>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="transaction_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại xuất *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="room_assign" id="room_assign" />
                        <label htmlFor="room_assign" className="cursor-pointer">
                          Xuất cho phòng
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="laundry" id="laundry" />
                        <label htmlFor="laundry" className="cursor-pointer">
                          Xuất đi giặt
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="maintenance" id="maintenance" />
                        <label htmlFor="maintenance" className="cursor-pointer">
                          Xuất bảo trì
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <label htmlFor="other" className="cursor-pointer">
                          Khác
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="from_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Từ vị trí *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VD: Kho tầng 1" />
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
                    <FormLabel>Đến vị trí *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VD: Phòng 301" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Đồ dùng *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ item_id: '', quantity: 1, available_quantity: 0 })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm đồ dùng
                </Button>
              </div>
              
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const currentItem = items[index]
                  const hasError = currentItem.quantity > currentItem.available_quantity
                  
                  return (
                    <div key={field.id} className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 grid gap-2 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.item_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <ItemSelect
                                    value={field.value}
                                    onChange={(value, item) => {
                                      field.onChange(value)
                                      if (item) {
                                        form.setValue(
                                          `items.${index}.available_quantity`,
                                          item.quantity_in_stock
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
                          
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Số lượng"
                                    max={currentItem.available_quantity}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    className={hasError ? 'border-destructive' : ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Tồn kho: {currentItem.available_quantity}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {hasError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Số lượng xuất vượt quá tồn kho
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {lowStockWarnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Sau khi xuất, {lowStockWarnings.length} item(s) sẽ xuống dưới mức tối thiểu
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Xuất kho'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
