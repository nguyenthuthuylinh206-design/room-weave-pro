import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ItemSelect } from '@/components/shared/ItemSelect'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { FileUpload } from '@/components/shared/FileUpload'
import { useCreateInboundTransaction } from '@/hooks/useInventoryTransactions'
import { formatCurrency } from '@/lib/utils'

const inboundSchema = z.object({
  transaction_category: z.enum(['purchase', 'return', 'laundry_return', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    unit_price: z.number().min(0, 'Đơn giá phải >= 0'),
    notes: z.string().optional(),
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
  documents: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type InboundFormData = z.infer<typeof inboundSchema>

export function InboundPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const poId = searchParams.get('po_id')
  
  const { mutate: createInbound, isPending: isLoading } = useCreateInboundTransaction()
  
  const form = useForm<InboundFormData>({
    resolver: zodResolver(inboundSchema),
    defaultValues: {
      transaction_category: 'purchase',
      from_location: '',
      to_location: 'Kho tầng 1',
      items: [{ item_id: '', quantity: 1, unit_price: 0, notes: '' }],
      documents: [],
      photos: [],
      notes: '',
    },
  })
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })
  
  const onSubmit = (data: InboundFormData) => {
    createInbound(
      {
        ...data,
        related_type: poId ? 'purchase_order' : undefined,
        related_id: poId || undefined,
      } as any,
      {
        onSuccess: () => {
          navigate('/inventory/transactions')
        },
      }
    )
  }
  
  const items = form.watch('items')
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhập kho"
        description="Ghi nhận nhập kho chi tiết"
      >
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </PageHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            📦 Từ đơn đặt hàng
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="return" id="return" />
                          <label htmlFor="return" className="cursor-pointer">
                            🔙 Trả về từ phòng
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="laundry_return" id="laundry_return" />
                          <label htmlFor="laundry_return" className="cursor-pointer">
                            🧺 Nhận từ giặt là
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <label htmlFor="other" className="cursor-pointer">
                            ➕ Nhập mới khác
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
                        <Input {...field} placeholder="VD: Nhà cung cấp ABC, Phòng 301" />
                      </FormControl>
                      <FormDescription>
                        Nguồn gốc hàng hóa
                      </FormDescription>
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
                      <FormDescription>
                        Vị trí lưu trữ
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Đồ dùng nhập kho</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ item_id: '', quantity: 1, unit_price: 0, notes: '' })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm đồ dùng
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardContent className="pt-6">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.item_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Đồ dùng *</FormLabel>
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
                                <FormLabel>Số lượng *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
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
                                <FormLabel>Đơn giá *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Tổng: {formatCurrency(items[index].quantity * items[index].unit_price)}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`items.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ghi chú cho item này</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="VD: Hàng mới, nguyên seal..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tài liệu & Hình ảnh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="documents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tài liệu đính kèm</FormLabel>
                    <FormControl>
                      <FileUpload
                        files={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Hóa đơn, phiếu giao hàng, chứng từ...
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hình ảnh hàng hóa</FormLabel>
                    <FormControl>
                      <ImageUpload
                        images={field.value || []}
                        onChange={field.onChange}
                        maxImages={10}
                      />
                    </FormControl>
                    <FormDescription>
                      Chụp ảnh hàng hóa khi nhận
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú chung</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ghi chú về lô nhập kho này..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tổng kết</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng số loại</p>
                  <p className="text-3xl font-bold">{items.length}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng số lượng</p>
                  <p className="text-3xl font-bold text-green-600">+{totalQuantity}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng giá trị</p>
                  <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/inventory')}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
