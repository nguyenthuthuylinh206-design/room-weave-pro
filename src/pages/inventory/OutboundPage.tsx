import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, AlertTriangle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ItemSelect } from '@/components/shared/ItemSelect';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCreateOutboundTransaction } from '@/hooks/useInventoryTransactions';
import { useBreakpoint } from '@/lib/breakpoints';
import { MobileOutboundForm } from '@/components/inventory/MobileOutboundForm';

const outboundSchema = z.object({
  transaction_category: z.enum(['room_assign', 'laundry', 'maintenance', 'disposal', 'other']),
  from_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  to_location: z.string().min(1, 'Vui lòng nhập vị trí'),
  items: z.array(z.object({
    item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
    quantity: z.number().min(1, 'Số lượng phải > 0'),
    available_quantity: z.number(),
    notes: z.string().optional()
  })).min(1, 'Phải có ít nhất 1 đồ dùng'),
  recipient_name: z.string().optional(),
  recipient_signature: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  auto_assign_to_room: z.boolean().optional()
}).refine(data => data.items.every(item => item.quantity <= item.available_quantity), {
  message: 'Số lượng xuất không được vượt quá tồn kho',
  path: ['items']
});

type OutboundFormData = z.infer<typeof outboundSchema>;

export function OutboundPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  
  // ALL hooks MUST be declared BEFORE any conditional returns
  const { mutate: createOutbound, isPending: isLoading } = useCreateOutboundTransaction();
  
  const form = useForm<OutboundFormData>({
    resolver: zodResolver(outboundSchema),
    defaultValues: {
      transaction_category: 'room_assign',
      from_location: 'Kho tầng 1',
      to_location: '',
      items: [{
        item_id: '',
        quantity: 1,
        available_quantity: 0,
        notes: ''
      }],
      recipient_name: '',
      recipient_signature: '',
      photos: [],
      notes: '',
      auto_assign_to_room: false
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });
  
  const items = form.watch('items');
  const category = form.watch('transaction_category');
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasStockError = items.some(item => item.quantity > item.available_quantity);
  const lowStockWarnings = items.filter(item => item.available_quantity > 0 && item.available_quantity - item.quantity < 10);

  // Mobile view - AFTER all hooks
  if (isMobile) {
    return <MobileOutboundForm />;
  }
  
  const onSubmit = (data: OutboundFormData) => {
    createOutbound(data as any, {
      onSuccess: () => {
        navigate('/inventory/transactions');
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Xuất kho" description="Ghi nhận xuất kho chi tiết">
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
                            🏠 Xuất cho phòng
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="laundry" id="laundry" />
                          <label htmlFor="laundry" className="cursor-pointer">
                            🧺 Xuất đi giặt
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="maintenance" id="maintenance" />
                          <label htmlFor="maintenance" className="cursor-pointer">
                            🔧 Xuất cho bảo trì
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="disposal" id="disposal" />
                          <label htmlFor="disposal" className="cursor-pointer">
                            🗑️ Thanh lý
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <label htmlFor="other" className="cursor-pointer">
                            ➖ Xuất khác
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
                        <Input {...field} placeholder="VD: Phòng 301, Giặt là" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>
              
              {category === 'room_assign' && (
                <FormField 
                  control={form.control} 
                  name="auto_assign_to_room" 
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Tự động gán vào danh sách đồ dùng phòng
                        </FormLabel>
                        <FormDescription>
                          Đồ dùng sẽ được thêm vào quản lý đồ dùng của phòng
                        </FormDescription>
                      </div>
                    </FormItem>
                  )} 
                />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Đồ dùng xuất kho</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({
                    item_id: '',
                    quantity: 1,
                    available_quantity: 0,
                    notes: ''
                  })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm đồ dùng
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const currentItem = items[index];
                  const hasError = currentItem.quantity > currentItem.available_quantity;
                  const willBeLowStock = currentItem.available_quantity > 0 && currentItem.available_quantity - currentItem.quantity < 10;
                  
                  return (
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
                          <div className="grid gap-4 md:grid-cols-2">
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
                                        field.onChange(value);
                                        if (item) {
                                          form.setValue(`items.${index}.available_quantity`, item.quantity_in_stock);
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
                                  <FormLabel>Số lượng xuất *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="0" 
                                      max={currentItem.available_quantity} 
                                      {...field} 
                                      onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                      className={hasError ? 'border-destructive' : ''} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Tồn kho: <span className="font-bold">{currentItem.available_quantity}</span>
                                    {currentItem.available_quantity > 0 && (
                                      <>
                                        {' '}• Còn lại:{' '}
                                        <span className={willBeLowStock ? 'text-orange-600 font-bold' : ''}>
                                          {currentItem.available_quantity - currentItem.quantity}
                                        </span>
                                      </>
                                    )}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )} 
                            />
                          </div>
                          
                          {hasError && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Số lượng xuất vượt quá tồn kho
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {!hasError && willBeLowStock && (
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                ⚠️ Sau khi xuất, tồn kho sẽ xuống dưới mức an toàn (10)
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <FormField 
                            control={form.control} 
                            name={`items.${index}.notes`} 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ghi chú cho item này</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="VD: Tình trạng, mục đích sử dụng..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh hàng hóa</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField 
                control={form.control} 
                name="photos" 
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload images={field.value || []} onChange={field.onChange} maxImages={10} />
                    </FormControl>
                    <FormDescription>
                      Chụp ảnh hàng hóa khi xuất
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
                      <Textarea {...field} placeholder="Ghi chú về lô xuất kho này..." rows={4} />
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng số loại</p>
                  <p className="text-3xl font-bold">{items.length}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng số lượng</p>
                  <p className="text-3xl font-bold text-blue-600">-{totalQuantity}</p>
                </div>
              </div>
              
              {lowStockWarnings.length > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ Cảnh báo: {lowStockWarnings.length} item(s) sẽ xuống dưới mức tối thiểu sau khi xuất
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading || hasStockError}>
              {isLoading ? 'Đang xử lý...' : 'Xác nhận xuất kho'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
