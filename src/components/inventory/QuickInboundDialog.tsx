import { Plus, X } from 'lucide-react'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ItemSelect } from '@/components/shared/ItemSelect'
import { useCreateInboundTransaction } from '@/hooks/useInventoryTransactions'
import { formatCurrency } from '@/lib/utils'

const quickInboundSchema = z.object({
  transaction_category: z.enum(['purchase', 'return', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    unit_price: z.number().min(0, 'Đơn giá phải >= 0'),
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
})

type QuickInboundFormData = z.infer<typeof quickInboundSchema>

interface QuickInboundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickInboundDialog({ open, onOpenChange }: QuickInboundDialogProps) {
  const navigate = useNavigate()
  const { mutate: createInbound, isPending: isLoading } = useCreateInboundTransaction()
  
  const form = useForm<QuickInboundFormData>({
    resolver: zodResolver(quickInboundSchema),
    defaultValues: {
      transaction_category: 'purchase',
      from_location: '',
      to_location: 'Kho tầng 1',
      items: [{ item_id: '', quantity: 1, unit_price: 0 }],
    },
  })
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })
  
  const onSubmit = (data: QuickInboundFormData) => {
    createInbound(data as any, {
      onSuccess: () => {
        form.reset()
        onOpenChange(false)
      },
    })
  }
  
  const totalValue = form.watch('items').reduce(
    (sum, item) => sum + (item.quantity * item.unit_price),
    0
  )
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập kho nhanh</DialogTitle>
          <DialogDescription>
            Ghi nhận nhập kho đơn giản. Để nhập chi tiết hơn với tài liệu và ảnh,{' '}
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => {
                onOpenChange(false)
                navigate('/inventory/inbound/new')
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
                  <FormLabel>Loại nhập *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="purchase" id="purchase" />
                        <label htmlFor="purchase" className="cursor-pointer">
                          Từ đơn đặt hàng
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="return" id="return" />
                        <label htmlFor="return" className="cursor-pointer">
                          Trả về
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
                      <Input {...field} placeholder="VD: Nhà cung cấp ABC" />
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
                      <Input {...field} placeholder="VD: Kho tầng 1" />
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
                  onClick={() => append({ item_id: '', quantity: 1, unit_price: 0 })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm đồ dùng
                </Button>
              </div>
              
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1 grid gap-2 md:grid-cols-3">
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
                                    form.setValue(`items.${index}.unit_price`, item.unit_price)
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
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Đơn giá"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
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
                ))}
              </div>
            </div>
            
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Tổng giá trị:</span>
                <span className="text-2xl font-bold">{formatCurrency(totalValue)}</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Nhập kho'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
